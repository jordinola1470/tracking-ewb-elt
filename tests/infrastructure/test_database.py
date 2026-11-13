import pytest
from sqlalchemy import text

# Requiere una base de datos encendida: no corre en las pruebas unitarias de CI
pytestmark = pytest.mark.integracion


def test_db_conn_health(db_conn):
    query_test = text("SELECT 1")
    result = db_conn.execute(query_test).scalar()
    assert result == 1