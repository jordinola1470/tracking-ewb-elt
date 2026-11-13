from sqlalchemy import text

def test_db_conn_health(db_conn):
    query_test = text("SELECT 1")
    result = db_conn.execute(query_test).scalar()
    assert result == 1