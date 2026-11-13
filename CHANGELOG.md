# Changelog

Todos los cambios relevantes del proyecto se registran aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen
[versionado semántico](https://semver.org/lang/es/): `MAYOR.MENOR.PARCHE`.

- **MAYOR:** cambio que rompe lo anterior (por ejemplo, columnas de `public` que usa el tablero).
- **MENOR:** funcionalidad nueva compatible (por ejemplo, agregar la base de un año nuevo).
- **PARCHE:** corrección pequeña (por ejemplo, un mapeo de columna).

## [Sin publicar]

### Agregado
- CI con GitHub Actions (`.github/workflows/ci.yml`): lint con ruff, pruebas unitarias, `dbt parse` y
  prueba de punta a punta con la imagen Docker, PostgreSQL 17 temporal y Excel ficticios.
- Generador de Excel ficticios (`tests/fixtures/generar_excel_ficticios.py`) con los encabezados reales.
- Pruebas de integración de punta a punta (`tests/integracion/`), activas solo con `EWB_E2E=1`.
- Pruebas de datos en dbt: unicidad y no nulos en dimensiones, relación hechos-docentes, años aceptados
  y asistencia en rango 0-1 (aviso).
- Marcadores de pytest `integracion` y `e2e`; `ruff` en dependencias de desarrollo.

### Corregido
- Dos pruebas unitarias desactualizadas respecto al mapeo real (2023 usa `nivel_asignado` y `rt_remoto`;
  el año sin mapeo de prueba pasa a 2099).
- Dos imports sin usar detectados por ruff.

## [0.3.0] - 2026-11-13

### Agregado
- Órdenes separadas en `main.py`: `cargar [--anio] [--forzar]` y `transformar`.
- Detección de cambios por huella SHA-256: `cargar` solo recarga los años cuyo Excel cambió.
- Totales de control (filas Excel = filas raw) con reversión automática si no cuadran.
- Bitácora de cargas `raw._registro_cargas` (año, archivo, huella, filas, fecha).
- Docker: `Dockerfile` en dos etapas (sin dependencias de desarrollo, usuario sin privilegios),
  `.dockerignore` y `docker-compose.yml` con PostgreSQL 17, volumen `pgdata` y el pipeline como trabajo.
- Hook `pre-commit` que bloquea Excel, CSV y `.env` aunque se fuerce `git add -f`.
- Flujo de Git: plantilla de Pull Request, este CHANGELOG y guía de contribución en el README.

### Cambiado
- La transformación usa `dbt build` en una sola llamada, con rutas absolutas y el dbt del entorno.
- `pytest` y `pre-commit` pasan al grupo de dependencias `dev`.
- Los errores del proyecto se muestran como mensaje corto, sin datos personales, con código de salida 1.
- La carga recrea la tabla raw del año, por lo que acepta columnas nuevas.

## [0.2.0] - 2026-11-13

### Agregado
- Repositorio nuevo con historial limpio, sin archivos de datos.
- `.gitignore` que bloquea Excel, CSV, `.env` y respaldos; plantilla `.env.example` con marcadores.
- `sources.yaml`: sección opcional `sheets` para indicar la hoja de Excel por fuente (2026 lee `base`).
- `dim_mcer`: nivel `PRE_A1` (id 0); `fct_docentes` normaliza sus variantes (`Pre A1`, `PRE-A1`).
- `trazabilidad_historica`: columna `mcer_salida_2026`.

### Cambiado
- `main.py` muestra el mensaje de éxito al terminar todas las capas.
- `trazabilidad_historica` documenta el criterio real: docentes con A2 o superior.

### Eliminado
- Agente de IA (LangChain, Groq, Ollama, FAISS), API y app del tablero (FastAPI, Streamlit) y sus dependencias.
  El tablero se reconstruirá en una fase posterior sobre las tablas de `public`.
