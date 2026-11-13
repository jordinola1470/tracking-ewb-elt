import hashlib
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from config.constants import data_config
from src.utils.column_standardizer import ColumnStandardizer
from infrastructure.database import get_connection
from src.exceptions import (
    BaseProjectException,
    DatabaseLoadError,
    PhysicalDataFileNotFoundError,
    SourceKeyNotFoundError,
    TotalesNoCuadranError,
)


class Ingestor:
    """
    Etapa de Extracción y Carga (EL) a la capa Bronze (esquema raw).

    Cada fuente (un año) se carga de forma independiente y solo cuando su Excel cambió:
    se compara la huella SHA-256 del archivo con la de la última carga registrada en
    raw._registro_cargas. Cada carga ocurre en una sola transacción y se deshace si los
    totales de control (filas Excel vs. filas raw) no cuadran.

    Los mensajes de error nunca incluyen filas de datos (solo año, fuente, archivo y conteos).
    """

    REGISTRO = "raw._registro_cargas"

    def __init__(self):
        self.sources = data_config.all_sources

    # ------------------------------------------------------------------ utilidades
    def _extract_year_from_key(self, key_name: str) -> int:
        """
        Extrae el año del nombre lógico definido en sources.yaml
        Ej: 'base_docentes_2023' -> 2023
        """
        parts = key_name.split("_")
        for part in parts:
            if part.isdigit() and len(part) == 4:
                return int(part)

        raise ValueError(f"No se pudo extraer un año válido de la clave '{key_name}'")

    def _key_for_year(self, anio: int) -> str:
        """Devuelve la clave de sources.yaml que corresponde a un año."""
        for key_name in self.sources:
            if self._extract_year_from_key(key_name) == anio:
                return key_name
        raise SourceKeyNotFoundError(f"El año {anio} no tiene una fuente definida en sources.yaml")

    @staticmethod
    def _huella(file_path: Path) -> str:
        """Huella SHA-256 del archivo: cambia si se modifica cualquier celda."""
        sha = hashlib.sha256()
        with open(file_path, "rb") as f:
            for bloque in iter(lambda: f.read(1024 * 1024), b""):
                sha.update(bloque)
        return sha.hexdigest()

    @staticmethod
    def _mensaje_seguro(error: Exception) -> str:
        """
        Primera línea del error de la base de datos, sin parámetros ni DETAIL
        (esas partes pueden contener valores de las filas, es decir, datos personales).
        """
        original = getattr(error, "orig", None) or error
        primera_linea = str(original).strip().splitlines()[0] if str(original).strip() else ""
        return f"{type(original).__name__}: {primera_linea}"

    # ------------------------------------------------------------------ bitácora
    def _asegurar_registro(self, conn) -> None:
        # Solo se crea el esquema si falta: en Supabase ya existe y el rol del pipeline
        # (mínimo privilegio) no tiene permiso para crear esquemas en la base.
        if conn.execute(text("SELECT 1 FROM pg_namespace WHERE nspname = 'raw'")).scalar() is None:
            conn.execute(text("CREATE SCHEMA raw;"))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS {self.REGISTRO} (
                id             BIGSERIAL PRIMARY KEY,
                anio           INTEGER     NOT NULL,
                fuente         TEXT        NOT NULL,
                archivo        TEXT        NOT NULL,
                huella_sha256  CHAR(64)    NOT NULL,
                filas          INTEGER     NOT NULL,
                forzada        BOOLEAN     NOT NULL DEFAULT FALSE,
                cargado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        """))

    def _ultima_huella(self, conn, key_name: str) -> str | None:
        return conn.execute(
            text(f"SELECT huella_sha256 FROM {self.REGISTRO} WHERE fuente = :f ORDER BY id DESC LIMIT 1"),
            {"f": key_name},
        ).scalar()

    @staticmethod
    def _raw_existe(conn, key_name: str) -> bool:
        return conn.execute(text("SELECT to_regclass(:t)"), {"t": f"raw.{key_name}"}).scalar() is not None

    # ------------------------------------------------------------------ carga
    def _leer_y_estandarizar(self, key_name: str, file_path: Path) -> pd.DataFrame:
        df = pd.read_excel(file_path, sheet_name=data_config.get_sheet_name(key_name))
        year = self._extract_year_from_key(key_name)
        return ColumnStandardizer.standardize(df, year)

    def cargar_fuente(self, key_name: str, forzar: bool = False) -> str:
        """
        Carga una fuente a raw solo si su Excel cambió (o si forzar=True).
        Devuelve un texto con el resultado para mostrar al usuario.
        """
        file_path = self.sources[key_name]
        if not file_path.exists():
            raise PhysicalDataFileNotFoundError(f"El archivo físico no existe en: {file_path}")

        anio = self._extract_year_from_key(key_name)
        huella = self._huella(file_path)

        try:
            # 1. ¿Cambió el archivo desde la última carga?
            with get_connection() as conn:
                with conn.begin():
                    self._asegurar_registro(conn)
                    sin_cambios = (
                        self._ultima_huella(conn, key_name) == huella
                        and self._raw_existe(conn, key_name)
                    )
            if sin_cambios and not forzar:
                return f"⏭️  {anio}: sin cambios (huella igual a la última carga)"

            # 2. Leer y estandarizar el Excel
            df = self._leer_y_estandarizar(key_name, file_path)
            filas_excel = len(df)

            # 3. Reemplazar la tabla en una sola transacción (se deshace completa si algo falla).
            #    Se recrea la tabla para aceptar columnas nuevas; CASCADE elimina las vistas de
            #    staging que dependen de ella, y `transformar` las vuelve a construir.
            with get_connection() as conn:
                with conn.begin():
                    conn.execute(text(f'DROP TABLE IF EXISTS raw."{key_name}" CASCADE;'))
                    df.to_sql(name=key_name, con=conn, schema="raw", if_exists="fail", index=False)

                    filas_raw = conn.execute(text(f'SELECT count(*) FROM raw."{key_name}"')).scalar()
                    if filas_raw != filas_excel:
                        raise TotalesNoCuadranError(
                            f"Base {anio}: Excel {filas_excel} filas, raw {filas_raw} filas. "
                            "Se deshizo la carga y se conserva la versión anterior."
                        )

                    conn.execute(
                        text(f"""
                            INSERT INTO {self.REGISTRO} (anio, fuente, archivo, huella_sha256, filas, forzada)
                            VALUES (:anio, :fuente, :archivo, :huella, :filas, :forzada)
                        """),
                        {
                            "anio": anio,
                            "fuente": key_name,
                            "archivo": file_path.name,
                            "huella": huella,
                            "filas": filas_raw,
                            "forzada": bool(forzar and sin_cambios),
                        },
                    )

        except BaseProjectException:
            raise
        except Exception as e:
            raise DatabaseLoadError(
                f"Error durante la carga de la base {anio} ('{key_name}'): {self._mensaje_seguro(e)}"
            ) from e

        motivo = "recarga forzada" if (forzar and sin_cambios) else "archivo nuevo o modificado"
        return f"🔄 {anio}: cargada ({filas_raw} filas, {motivo})"

    def cargar(self, anio: int | None = None, forzar: bool = False) -> list[str]:
        """
        Carga un año (anio) o todos los años de sources.yaml.
        Cada año es independiente: si uno falla, los anteriores ya quedaron cargados.
        """
        keys = [self._key_for_year(anio)] if anio is not None else list(self.sources)
        return [self.cargar_fuente(key_name, forzar=forzar) for key_name in keys]


# Instancia Singleton pre-inicializada lista para usarse como Controlador de Dominio
ingestor_pipeline = Ingestor()
