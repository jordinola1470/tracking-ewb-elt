from config.settings import Settings


def test_settings_quita_espacios_y_saltos_de_linea(monkeypatch):
    """
    OBJETIVO: un secreto pegado con un Enter o espacios de más (ej. en GitHub Environments)
    no debe romper la conexión. Valores 100 % ficticios.
    """
    monkeypatch.setenv("DB_HOST", "  servidor.ejemplo.com\n")
    monkeypatch.setenv("DB_PORT", "5432\n")
    monkeypatch.setenv("DB_USER", "usuario_prueba ")
    monkeypatch.setenv("DB_PASS", "clave_ficticia\n")
    monkeypatch.setenv("DB_NAME", "base_prueba\n")
    monkeypatch.setenv("DB_SSLMODE", "require\n")

    s = Settings()

    assert s.postgres_host == "servidor.ejemplo.com"
    assert s.postgres_port == 5432
    assert s.postgres_user == "usuario_prueba"
    assert s.postgres_password == "clave_ficticia"
    assert s.postgres_db == "base_prueba"
    assert s.postgres_sslmode == "require"
    assert "\n" not in s.postgres_dsn
