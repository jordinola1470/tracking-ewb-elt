from sqlalchemy import create_engine
from config.settings import settings


# Conexion activa a la base de Postgres Local

engine = create_engine(settings.postgres_dsn)

def get_connection():
    '''
    Funcion que devuelve la conexion directa a la base de datos
    '''
    return engine.connect()