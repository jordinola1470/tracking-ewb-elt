import os
import subprocess
from dotenv import load_dotenv
from src.exceptions import DBTExecutionError

# Cargar las variables de entorno desde el archivo .env al os.environ
# para que los subprocesos de dbt puedan heredarlas.
load_dotenv()

class DBTRunner:
    """
    Clase encargada de orquestar la capa de Transformación (Transform)
    ejecutando comandos de dbt como subprocesos desde Python.
    """
    def __init__(self, project_dir: str = "dbt_project", profiles_dir: str = "dbt_project"):
        self.project_dir = project_dir
        self.profiles_dir = profiles_dir

    def run_model(self, target: str):
        """
        Ejecuta `dbt run` para un target o modelo específico.
        Su firma acepta cualquier string ('staging', 'marts', 'dim_docentes', etc.)
        garantizando total escalabilidad para futuras capas del Medallion Architecture.
        """
        command = [
            "uv", "run", "dbt", "run",
            "--select", target,
            "--project-dir", self.project_dir,
            "--profiles-dir", self.profiles_dir
        ]
        
        try:
            # Ejecución limpia: La salida nativa de dbt viaja directo a la consola
            subprocess.run(
                command,
                check=True,
                text=True,
                capture_output=False 
            )
        except subprocess.CalledProcessError as e:
            raise DBTExecutionError(f"Error crítico compilando o ejecutando modelos dbt para el target '{target}'. Código de salida: {e.returncode}") from e


# Instancia Singleton lista para orquestar desde main.py
dbt_pipeline = DBTRunner()
