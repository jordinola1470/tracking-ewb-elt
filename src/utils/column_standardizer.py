import pandas as pd
import re
import yaml
from pathlib import Path
from src.exceptions import MappingFileNotFoundError, InvalidMappingFileError, MissingMappingYearError


class ColumnStandardizer:
    """
    Clase que encapsula la lógica de 'Limpieza Ligera' (Light Cleaning)
    requerida previa a la carga en Base de Datos (Fase EL de ELT).
    
    Normaliza los nombres de las columnas basado en el archivo config/column_mapping.yaml.
    Hace que las columnas de muchos años tengan una misma etiqueta en funcion a sus datos y relacion al modelo.

    Esto permite ser agnósticos a los años futuros sin modificar el código Python.
    No realiza transformaciones de negocio, delegando eso a dbt.

    """

    MAPPING_FILE_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "column_mapping.yaml"

    @classmethod
    def _load_mappings(cls) -> dict:
        """
        Carga y cachea (por la propia ejecución) el YAML completo de mapeo.
        """
        if not hasattr(cls, "_mappings_cache"):
            if not cls.MAPPING_FILE_PATH.exists():
                raise MappingFileNotFoundError(f"No se encontro el archivo de mapeos en: {cls.MAPPING_FILE_PATH}")
                
            with open(cls.MAPPING_FILE_PATH, "r", encoding="utf-8") as f:
                content = yaml.safe_load(f) or {}
                mappings = content.get("mappings")
                
                # VALIDACIÓN: Si es None (no existe la clave) o está vacío (dict vacío)
                if not mappings:
                    raise InvalidMappingFileError(
                        f"El archivo {cls.MAPPING_FILE_PATH.name} es inválido: "
                        "No contiene la sección 'mappings' o el diccionario está vacío."
                    )
                
                cls._mappings_cache = mappings
                
        return cls._mappings_cache



    @classmethod
    def _clean_string(cls, text: str) -> str:
        """
        Normalizador genérico: minúsculas, elimina tildes, reemplaza espacios
        y caracteres no alfanuméricos por guiones bajos.
        """
        if pd.isna(text):
            return "columna_nula"
            
        text = str(text).strip().lower()
        text = text.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        # Deja solo letras y números, lo demás a guión bajo
        text = re.sub(r'[^a-z0-9]', '_', text)
        # Consolida múltiples guiones
        text = re.sub(r'_+', '_', text).strip('_')
        return text


    @classmethod
    def standardize(cls, df: pd.DataFrame, source_year: int) -> pd.DataFrame:
        """
        Recibe un DataFrame recién leído de Excel.
        1. Limpia espacios en los nombres originales.
        2. Aplica el mapeo manual correspondiente al año desde el YAML.
        3. Aplica normalización snake_case al resto de columnas no mapeadas (para compatibilidad SQL).
        """
        mappings = cls._load_mappings()
        
        # Paso 1: Mapear el año con el diccionario correspondiente. 
        if source_year not in mappings:
            raise MissingMappingYearError(f"El año de origen '{source_year}' no está definido en {cls.MAPPING_FILE_PATH.name}")
            
        target_map = mappings[source_year]

        # Paso 2: Quitar espacios en blanco invisibles al inicio/fin (común en Excels)
        df.rename(columns=lambda x: str(x).strip(), inplace=True)
        
        # Paso 3: Renombrar usando el mapa duro (Hard-Replacement)
        df.rename(columns=target_map, inplace=True)

        # Paso 4: Limpieza dinámica en snake_case para columnas residuales/extras
        # que no cayeron en el mapeo (y para asegurar SQL standard)
        dynamic_map = {}
        for col in df.columns:
            # Si el mapeo del diccionario no lo abordó, lo limpiamos genéricamente
            dynamic_map[col] = cls._clean_string(col)
            
        df.rename(columns=dynamic_map, inplace=True)

        return df

