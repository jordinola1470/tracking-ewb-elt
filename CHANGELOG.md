# Changelog

Todos los cambios relevantes del proyecto se registran aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen
[versionado semántico](https://semver.org/lang/es/): `MAYOR.MENOR.PARCHE`.

- **MAYOR:** cambio que rompe lo anterior (por ejemplo, columnas de `public` que usa el tablero).
- **MENOR:** funcionalidad nueva compatible (por ejemplo, agregar la base de un año nuevo).
- **PARCHE:** corrección pequeña (por ejemplo, un mapeo de columna).

## [Sin publicar]

### Agregado (nivel de los retirados desde el helpdesk)
- `cargar` lee los CSV de `data/helpdesk_data/` (`helpdesk_<año>_<grupo>.csv`) y reemplaza `raw.helpdesk_alertas`
  solo con documento, grupo antes, grupo después y fecha (sin nombres, correos ni títulos). Sin archivos, la tabla queda vacía.
- dbt: `stg_helpdesk_alertas` (staging, sin duplicados, nivel tomado del código de grupo) y `fct_helpdesk_retiros`
  (gold, una fila por docente y año con el nivel del curso del último retiro), con pruebas de unicidad y niveles válidos.
- `consolidado_historico`: los retirados sin nivel (`-`) reciben el nivel del curso del que se retiraron; siguen
  contando como retirados. Con los datos actuales: 2025 → 408 de 412 filas, 2026 → 237 de 251.
- Último nivel de formación (gráfico de Histórico y Perfiles): los retirados ya cuentan con el nivel del curso del
  que se retiraron (antes se excluían y quedaban «Sin nivel registrado»: 506 → 279, casi todos activos de 2024 sin nivel en el Excel).

### Cambiado (tablero · detalles finales)
- Avisos: se quita la línea de cantidad de registros.
- Perfil (arriba a la derecha): la píldora abre un menú con el correo y **Cerrar sesión**; se quita el botón
  de salir de la barra lateral.
- Título del tablero en dos líneas con los logos de los aliados (Alcaldía de Barranquilla · British Council) en
  blanco, separados por una línea; más espacio arriba y abajo.
- Fact sheet: portada en dos columnas (título | logos en blanco) y vista tipo visor de PDF (barra con descarga y
  hoja A4 sobre fondo oscuro).
- Barra lateral: gris del hover un poco más oscuro.

### Cambiado (datos estandarizados)
- Lectura del código DANE como texto (antes, leído como número, podía redondearse; ej. 108001000000).
- Nueva lista oficial de IED (`data/referencia_ied/ied_name.csv`, fuera del repositorio) cargada a
  `raw.referencia_ied`. En diamond cada fila toma el **nombre oficial** según su DANE; si el nombre de la fila
  corresponde a otra IED oficial, se corrige también el DANE. `dim_ied` (gold) usa el nombre oficial.
- Macros de estandarización (`macros/estandarizar.sql`) aplicadas en staging: nombres de docentes con
  mayúsculas de título ("María del Carmen Pérez"), correos en minúscula, constancia "Si"/"No", nombres de IED
  en el formato de la lista oficial. En diamond, un solo nombre por docente (el del año más reciente).

### Agregado (tablero)
- Histórico: **IED atendidas** (total de todos los años + barras por año, `tab_totales`) y **Docentes por cargo**
  (último cargo de cada docente, `tab_cargo_docentes`); cuadrícula de 2 x 2.
- Perfiles: filtros de nivel de formación, cargo, IED y permanencia debajo del buscador.
- Página de inicio de sesión con el estilo del tablero, los logos de Google y Microsoft y el cobranding
  Alcaldía de Barranquilla · British Council (`tablero/public/logos/`).
- Histórico: **Nivel actual de los docentes** (toda la población según su último nivel cursado, con % del
  total; `tab_nivel_ultimo`, cálculo propio: "-" no cuenta como nivel cursado). La ficha de Perfiles no cambia.
- Nueva pestaña **Reporte** con el **fact sheet** del programa (las 8 secciones de `docs/FACT_SHEET_ANALITICA.md`,
  2023–2026 y reglas actuales) y botón **Descargar PDF** (impresión del navegador con los estilos del tablero, A4).
  dbt: `int_fs_docente_anio` (una fila por docente y año), `tab_fs_anio`, `tab_fs_distribucion`, `tab_fs_resumen`.
- Indicadores por año: animación sutil al pasar el mouse.
- Texto de permanencia más sencillo.

### Cambiado (experiencia de uso)
- **Enlace con estado:** pestaña, vista, año y filtros de Perfiles quedan en la URL (compartir, recargar, atrás).
  No se guardan el docente elegido ni la búsqueda (pueden tener datos personales).
- **Barra superior:** se quita el botón de buscar. **Avisos** muestra "Actualizado el …" de la base (dbt
  `tab_actualizacion`) y un resumen de lo que muestra el tablero; **Información**, datos básicos.
- **ⓘ en cada gráfico** con lo que mide.

### Cambiado (tablero · indicadores)
- Paleta: gris pizarra `#22333B` (`--marca-negro`, con matiz azul petróleo) en títulos y números principales, opción elegida de la barra
  lateral, píldora EwB, iconos de filtros y botón de descarga; ejes de gráficos en `#56676D`.
- "Con prueba de entrada y salida" se reemplaza por **IED únicas del año** (`tab_kpis_anio.ied_unicas`).
- Cada indicador tiene color (degradados de la paleta institucional).
- En Histórico ya no se muestra el resumen del año (solo en Por año).

### Cambiado (tablero · Por año)
- "Nivel de formación de los docentes" pasa a la tarjeta ancha y "Pruebas presentadas" a la cuadrícula.
- "Pruebas presentadas" ahora es un gráfico de barras con 4 categorías: Entrada, Salida,
  Sin prueba de entrada y Sin prueba de salida (las "sin" van rayadas).
- "Constancia, año por año": ejes X e Y visibles y etiqueta con el valor en cada tramo (el % se mantiene).
- dbt `tab_kpis_anio`: nuevas columnas `con_entrada`, `con_salida`, `sin_entrada`, `sin_salida`.

### Cambiado (diseño del tablero)
- Paleta institucional: principal azul petróleo `#0C343D` + verde `#40984C`, con mezclas; documentada en
  `tablero/README.md`. Fondo de página gris `#D5DCDE` y paneles blancos; sin modo oscuro.
- Bordes de 1 px (variable `--borde`), sombras de efecto 3D y rayado con contraste para lo "sin dato".
- Título en MAYÚSCULAS, Arial Bold, en un contenedor superior aparte (franja oscura en degradado) con
  botones buscar / avisos / información y el perfil del usuario.
- Barra vertical a la izquierda a la altura de la ventana (EwB, Analítica, Perfiles, salir y sello
  "Desarrollado por TeseoDev · Medellín ©"); solo se desplaza la hoja de la derecha.
- Analítica con subcategorías **Histórico** y **Por año**; "Constancia, año por año" en barras verticales
  apiladas (con / sin constancia) y % arriba.
- Perfiles con plantilla: tabla con encabezado de color y filas alternas; ficha con encabezado, secciones
  y datos en casillas. Etiquetas "Último nivel de formación" y "Asistencia".

### Cambiado (dbt)
- `tab_kpis_anio`: nueva columna `sin_constancia` (para la barra apilada).
- `tab_perfiles`: `nivel_formacion_actual` → `ultimo_nivel_formacion` (año más reciente en que participó
  sin retirarse) y `asistencia_promedio` → `asistencia` (de esa misma participación, sin promedio).
- Datos ficticios de prueba: la constancia varía por año para que se vean ambos casos.

### Agregado
- Tablero en `tablero/`: Next.js 16 + Auth.js (Google y Microsoft) para Vercel, con los 17 componentes
  del inventario (`ana_*`, `per_*`) leyendo las tablas `tab_*` con el rol de solo lectura `ewb_tablero`.
  El diseño del mock se trasladó a `src/`; la carpeta del mock se eliminó por no usarse.
- Guía "Cómo editar" en `tablero/README.md` (qué archivo cambiar para cada cosa).
- CI: job *Tablero (lint y build)*.

### Corregido
- Tablero: soporta 100 usuarios simultáneos. Las consultas van una por una por el puerto 6543
  (transaction pooler); el 5432 solo admite 15 conexiones y en la prueba fallaban 85 de 100.
  Prueba de carga: 100 de 100 visitas simultáneas correctas (promedio 2,4 s).
- CD: filas de despliegue separadas por entorno; una aprobación pendiente de prod ya no bloquea staging.
- Tablero: el puerto 6543 de Supabase (transaction pooler) dejaba la página cargando hasta el límite
  de 300 s de Vercel; se usa el 5432 (session pooler). Además, la lectura de datos tiene un límite
  propio de 20 s y muestra "No se pudieron cargar los datos" en vez de cargar sin fin.
- Tablero: `.gitignore` ignoraba `tablero/src/lib` (regla `lib/` de Python).
- Tablero: la página quedaba cargando en Vercel; ahora espera la visita real (`await connection()`)
  antes de leer la sesión, como exige Next.js 16.

### Agregado (dbt)
- Modelos dbt del tablero en `models/tablero/` (esquema `public`, prefijo `tab_`) construidos sobre
  `consolidado_historico`: `tab_kpis_anio`, `tab_pruebas_nivel_anio`, `tab_constancia_cargo_anio`,
  `tab_permanencia`, `tab_perfiles` y `tab_historial` (+ intermedio `int_permanencia_docente`).
  Cada modelo indica los componentes del tablero que alimenta.
- Macros `reglas_tablero.sql`: constancia, retirado, prueba presentada y orden de la escala de
  nivel de formación (`nivel_estandar`), en un solo lugar.
- Pruebas: llaves únicas, relación historial→perfiles y coherencia entre tablas; la prueba de punta
  a punta verifica también las tablas del tablero.

## [0.7.0] - 2026-11-16

### Agregado
- `scripts/cargar_prod.sh`: carga a producción los Excel que cambiaron y transforma, con confirmación
  (`SI`) y usando la imagen de GHCR del último commit de `main`.
- Flujo `mantener_activo.yml`: consulta semanal de solo lectura (viernes 6:00 a. m. Colombia) con
  `ewb_tablero` para que Supabase no pause los proyectos gratuitos.

### Eliminado
- Dependencias sobrantes: `dotenv` (atajo de `python-dotenv`), `pathlib` (incluido en Python) y `numpy`
  como dependencia directa (no se usa en el código; llega a través de `pandas`).

## [0.6.0] - 2026-11-16

### Corregido
- La configuración (Python y perfil de dbt) quita espacios y saltos de línea sobrantes de las
  variables `DB_*`: un secreto de GitHub pegado con un Enter de más rompía la conexión en el CD.

### Agregado
- Prueba unitaria de limpieza de la configuración.
- Despliegue continuo (`.github/workflows/cd.yml`): tras CI en verde sobre `main` publica una imagen por
  commit en GHCR, despliega automáticamente en `entorno_staging` (Excel ficticios) y en `entorno_prod`
  con aprobación, usando la misma imagen; salta `transformar` si `raw` está vacío.
- Despliegue manual / reversa con *Run workflow* (entorno + etiqueta de imagen).
- Etiquetas OCI en la imagen que la vinculan al repositorio.

## [0.5.0] - 2026-11-13

### Agregado
- Entornos `entorno_staging` (datos ficticios) y `entorno_prod` en Supabase, con GitHub Environments
  (6 secretos cada uno; prod requiere aprobación y solo despliega desde `main`).
- `sql/roles_supabase.sql`: roles `ewb_pipeline` (dueño de raw, staging y marts) y `ewb_tablero` (solo
  lectura de `public`, transacciones de solo lectura).
- Macro dbt `permitir_lectura_tablero`: RLS y política de solo lectura para `ewb_tablero` en cada tabla
  de `public` (no hace nada si el rol no existe, como en Docker local y CI).
- Variable `DB_SSLMODE` (`prefer` en local, `require` en Supabase) en la configuración y en dbt.

### Cambiado
- `cargar` solo crea el esquema `raw` si no existe (el rol de mínimo privilegio no puede crear esquemas).

## [0.4.0] - 2026-11-13

### Agregado
- CI con GitHub Actions (`.github/workflows/ci.yml`): lint con ruff, pruebas unitarias, `dbt parse` y
  prueba de punta a punta con la imagen Docker, PostgreSQL 17 temporal y Excel ficticios.
- Generador de Excel ficticios (`tests/fixtures/generar_excel_ficticios.py`) con los encabezados reales.
- Pruebas de integración de punta a punta (`tests/integracion/`), activas solo con `EWB_E2E=1`.
- Pruebas de datos en dbt: unicidad y no nulos en dimensiones, relación hechos-docentes, años aceptados
  y asistencia en rango 0-1 (aviso).
- Marcadores de pytest `integracion` y `e2e`; `ruff` en dependencias de desarrollo.
- Regla `proteger-main` exige las revisiones del CI para fusionar (verificado con una prueba de fuego).

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
