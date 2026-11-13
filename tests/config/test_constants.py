import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path
from src.exceptions import (ConfigFileNotFoundError, SourceKeyNotFoundError, PhysicalDataFileNotFoundError)
from config.constants import DataConfig 

# ==============================================================================
# TESTS DE INICIALIZACIÓN (MÉTODO _load_from_yaml)
# Estos tests validan que la clase sepa leer el archivo YAML al nacer.
# ==============================================================================

def test_load_from_yaml_exito():
    """
    OBJETIVO: Validar el 'Camino Feliz'.
    """
    mock_data = {"sources": {"ventas": "ventas.csv"}}
    
    # 1. Parcheamos el atributo de clase completo
    with patch("config.constants.DataConfig.SOURCES_YAML_PATH") as mock_path:
        # Configuramos el mock para que simule existir
        mock_path.exists.return_value = True
        
        # 2. Simulamos la apertura y carga del YAML
        with patch("builtins.open", MagicMock()):
            with patch("yaml.safe_load", return_value=mock_data):
                config = DataConfig()
                assert config._sources_map == {"ventas": "ventas.csv"}

def test_load_from_yaml_no_existe_archivo():
    """
    OBJETIVO: Validar la excepción ConfigFileNotFoundError cuando no hay archivo.
    """
    with patch("config.constants.DataConfig.SOURCES_YAML_PATH") as mock_path:
        # Forzamos que .exists() devuelva False
        mock_path.exists.return_value = False
        
        with pytest.raises(ConfigFileNotFoundError, match="No se encontró el catálogo"):
            DataConfig()

def test_load_from_yaml_contenido_invalido():
    """
    OBJETIVO: Validar la validación de contenido vacío o sin la clave 'sources'.
    """
    with patch("config.constants.DataConfig.SOURCES_YAML_PATH") as mock_path:
        mock_path.exists.return_value = True
        
        with patch("builtins.open", MagicMock()):
            # Simulamos un YAML que devuelve un dict vacío {}
            with patch("yaml.safe_load", return_value={}): 
                with pytest.raises(ConfigFileNotFoundError, match="es inválido"):
                    DataConfig()


# ==============================================================================
# TESTS DE LÓGICA DE RUTAS (MÉTODO get_file_path)
# Aquí probamos cómo la clase busca y construye las rutas de los archivos.
# ==============================================================================

def test_get_file_path_exito():
    """
    OBJETIVO: Validar la construcción de rutas dinámicas.
    FUNCIONAMIENTO: Parchamos el cargador para inyectar una base de datos ficticia.
    Validamos que el resultado sea un objeto Path y que la ruta sea la correcta.
    """
    # Usamos un parche en el método para evitar leer el disco en el __init__
    with patch.object(DataConfig, '_load_from_yaml', return_value={"db": "base.csv"}):
        config = DataConfig()
        # Simulamos que el archivo físico FINAL (el .csv) sí existe
        with patch("pathlib.Path.exists", return_value=True):
            resultado = config.get_file_path("db")
            assert isinstance(resultado, Path)
            assert str(resultado).endswith("base.csv")

def test_get_file_path_clave_no_existe():
    """
    OBJETIVO: Validar SourceKeyNotFoundError.
    FUNCIONAMIENTO: Pedimos una clave que no está en nuestro diccionario ficticio.
    Debe disparar el error de 'fuente no definida'.
    """
    with patch.object(DataConfig, '_load_from_yaml', return_value={"db": "base.csv"}):
        config = DataConfig()
        with pytest.raises(SourceKeyNotFoundError, match="no está definida"):
            config.get_file_path("clave_que_no_existe")

def test_get_file_path_archivo_fisico_no_existe():
    """
    OBJETIVO: Validar PhysicalDataFileNotFoundError.
    FUNCIONAMIENTO: La clave existe en el YAML, pero el archivo NO está en la carpeta.
    Validamos que verifique la existencia física antes de devolver la ruta.
    """
    with patch.object(DataConfig, '_load_from_yaml', return_value={"db": "base.csv"}):
        config = DataConfig()
        # Forzamos que el archivo físico NO exista
        with patch("pathlib.Path.exists", return_value=False):
            with pytest.raises(PhysicalDataFileNotFoundError, match="El archivo físico no existe"):
                config.get_file_path("db")


# ==============================================================================
# TESTS DE PROPIEDADES (all_sources)
# ==============================================================================

def test_all_sources_diccionario_completo():
    """
    OBJETIVO: Validar la "vitrina" de archivos.
    FUNCIONAMIENTO: Verifica que la propiedad transforme todos los nombres 
    del mapa en rutas Path completas de forma masiva.
    """
    mapa_falso = {"a": "file1.csv", "b": "file2.csv"}
    with patch.object(DataConfig, '_load_from_yaml', return_value=mapa_falso):
        config = DataConfig()
        resultado = config.all_sources
        
        # Debe tener 2 elementos y ambos deben ser objetos Path
        assert len(resultado) == 2
        assert all(isinstance(p, Path) for p in resultado.values())
