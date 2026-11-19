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
    # Encabezados del Excel que traen el código DANE (se leen como texto para no perder dígitos)
    COLUMNAS_DANE = ("DANE", "CODIGO_DANE")

    @staticmethod
    def normalizar_dane(valor) -> str | None:
        """
        Código DANE como texto de dígitos, sin redondeo ni notación científica.
        108001000434 / 108001000434.0 / " 108001000434 " -> "108001000434"; vacío -> None.
        """
        if valor is None or (isinstance(valor, float) and pd.isna(valor)):
            return None
        if isinstance(valor, float) and valor.is_integer():
            valor = int(valor)
        texto = str(valor).strip()
        if texto.endswith(".0"):
            texto = texto[:-2]
        texto = texto.replace(" ", "")
        return texto or None

    def _leer_y_estandarizar(self, key_name: str, file_path: Path) -> pd.DataFrame:
        hoja = data_config.get_sheet_name(key_name)
        # El DANE se lee como texto: leído como número, Excel/pandas puede redondearlo
        # (ej. 1,08001E+11 -> 108001000000) y varios colegios terminan con el mismo código.
        encabezados = pd.read_excel(file_path, sheet_name=hoja, nrows=0).columns
        conversores = {c: self.normalizar_dane for c in encabezados if str(c).strip().upper() in self.COLUMNAS_DANE}
        df = pd.read_excel(file_path, sheet_name=hoja, converters=conversores)
        year = self._extract_year_from_key(key_name)
        df = ColumnStandardizer.standardize(df, year)
        if "codigo_dane" in df.columns:
            invalidos = df["codigo_dane"].dropna().map(lambda v: not (str(v).isdigit() and len(str(v)) == 12)).sum()
            if invalidos:
                print(f"   ⚠️  {year}: {invalidos} filas con código DANE que no tiene 12 dígitos (revisar el Excel).")
        return df

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

    # ------------------------------------------------------------------ referencia IED
    # Lista oficial de IED (nombre y código DANE). Vive en data/ (nunca en el repositorio).
    RUTA_REFERENCIA_IED = Path("data/referencia_ied/ied_name.csv")
    TABLA_REFERENCIA_IED = "referencia_ied"

    def leer_referencia_ied(self, ruta: Path | None = None) -> pd.DataFrame:
        """Lee la lista oficial: columnas INSTITUCION y DANE -> colegio_oficial, codigo_dane (texto, sin filas vacías)."""
        ruta = ruta or self.RUTA_REFERENCIA_IED
        df = pd.read_csv(ruta, dtype=str, encoding="utf-8-sig")
        df.columns = [str(c).strip().upper() for c in df.columns]
        df = df[["INSTITUCION", "DANE"]].rename(columns={"INSTITUCION": "colegio_oficial", "DANE": "codigo_dane"})
        df["colegio_oficial"] = df["colegio_oficial"].str.strip().str.replace(r"\s+", " ", regex=True)
        df["codigo_dane"] = df["codigo_dane"].map(self.normalizar_dane)
        return df.dropna().drop_duplicates(subset="codigo_dane").reset_index(drop=True)

    def cargar_referencia_ied(self) -> str:
        """
        Carga (reemplaza) raw.referencia_ied. Si el archivo no existe, deja la tabla creada y vacía
        para que dbt funcione igual (los nombres quedan con el formato estándar, sin el oficial).
        """
        tabla = f"raw.{self.TABLA_REFERENCIA_IED}"
        try:
            with get_connection() as conn:
                with conn.begin():
                    if self.RUTA_REFERENCIA_IED.exists():
                        df = self.leer_referencia_ied()
                        conn.execute(text(f"DROP TABLE IF EXISTS {tabla}"))
                        df.to_sql(name=self.TABLA_REFERENCIA_IED, con=conn, schema="raw", if_exists="fail", index=False)
                        return f"🏫 Referencia IED: {len(df)} instituciones oficiales cargadas"
                    conn.execute(text(f"CREATE TABLE IF NOT EXISTS {tabla} (colegio_oficial text, codigo_dane text)"))
                    return "🏫 Referencia IED: no se encontró el archivo; se usan los nombres con formato estándar"
        except Exception as e:
            raise DatabaseLoadError(f"Error al cargar la referencia de IED: {self._mensaje_seguro(e)}") from e

    # ------------------------------------------------------------------ helpdesk (alertas de movimientos)
    # CSV exportados de la plataforma (helpdesk_<año>_<grupo>.csv). Viven en data/ (nunca en el repositorio).
    # Solo se guardan el documento, el grupo antes/después y la fecha: nombres, correos y títulos se descartan.
    CARPETA_HELPDESK = Path("data/helpdesk_data")
    TABLA_HELPDESK = "helpdesk_alertas"
    COLUMNAS_HELPDESK = {
        "student.documentId": "docente_id",
        "before": "grupo_antes",
        "after": "grupo_despues",
        "creationDate.dateString": "fecha_alerta",
    }

    def leer_helpdesk(self, carpeta: Path | None = None) -> pd.DataFrame:
        """
        Lee todos los CSV de la carpeta: archivo, fila (posición en el archivo; 1 = la más reciente),
        docente_id, grupo_antes, grupo_despues, fecha_alerta (texto AAAA-MM-DD).
        """
        carpeta = carpeta or self.CARPETA_HELPDESK
        partes = []
        for ruta in sorted(carpeta.glob("*.csv")):
            df = pd.read_csv(ruta, dtype=str, keep_default_na=False, encoding="utf-8-sig")
            df.columns = [str(c).replace("\\.", ".").strip() for c in df.columns]
            faltan = [c for c in self.COLUMNAS_HELPDESK if c not in df.columns]
            if faltan:
                raise DatabaseLoadError(f"Helpdesk: al archivo {ruta.name} le faltan columnas {faltan}")
            df = df[list(self.COLUMNAS_HELPDESK)].rename(columns=self.COLUMNAS_HELPDESK)
            df = df.apply(lambda s: s.str.strip())
            df.insert(0, "fila", range(1, len(df) + 1))
            df.insert(0, "archivo", ruta.name)
            partes.append(df)
        columnas = ["archivo", "fila", *self.COLUMNAS_HELPDESK.values()]
        return pd.concat(partes, ignore_index=True) if partes else pd.DataFrame(columns=columnas)

    def cargar_helpdesk(self) -> str:
        """
        Carga (reemplaza) raw.helpdesk_alertas con todos los CSV de data/helpdesk_data.
        Si no hay archivos, deja la tabla creada (vacía si no existía) para que dbt funcione igual.
        """
        tabla = f"raw.{self.TABLA_HELPDESK}"
        try:
            df = self.leer_helpdesk() if self.CARPETA_HELPDESK.exists() else None
            with get_connection() as conn:
                with conn.begin():
                    if df is not None and len(df):
                        conn.execute(text(f"DROP TABLE IF EXISTS {tabla}"))
                        df.to_sql(name=self.TABLA_HELPDESK, con=conn, schema="raw", if_exists="fail", index=False)
                        return f"🛟 Helpdesk: {len(df)} alertas de {df['archivo'].nunique()} archivos cargadas"
                    conn.execute(text(
                        f"CREATE TABLE IF NOT EXISTS {tabla} (archivo text, fila bigint, docente_id text, "
                        "grupo_antes text, grupo_despues text, fecha_alerta text)"
                    ))
                    return "🛟 Helpdesk: no se encontraron archivos; los retirados quedan sin nivel del curso"
        except BaseProjectException:
            raise
        except Exception as e:
            raise DatabaseLoadError(f"Error al cargar las alertas del helpdesk: {self._mensaje_seguro(e)}") from e

    def cargar(self, anio: int | None = None, forzar: bool = False) -> list[str]:
        """
        Carga un año (anio) o todos los años de sources.yaml.
        Cada año es independiente: si uno falla, los anteriores ya quedaron cargados.
        """
        keys = [self._key_for_year(anio)] if anio is not None else list(self.sources)
        return [self.cargar_fuente(key_name, forzar=forzar) for key_name in keys]


# Instancia Singleton pre-inicializada lista para usarse como Controlador de Dominio
ingestor_pipeline = Ingestor()
