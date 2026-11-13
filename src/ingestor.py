import pandas as pd
from sqlalchemy import text
from config.constants import data_config
from src.utils.column_standardizer import ColumnStandardizer
from infrastructure.database import get_connection
from src.exceptions import DatabaseLoadError


class Ingestor:
    """
    Clase orquestadora para la etapa de Extracción (Extract) y Limpieza Ligera.
    Lee los archivos Excel configurados en sources.yaml y los prepara para carga.
    """
    
    def __init__(self):
        self.sources = data_config.all_sources

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

    def read_and_standardize(self) -> dict[str, pd.DataFrame]:
        """
        Itera sobre todas las fuentes, lee los Excels e invoca al Standardizer.
        Retorna un diccionario {nombre_logico: DataFrame_estandarizado}.
        """
        processed_dataframes = {}

        for key_name, file_path in self.sources.items():
            # 1. Leer archivo (hoja definida en sources.yaml o la primera por defecto)
            df = pd.read_excel(file_path, sheet_name=data_config.get_sheet_name(key_name))
            
            # 2. Extraer año
            year = self._extract_year_from_key(key_name)
            
            # 3. Estandarizar
            df_standardized = ColumnStandardizer.standardize(df, year)
            
            processed_dataframes[key_name] = df_standardized
            
        return processed_dataframes


    def load_to_postgres(self, processed_dataframes: dict[str, pd.DataFrame]):
        """
        Toma los DataFrames estandarizados y los inserta en la base de datos PostgreSQL
        dentro del esquema 'raw' (Capa Bronze del Medallion Architecture). El nombre de la tabla responde al 'key_name' del sources.yaml.
        """    
        try:
            with get_connection() as conn:
                # 1. Aseguramos que el esquema raw exista (si no lo crea dbt o el DBA)
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS raw;"))
                conn.commit()
                
                for table_name, df in processed_dataframes.items():
                    # 2. Verificar si la tabla existe para truncarla (preserva la estructura física y las vistas DBT)
                    table_exists = conn.execute(
                        text("SELECT to_regclass(:val)"),
                        {"val": f"raw.{table_name}"}
                    ).scalar()
                    
                    if table_exists:
                        # Vaciamos la tabla transaccionalmente
                        conn.execute(text(f"TRUNCATE TABLE raw.{table_name} CASCADE;"))
                    
                    # 3. Insertamos los nuevos registros (append)
                    df.to_sql(
                        name=table_name,
                        con=conn,
                        schema="raw",
                        if_exists="append", # Cambiado de 'replace' a 'append' seguro post-truncate
                        index=False
                    )
                
                # Confirmar toda la transacción (imprescindible en SQLAlchemy 2.0)
                conn.commit()
                    
        except Exception as e:
            raise DatabaseLoadError(f"Error crítico durante la carga a BD de la tabla '{table_name}': {str(e)}") from e


    def execute_pipeline(self):
        """
        Ejecuta el flujo completo de Extracción (Lectura + Limpieza Ligera) y Carga (PostgreSQL).
        """
        processed_dfs = self.read_and_standardize()
        self.load_to_postgres(processed_dfs)


# Instancia Singleton pre-inicializada lista para usarse como Controlador de Dominio
ingestor_pipeline = Ingestor()

