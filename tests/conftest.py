import pytest
from unittest.mock import patch
from infrastructure.database import get_connection
from config.constants import data_config,DataConfig


# Infrastructure / Settings
@pytest.fixture(scope="function")
def db_conn():
    connection = get_connection()
    yield connection
    connection.close()


# Constants
@pytest.fixture
def real_config():
    ''' Instancia real Singleton para pruebas de la Instancia'''
    return data_config


@pytest.fixture
def mock_config():
    ''' Instancia FALSA de DataConfig con un YAML vacio'''
    with patch.object(DataConfig, '_load_from_yaml',return_value = {}):
        yield DataConfig()

