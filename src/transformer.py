import shutil
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

from src.exceptions import DBTExecutionError

# Rutas absolutas: funcionan igual sin importar desde qué carpeta se ejecute (Mac, GitHub o Docker)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DBT_DIR = PROJECT_ROOT / "dbt_project"

# En local carga el .env para que dbt (subproceso) herede las variables DB_*.
# En GitHub/Docker no hay .env: las variables llegan del entorno y no se sobrescriben.
load_dotenv(PROJECT_ROOT / ".env", override=False)


class DBTRunner:
    """
    Capa de Transformación (T): ejecuta dbt como subproceso desde Python.
    Solo lee del esquema raw; no necesita los Excel.
    """

    def __init__(self, project_dir: Path = DBT_DIR, profiles_dir: Path = DBT_DIR):
        self.project_dir = Path(project_dir)
        self.profiles_dir = Path(profiles_dir)

    @staticmethod
    def _dbt_executable() -> str:
        """Usa el dbt del mismo entorno de Python que ejecuta el pipeline; si no, el del PATH."""
        local = Path(sys.executable).parent / "dbt"
        if local.exists():
            return str(local)
        encontrado = shutil.which("dbt")
        if encontrado:
            return encontrado
        raise DBTExecutionError("No se encontró el ejecutable de dbt en el entorno.")

    def build(self, select: str | None = None) -> None:
        """
        Ejecuta `dbt build`: construye los modelos en orden (staging -> marts -> diamond)
        y luego corre las pruebas de datos definidas en dbt.
        """
        command = [
            self._dbt_executable(), "build",
            "--project-dir", str(self.project_dir),
            "--profiles-dir", str(self.profiles_dir),
        ]
        if select:
            command += ["--select", select]

        try:
            # La salida nativa de dbt viaja directo a la consola
            subprocess.run(command, check=True, text=True, capture_output=False)
        except subprocess.CalledProcessError as e:
            raise DBTExecutionError(
                f"dbt build terminó con error (código {e.returncode}). Revisa arriba qué modelo o prueba falló."
            ) from e


# Instancia Singleton lista para orquestar desde main.py
dbt_pipeline = DBTRunner()
