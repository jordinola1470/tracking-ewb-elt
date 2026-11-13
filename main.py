from src.ingestor import ingestor_pipeline
from src.transformer import dbt_pipeline

def main():
    print("1. Ejecutando Extracción y Carga a Capa Bronze (Raw)...")
    ingestor_pipeline.execute_pipeline()
    
    print("2. Construyendo Modelos de Capa Silver (Staging)...")
    dbt_pipeline.run_model("staging")

    print("3. Construyendo Dimensiones de Capa Gold (Marts)...")
    dbt_pipeline.run_model("marts")

    print("4. Construyendo Tablas de Capa Diamond (Public)...")
    dbt_pipeline.run_model("diamond")

    print("¡Pipeline ejecutado con éxito!")

if __name__ == "__main__":
    main()
