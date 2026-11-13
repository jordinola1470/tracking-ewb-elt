import yaml

from src.exceptions import (ConfigFileNotFoundError, SourceKeyNotFoundError,PhysicalDataFileNotFoundError)
from config.settings import settings
from typing import Dict
from pathlib import Path


class DataConfig:
    # --- Rutas Dinamicas y Agnosticas a las bases ---
    DATA_DIR = settings.DATA_DIR
    # Ruta del archivo YAML con la lista de nombre y equivalencia de los archivos
    SOURCES_YAML_PATH = settings.SOURCES_YAML_PATH

    def __init__(self):
        self._sources_map = self._load_from_yaml() # -> Dict

    def _load_from_yaml(self):
        '''
        Leer el archiovo source.yaml y retornar en un dict los archivos cargados
        '''
        if not self.SOURCES_YAML_PATH.exists():
            raise ConfigFileNotFoundError(f"No se encontró el catálogo en: {self.SOURCES_YAML_PATH}")
        
        with open(self.SOURCES_YAML_PATH,"r", encoding="utf-8" ) as f:
            content = yaml.safe_load(f) or {}            
            sources = content.get("sources")

            # VALIDACIÓN: Si es None (no existe la clave) o está vacío (dict vacío)
            if not sources:
                raise ConfigFileNotFoundError(
                    f"El archivo {self.SOURCES_YAML_PATH.name} es inválido: "
                    "No contiene la sección 'sources' o arroja un diccionario está vacía."
            )

            # Sección opcional: hoja de Excel a leer por fuente
            self._sheets_map = content.get("sheets") or {}

            return sources

            
    def get_file_path(self,key_name:str) -> Path:
        '''
        Devuelve la ruta completa de donde se ubica una base, pero tomando en cuenta su nombre logico registrado en el sources.yaml
        '''
        filename = self._sources_map.get(key_name)
        if not filename:
            raise SourceKeyNotFoundError(f"La fuente '{key_name}' no está definida en sources.yaml")

        full_path = self.DATA_DIR / filename

        if not full_path.exists():
            raise PhysicalDataFileNotFoundError(f"El archivo físico no existe en: {full_path}")

        return full_path

    def get_sheet_name(self, key_name: str):
        '''
        Devuelve la hoja de Excel a leer para una fuente según la sección 'sheets' del sources.yaml.
        Si la fuente no tiene hoja definida devuelve 0 (primera hoja, comportamiento por defecto de pandas).
        '''
        return getattr(self, "_sheets_map", {}).get(key_name, 0)

    @property
    def all_sources(self) -> Dict[str,Path]:
        '''
        Aca se devuelve todas las rutas de los archivos descritos en yaml, no es un metodo u orden es una vitrina que me permite ver hay todo lo que hay en data en formato de Dict, esto se usa en el ingestor
        '''    
        return {
            key: self.DATA_DIR / filename 
            for key, filename in self._sources_map.items()
        }


data_config = DataConfig()





