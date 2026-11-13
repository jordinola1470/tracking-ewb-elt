from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):

    # Configuracion de carga de variables de entorno
    model_config = SettingsConfigDict(
        env_file = ".env",
        env_file_encoding = "utf-8",
        case_sensitive = False,
        extra = "ignore"
    )

    # --- 1. Configuracipn de la Fuente (Archivos / API) ---
    # --- 1.1 Rutas Agnósticas (Pathlib) ---
    _PROJECT_ROOT = Path(__file__).resolve().parent.parent #Variable Privada
    _CONFIG_DIR   = Path(__file__).resolve().parent # Regla: carpeta config/

    DATA_DIR: Path          = Field(default=_PROJECT_ROOT / "data")
    SOURCES_YAML_PATH: Path = Field(default=_CONFIG_DIR / "sources.yaml")

    # --- 2. Configuracion Base de Datos (PostgresSQL) ---
    postgres_host: str      = Field(...,alias='DB_HOST', description="Host de PostgreSQL")
    postgres_port: int      = Field(...,alias='DB_PORT', description="Puerto de PostgreSQL")
    postgres_user: str      = Field(...,alias='DB_USER', description="Usuario de PostgreSQL")
    postgres_password: str  = Field(...,alias='DB_PASS', description="Contraseña de PostgreSQL")
    postgres_db:   str      = Field(...,alias='DB_NAME', description="Nombre de la base de datos")
    # Cifrado de la conexión: 'prefer' en local/Docker; 'require' en Supabase (exige SSL)
    postgres_sslmode: str   = Field(default="prefer", alias='DB_SSLMODE', description="Modo SSL de PostgreSQL")



    #Esta funcion es la que devuelve el URL a la Base de Datos, el decorador permite entenderla como variable
    
    @property
    def postgres_dsn(self) -> str: 
        """
        Única conexión necesaria para ELT (Pandas, DBT, Scripts).
        Usa el driver estándar (psycopg2).
        """
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            f"?sslmode={self.postgres_sslmode}"
        )
    
# Implementación de Singleton mediante caché de nivel de función.
# Se utiliza get_settings como punto de entrada único a la configuración,
# permitiendo el desacoplamiento y facilitando su reemplazo en entornos de testing.

@lru_cache
def get_settings() -> Settings:
    """
    Carga y valida las variables de entorno definidas en el esquema Settings.
    El decorador lru_cache garantiza que la lectura del archivo .env y la validación
    de Pydantic ocurran solo en la primera llamada, optimizando el I/O.
    """
    return Settings()


# Instancia global pre-inicializada para acceso directo en módulos que no requieren DI.
settings = get_settings()