# 📚 tracking-ewb-elt: Pipeline ELT de Seguimiento Docente

![Python](https://img.shields.io/badge/Python-3.11%2B-blue?style=flat-square&logo=python)
![dbt](https://img.shields.io/badge/dbt-1.11.4-FF694B?style=flat-square&logo=dbt)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql)
![Pandas](https://img.shields.io/badge/Pandas-2.0.0%2B-150458?style=flat-square&logo=pandas)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)

El proyecto **tracking-ewb-elt** es el núcleo de ingeniería de datos del programa _English without Borders_. Es una **arquitectura ELT** que carga las bases finales de docentes (2023 en adelante), las limpia y las organiza en un modelo dimensional para seguir el perfil de cada docente a lo largo del tiempo. Sus tablas finales alimentan el tablero de seguimiento, publicado en **https://tracking-ewb-elt.vercel.app**.

> 🔒 **Política de datos:** los archivos Excel contienen datos personales y **nunca** se suben a este repositorio (`data/`, `*.xlsx`, `*.csv` y `.env` están excluidos en `.gitignore`; el hook `pre-commit` los bloquea). Las pruebas y la integración continua usan solo datos ficticios.

---

## 🏛 Arquitectura ELT: El Enfoque Medallion

Este repositorio fomenta la **Medallion Architecture**, garantizando niveles granulares de consistencia de la información al segregar los datos de origen de las capas de negocio final:

- 🟤 **Capa Bronze (`raw`):** 
  - **Extract & Load:** Construido íntegramente en Python (Pandas/SQLAlchemy). El script orquestador (`main.py`) lee Excels descentralizados desde el `data/`, inyecta nombres de columnas de manera agnóstica basándose en `config/column_mapping.yaml`, y los vuelca en bruto dentro del esquema `raw` de la base de datos de PostgreSQL para asegurar trazabilidad.

- ⚪️ **Capa Silver (`staging`):**
  - **Transformación de Limpieza:** Ejecutado y delegado formalmente mediante **dbt**. Toma todas las entidades almacenadas en la base Bronze, asegurando consistencia referencial, *casting* estricto a tipos de datos esperados (como `VARCHAR`, `INT`, o `DATE`) y control de valores nulos.
  - *Decisión Arquitectónica (Views vs Tables):* Esta capa se materializa intencionalmente como **Vistas Lógicas (`view`)** dentro de PostgreSQL (en su propio esquema `staging`), no como tablas físicas. Esto optimiza el almacenamiento y evita la duplicidad innecesaria de millones de registros crudos, delegando el peso de I/O a la compilación final en la capa Gold.

- 🟡 **Capa Gold (`marts`) [Completada]:**
  - **Transformación Analítica (OLAP):** También mediante **dbt**. Esta capa construye de forma centralizada el modelo dimensional agrupando el flujo en tablas de Hechos y Dimensiones optimizadas para consultas analíticas. Las Dimensiones actuales consolidadas bajo esquema `marts` y cruce histórico `UNION ALL` son:
    - `dim_docentes` (Registro censal y biográfico unificado)
    - `dim_ied` (Catálogo de instituciones educativas y geolocalización)
    - `dim_curso` (Grupos asignados y modalidades EWB)
    - `dim_perfil` (Perfil laboral del docente por año)
    - `dim_mcer` (Diccionario de niveles MCER de inglés: `PRE_A1` = 0, `A1` = 1 … `C2` = 6)
    - **`fct_docentes`** (Tabla de hechos transaccional del corazón del esquema de Estrella, compilando Scores de entrada/salida, y asistencias porcentuales con cruces foráneos de dimension).
  - 📖 **[Ver Manual de Consultas Analíticas (SQL)](docs/INSTRUCCIONES_ANALITICA.md)**

- 💎 **Capa Diamond (`public`):**
  - Tablas finales listas para consumo (tablero y analítica), materializadas por **dbt** en el esquema `public`:
    - `trazabilidad_historica` (MCER de salida por año, 2023-2026, de cada docente que alcanzó el nivel A2 o uno superior).
    - **`consolidado_historico`** (una sola tabla con el *append* `UNION ALL` de las bases 2023, 2024, 2025 y 2026, construida desde `staging`, sin deduplicar). Aquí se unifica entre años:
      - **Un solo nombre por docente:** el del año más reciente.
      - **Nombre oficial de la IED** según su código DANE (lista oficial `raw.referencia_ied`). Si el nombre de una fila corresponde a otra IED oficial, se corrige también su DANE. Las IED que no están en la lista conservan el nombre tal cual aparece en 2023.
      - **Nivel de los retirados:** los docentes retirados que no tienen nivel (`-`) reciben el nivel del curso del que se retiraron, según las alertas del helpdesk (`marts.fct_helpdesk_retiros`). Siguen contando como retirados porque `grupo_id` no cambia.
  - **Tablas del tablero** (`models/tablero/`, prefijo `tab_`), construidas sobre `consolidado_historico`. El tablero solo filtra y dibuja; todos los cálculos están aquí:

    | Tabla | Grano | Componentes del tablero |
    | :--- | :--- | :--- |
    | `tab_kpis_anio` | Año | `ana_filtro_anio`, `ana_texto_resumen`, `ana_kpi_*` (participaciones, IED únicas, constancia, asistencia), `ana_graf_constancia_anio`, `ana_graf_pruebas_presentadas` |
    | `tab_pruebas_nivel_anio` | Año × nivel de formación | `ana_graf_constancia_nivel`, `ana_graf_nivel_formacion` |
    | `tab_constancia_cargo_anio` | Año × cargo | `ana_graf_constancia_cargo` |
    | `tab_permanencia` | Grupo de permanencia | `ana_graf_permanencia` |
    | `tab_totales` | Una fila | `ana_graf_ied_atendidas` (total de IED) |
    | `tab_cargo_docentes` | Cargo (último de cada docente) | `ana_graf_cargo_docentes` |
    | `tab_nivel_ultimo` | Último nivel cursado | `ana_graf_nivel_ultimo` |
    | `tab_perfiles` | Docente | `per_buscador`, `per_filtros`, `per_tabla_docentes`, `per_ficha_docente` |
    | `tab_historial` | Docente × año | `per_tabla_historial` |
    | `tab_fs_resumen`, `tab_fs_anio`, `tab_fs_distribucion` | Resumen / año / distribuciones | `rep_fact_sheet` (pestaña Reporte, PDF) |
    | `tab_actualizacion` | Una fila | `barra_avisos` ("Actualizado el …") |

    Modelos intermedios: `int_permanencia_docente` (años y continuidad de cada docente) e `int_fs_docente_anio` (una fila por docente y año para el fact sheet; si un docente aparece dos veces en un año, se usa la fila en la que no está retirado).

    **Nivel de formación** = `nivel_estandar` (nivel del grupo asignado cada año). Las reglas de lectura (constancia, retirado, prueba presentada, orden de niveles y de MCER) están en un solo lugar: `macros/reglas_tablero.sql`.

### 📋 Tabla `public.consolidado_historico`

| Grupo | Columnas |
| :--- | :--- |
| Docente | `docente_id`, `tipo_documento` (NULL en 2025), `docente_nombre`, `genero`, `fecha_nacimiento`, `correo_electronico` |
| Contexto | `anio_lectivo`, `nivel_formacion`, `codigo_dane`, `colegio_nombre`, `cargo_rol`, `grupo_id`, `nivel_asignado` |
| Métricas | `asistencia_porcentaje_fix` (decimal 0-1), `score_entrada`, `mcer_entrada`, `score_salida`, `mcer_salida`, `recibe_constancia` |
| Derivadas | `nivel_estandar`, `cargo_estandar` |

**`nivel_estandar`** (derivada de `nivel_asignado`; comparación sin distinguir mayúsculas; los NULL se conservan como NULL):

| Valor de `nivel_asignado` | `nivel_estandar` |
| :--- | :--- |
| Entry - Pre A1 / Entry - Pre-A1 | `PRE_A1` |
| Fundamentals - A1 / Fundamentals 2 - A1.2 | `A1` |
| Progress - A2 / Progress 2 - A2.2 | `A2` |
| Connections A - B1- / Connections B - B1 / Connections 2 - B1.2 / Connections 4 - B1.4 / Evolution/Specialist - B1/B2/C1 | `B1` |
| Evolution/Specialist - B2/C1 / Evolution 2 - B2.2 | `B2` |
| `0`, `"0"` o `"NULL"` | `-` |
| Cualquier otro valor | Se conserva el valor original |

**`cargo_estandar`** (derivada de `cargo_rol`; comparación sin distinguir mayúsculas; los NULL se conservan como NULL):

| Valor de `cargo_rol` | `cargo_estandar` |
| :--- | :--- |
| `-` o `No` | `S/N` |
| Coordinador(a), Coordinador(a) encargado(a), Coordinador, Rector(a), Rector(a) encargado(a), Rector, Rector Institucion Educativa Completa, Directivo docente | `Directivo Docente` |
| Docente, Docente de aula, Docente orientador(a), Docente con funciones de apoyo | `Docente de Aula` |
| Psicologa | `Otro` |
| Docente de primaria | `Docente de Primaria` |
| Docente de contenido | `Docente de Contenido` |
| Cualquier otro valor | Se conserva el valor original |

> **Limpieza y estandarización en staging:** las columnas de texto de `stg_docentes_*` se normalizan con `trim()`, y las macros de [`macros/estandarizar.sql`](dbt_project/macros/estandarizar.sql) dejan un solo formato, de modo que gold y diamond reciben datos limpios:
> - **Nombres de docentes:** mayúsculas de título y partículas en minúscula ("María del Carmen Pérez").
> - **Correos:** en minúscula.
> - **Constancia:** "Si" / "No".
> - **Nombres de IED:** con el formato de la lista oficial ("INSTITUCION EDUCATIVA DISTRITAL …").

> **Código DANE y lista oficial de IED:** el DANE se lee del Excel **como texto**, para que no se redondee (por ejemplo, a `108001000000`). La lista oficial (`data/referencia_ied/ied_name.csv`, columnas `INSTITUCION` y `DANE`) **no se sube al repositorio**. `cargar` la lleva a `raw.referencia_ied`; si el archivo no existe, crea la tabla vacía y dbt usa los nombres estandarizados.

> **Alertas del helpdesk (nivel de los retirados):** los CSV exportados de la plataforma van en `data/helpdesk_data/` con el nombre `helpdesk_<año>_<grupo>.csv` (por ejemplo, `helpdesk_2026_docentes.csv`) y **no se suben al repositorio**. `cargar` lee todos los CSV de la carpeta y reemplaza `raw.helpdesk_alertas` guardando solo el documento, el grupo antes, el grupo después y la fecha (descarta nombres, correos y títulos). `stg_helpdesk_alertas` quita duplicados y saca el nivel del código de grupo; `fct_helpdesk_retiros` (gold) deja, por docente y año, el nivel del curso del último retiro. Para actualizar con versiones nuevas: reemplaza los CSV y corre `cargar` y `transformar`. Sin archivos, la tabla queda vacía y los retirados conservan `-`.

> **Base 2026:** se lee la hoja `base` (concatenación de las hojas del Excel). No trae `genero`, `fecha_nacimiento`, `ubicacion_geo`, `jornada_laboral`, `grado_dicta`, `recibe_constancia` ni score/MCER de salida: esas columnas existen en el consolidado con valor NULL para 2026. `docente_nombre` se arma con `nombres` + `apellidos`, `tipo_documento` se reduce al código (`CC`, `CE`) y las columnas de entrada, que vienen con contenido mezclado, se separan por contenido (valor numérico → `score_entrada`, valor con forma de nivel → `mcer_entrada`). `dim_docentes` y `dim_ied` toman el último valor no nulo de cada campo para que el 2026 no borre datos de años anteriores.

> **Nota sobre asistencia 2024:** el Excel de 2024 trae el porcentaje como texto con "%" (ej. `100.00%`). `stg_docentes_2024` lo convierte a decimal (`1.0000`) para quedar en la misma escala 0-1 que 2023 y 2025.

---

## 🏗 Esquema Dimensional y Mapeo Agnóstico

El pilar técnico del pipeline de extracción dictamina cómo una misma columna con diferentes nombres (inconsistencias históricas entre los excel 2023, 2024 y 2025) se consolida en una **etiqueta canónica**. A continuación, un mapa de estandarizado en la clase experta **ColumnStandardizer**:

| Dimensión | Etiqueta Estándar (Destino) | Año 2023 | Año 2024 | Año 2025 |
| :--- | :--- | :--- | :--- | :--- |
| **DOCENTE** | `docente_nombre` | PARTICIPANTE | PARTICIPANTE | PARTICIPANTE / NOMBRES |
| | `docente_id` | ID | ID | ID |
| | `tipo_documento` | TIPO ID | TIPO ID | _(No definido)_ |
| | `genero` | GENERO | GENERO | GENERO |
| | `fecha_nacimiento` | FECHA DE NACIMIENTO | FECHA DE NACIMIENTO | FECHA DE NACIMIENTO |
| | `correo_electronico`| CORREO ELECTRONICO | CORREO ELECTRONICO | CORREO ELECTRONICO |
| | `telefono_celular` | CELULAR | CELULAR | CELULAR |
| **IED** | `colegio_nombre` | IED | IED | IED |
| | `codigo_dane` | DANE | DANE | DANE |
| | `ubicacion_geo` | _(No definido)_ | CLUSTER | MUNICIPIO DE RESIDENCIA |
| **PERFIL** | `nivel_formacion` | NIVEL DE FORMACIÓN | NIVEL DE FORMACIÓN | NIVEL DE FORMACIÓN |
| | `cargo_rol` | ROL QUE DESEMPEÑA | ROL QUE DESEMPEÑA | CARGO / CARGO.1 |
| | `tipo_nombramiento`| TIPO DE NOMBRAMIENTO| TIPO DE NOMBRAMIENTO| TIPO DE NOMBRAMIENTO EN LA IN...|
| | `jornada_laboral` | JORNADA | JORNADA | JORNADA EDUCATIVA... |
| | `grado_dicta` | CURSO-NIVEL | NIVEL DICTA | NIVEL EDUCATIVO QUE ORIENTA |
| **CURSO** | `grupo_id` | GRUPO EWB | GRUPO | GRUPO |
| | `nivel_asignado` | CURSO-NIVEL | NIVEL | NIVEL |

---

## 🛠 Topología del Repositorio

El diseño de directorios respeta altamente el concepto Separation of Concerns (SoC).

```text
tracking-ewb-elt/
├── data/                       # [Landing Zone] Excel locales, referencia_ied/ied_name.csv y helpdesk_data/*.csv. NO se versiona.
├── config/                     # [Contexto de Ejecución]
│   ├── sources.yaml            # Archivos a procesar y hoja a leer por fuente (sección opcional `sheets`).
│   ├── column_mapping.yaml     # Mapeos agnósticos leídos por Python para EL.
│   ├── constants.py            # Singleton inyector de rutas de archivo.
│   └── settings.py             # Clase Pydantic validadora del .env
├── infrastructure/             # [Network]
│   └── database.py             # Conector de PostgreSQL y gestor de Session Factory.
├── src/                        # [Capa EL]
│   ├── ingestor.py             # Lee fuentes -> estandariza -> vuelca a raw (+ lista oficial de IED).
│   ├── transformer.py          # Clase que interconecta y spawnea DBT dentro de Python.
│   ├── exceptions.py           # Centro de trazabilidad con Errores custom y controlados.
│   └── utils/
│       └── column_standardizer.py # Modulo de limpieza Regex de etiquetas estipuladas.
├── dbt_project/                # [Capa T]
│   ├── dbt_project.yml         # Config de proyecto dbt, macros y perfiles.
│   ├── profiles.yml            # Enlace abstracto a credenciales de Base de datos.
│   ├── macros/                 # estandarizar.sql, reglas_tablero.sql, permitir_lectura_tablero.sql
│   └── models/
│       ├── staging/            # Staging schema (Silver Layer).
│       ├── marts/              # Marts schema (Gold Layer).
│       ├── diamond/            # Public schema (trazabilidad_historica, consolidado_historico).
│       └── tablero/            # Public schema (tablas tab_* que lee el tablero).
├── tablero/                    # [Tablero] App Next.js publicada en Vercel (ver tablero/README.md).
├── scripts/cargar_prod.sh      # Carga de Excel a producción desde el Mac (con confirmación).
├── sql/roles_supabase.sql      # Roles de mínimo privilegio en Supabase.
├── .github/workflows/          # CI, CD y latido diario de Supabase.
├── tests/                      # Pruebas (pytest), generador de Excel ficticios y notebook de normalización.
├── docs/                       # Manual de consultas, fact sheet y documentación del modelo.
├── .env.example                # Plantilla de variables de entorno con marcadores.
└── main.py                     # [Entrypoint] `cargar` (E-L) y `transformar` (T).
```

---

## 🚀 Instalación y Ejecución

La instalación de un repositorio limpio y moderno, empaquetado y resuelto bajo `uv` garantiza un ecosistema `virtualenv` rápido e idéntico para desarrollo.

1. **Clona el repositorio y configura `.env`** a partir de la plantilla (el `.env` nunca se sube):
   ```bash
   cp .env.example .env       # luego reemplaza TU_USUARIO y TU_CONTRASEÑA
   uv sync                    # instala dependencias del pipeline + herramientas de desarrollo
   uv run pre-commit install  # activa el revisor que bloquea Excel, CSV y .env antes de cada commit
   ```

2. **Coloca los Excel en `data/`** con los nombres definidos en `config/sources.yaml`, y la lista oficial de IED en `data/referencia_ied/ied_name.csv`. Ambos se obtienen por canal interno, no desde el repositorio.

3. **Ejecuta el pipeline en dos órdenes separadas:**

   ```bash
   uv run python main.py cargar                      # carga a raw solo los años cuyo Excel cambió
   uv run python main.py cargar --anio 2026          # revisa y carga solo ese año
   uv run python main.py cargar --anio 2026 --forzar # recarga aunque el archivo no haya cambiado
   uv run python main.py transformar                 # dbt build: staging -> marts -> public (solo desde raw)
   ```

   - **`cargar`** calcula la huella SHA-256 de cada Excel y la compara con la última carga registrada en `raw._registro_cargas`. Si cambió, reemplaza la tabla `raw.base_docentes_AAAA` en una sola transacción y verifica que las filas del Excel coincidan con las de raw; si no cuadran, deshace la carga. Correrlo varias veces seguidas da el mismo resultado.
   - **`cargar`** también recarga la lista oficial de IED (`raw.referencia_ied`) y las alertas del helpdesk (`raw.helpdesk_alertas`) en cada ejecución.
   - **`transformar`** no necesita los Excel: reconstruye todo desde `raw`.
   - **Errores:** los del proyecto se muestran como un mensaje corto (sin datos personales) y el programa termina con código 1.

### 🐳 Ejecutar con Docker (forma recomendada)

Requiere Docker Desktop. La base de datos corre como **servicio** (PostgreSQL 17, igual que producción) con sus datos en el volumen `pgdata`; el pipeline corre como **trabajo** que ejecuta una orden y termina.

```bash
docker compose up -d db                        # enciende la base (puerto 5433 del Mac)
docker compose run --rm pipeline cargar        # carga los Excel de data/ (montada en solo lectura)
docker compose run --rm pipeline transformar   # dbt build: staging -> marts -> public
docker compose down                            # apaga todo; los datos quedan en el volumen
```

- La imagen **no contiene** Excel, `.env` ni herramientas de desarrollo, y corre con un usuario sin privilegios.
- Las credenciales se toman del `.env` local al ejecutar; dentro de Docker la base se llama `db` (puerto 5432).
- Para conectarte desde el Mac (pgAdmin, DBeaver): host `localhost`, puerto `5433`, con el usuario y la base de tu `.env`.

---

## 🧩 Patrones de Ingeniería Aplicados

- **Open/Closed Principle (OCP):** El `ColumnStandardizer` es agnóstico al diseño específico de los años. Si viene `Base 2026.xlsx` simplemente se modifican los yaml (`source` y `column_mapping`), se añade el fuente y no debe compilarse ninguna refactorización algorítmica.
- **Dependency Inversion Principle (DIP):** El proyecto invierte dependencias mediante constructores abstractos; `dbt` nunca compila ni asocia password en plano ya que confía netamente en las dependencias Pydantic enviadas al entorno.
- **Fail-Fast (Excepciones explícitas):** La ausencia de archivos, hojas, años de mapeo y caídas de subsistemas (DBT subprocess crash) no fallan en silencio; arrojan instancias explícitas documentadas en `src/exceptions.py`.

---

## ☁️ Entornos en Supabase

El mismo código corre en tres entornos; solo cambian las variables `DB_*`:

| Entorno | Dónde | Datos | Credenciales |
| :--- | :--- | :--- | :--- |
| dev | Docker en el Mac (`docker compose`) | Reales (respaldo local) | `.env` |
| `entorno_staging` | Supabase `ewb-entorno-staging` | **Ficticios** | `.env.entorno_staging` · GitHub Environment `entorno_staging` |
| `entorno_prod` | Supabase `ewb-entorno-prod` | Reales | `.env.entorno_prod` · GitHub Environment `entorno_prod` (requiere aprobación) |

> No confundir: `entorno_staging` es un **entorno** completo (con raw, staging, marts y public); `staging` es el **esquema** de la capa plata.

**Seguridad en Supabase**
- Data API desactivada: las tablas no se publican en internet. RLS automático en `public`.
- Pipeline: conexión por *Session pooler* (IPv4, puerto 5432) con `DB_SSLMODE=require`.
- Tablero: *Transaction pooler* (puerto 6543), con las consultas una por una; soporta 100 usuarios simultáneos.
- Roles de mínimo privilegio creados con [`sql/roles_supabase.sql`](sql/roles_supabase.sql) (las contraseñas se fijan con `\password` en `psql`, nunca en archivos):
  - `ewb_pipeline`: dueño de `raw`, `staging` y `marts`; construye `public`.
  - `ewb_tablero`: solo lectura de `public` (política RLS creada por la macro `permitir_lectura_tablero` en cada `transformar`).

```bash
# Ejecutar contra un entorno desde el Mac (en staging, solo con Excel ficticios)
docker run --rm --env-file .env.entorno_staging -v <carpeta_excel>:/app/data:ro tracking-ewb-elt:local cargar
docker run --rm --env-file .env.entorno_staging tracking-ewb-elt:local transformar
```

## 🚀 Despliegue (CD)

El flujo [CD](.github/workflows/cd.yml) se activa cuando **CI termina en verde sobre `main`**:

1. Publica **una** imagen en GHCR: `ghcr.io/jordinola1470/tracking-ewb-elt:<commit de 7 caracteres>`.
2. **`entorno_staging`** (automático): `cargar` con Excel **ficticios** + `transformar`.
3. **`entorno_prod`** (espera aprobación en GitHub): `transformar` con **la misma imagen**. Si `raw` está vacío, lo salta con un aviso.

**Cambios de datos vs. cambios de código**
- **Datos** (Excel corregidos o nuevos): no pasan por CD. Desde el Mac: `cargar` y luego `transformar` contra `entorno_prod`.
- **Código** (YAML, SQL de dbt, Python, Dockerfile): rama → PR → CI → CD (staging → prod con aprobación).

**Reversa (volver a una versión anterior):** *Actions → CD → Run workflow*, elige el entorno y la etiqueta de una imagen anterior. El robot ejecuta `transformar` con esa imagen; `raw` no se modifica.

## 📊 Tablero

Aplicación **Next.js** en [`tablero/`](tablero/README.md), publicada en **Vercel**: **https://tracking-ewb-elt.vercel.app**.
Lee las tablas `tab_*` de `public` con el rol de solo lectura `ewb_tablero` y **no hace cálculos**: solo filtra y dibuja.
El CI revisa en cada PR que compile (job *Tablero (lint y build)*).

| Pestaña | Qué muestra |
| :--- | :--- |
| **Analítica · Histórico** | Constancia año a año, permanencia, IED atendidas, docentes por cargo y nivel actual de toda la población |
| **Analítica · Por año** | Indicadores del año (participaciones, IED únicas, constancia, asistencia), nivel de formación, constancia por nivel y cargo, pruebas presentadas |
| **Perfiles** | Buscador y filtros (nivel, cargo, IED, permanencia), lista de docentes y ficha con su historial |
| **Reporte** | Fact sheet del programa (8 secciones, 2023–2026) con descarga en PDF |

- **Inicio de sesión:** Google (Gmail) y Microsoft (Outlook) con Auth.js. La app de Google solo pide nombre, correo y foto, así que **puede entrar cualquier cuenta de Google** que tenga el enlace (la lista de usuarios de prueba no restringe). Microsoft aún no está configurado.
- **Avisos** (campana): "Actualizado el …", la fecha del último recálculo en la base (`tab_actualizacion`).
- **Enlace con estado:** la pestaña, la vista, el año y los filtros quedan en la URL. Nunca se guardan el docente elegido ni la búsqueda.
- Diseño, paleta y guía "qué archivo editar" en [`tablero/README.md`](tablero/README.md).

## 🛠️ Operación

**Actualizar datos en producción** (Excel corregidos o nuevos en `data/`):

```bash
scripts/cargar_prod.sh                      # carga solo los años cuyo Excel cambió y transforma
scripts/cargar_prod.sh --anio 2026          # solo ese año
scripts/cargar_prod.sh --anio 2026 --forzar # recarga aunque no haya cambiado
```

El script pide escribir `SI` para confirmar y usa la imagen de GHCR del último commit de `main`
(el mismo código que ya pasó CI y staging). Requiere Docker encendido y `.env.entorno_prod`.
Monta la carpeta `data/` completa, así que también actualiza la lista oficial de IED.
Si cambia la forma de leer los Excel (por ejemplo, el DANE como texto), usa `--forzar` para releerlos todos.

**Mantener Supabase activo:** el flujo [Mantener Supabase activo](.github/workflows/mantener_activo.yml)
corre **dos veces al día, todos los días (6:17 a. m. y 6:17 p. m., Colombia)** y hace una consulta mínima de solo
lectura con `ewb_tablero` en staging y prod; reintenta hasta 3 veces si falla la red. El plan gratuito pausa los
proyectos con poca actividad en 7 días y, según Supabase, bastan «unas pocas peticiones diarias» (una semanal no alcanzaba).
Usa los secretos de repositorio `TABLERO_STAGING_USER/PASS` y `TABLERO_PROD_USER/PASS`.
En repositorios públicos GitHub desactiva los flujos programados tras 60 días sin actividad en el
repositorio: si llega el aviso, se reactiva en *Actions → Mantener Supabase activo → Enable workflow*.

**Alertas:** GitHub envía un correo cuando falla cualquier flujo (CI, CD o el latido diario).

## 🧪 Pruebas y CI

Cada Pull Request y cada cambio en `main` ejecuta el flujo [CI](.github/workflows/ci.yml) en GitHub Actions, **solo con datos ficticios**:

| Revisión | Qué comprueba |
| :--- | :--- |
| `ruff` | Errores evidentes en el código (imports o variables sin usar, nombres no definidos) |
| Pruebas unitarias | Cada pieza por separado, sin base de datos (`pytest -m "not integracion"`) |
| `dbt parse` | Que los modelos SQL estén bien escritos |
| Punta a punta | Imagen Docker + PostgreSQL 17 temporal + Excel ficticios: `cargar` dos veces (idempotencia), `transformar` con pruebas de datos dbt y verificación de totales |

Los Excel ficticios se generan con `tests/fixtures/generar_excel_ficticios.py` (mismos encabezados que los reales, docentes inventados). Las pruebas de datos dbt (`_marts.yml`, `_diamond.yml`, `tests/`) reportan solo cantidades, nunca valores.

```bash
uv run ruff check .                  # lint
uv run pytest -m "not integracion"   # pruebas unitarias
uv run pytest                        # + integración (requiere la base encendida)
```

## 📌 Pendientes

- **Rotar las contraseñas** de las bases y de los roles (`ewb_pipeline`, `ewb_tablero`, usuarios de Supabase), una por usuario y por proyecto, y actualizar los secretos de GitHub y las variables de Vercel.
- **Restringir el acceso al tablero** a una lista de correos o dominios (variable en Vercel), si se decide.
- **Configurar el inicio de sesión con Microsoft (Outlook).**

## 🔀 Cómo contribuir

`main` está protegida: los cambios entran **solo por Pull Request** desde ramas cortas.

1. Crea una rama desde `main` actualizada: `feat/…` (nuevo), `fix/…` (corrección), `docs/…` (documentación) o `chore/…` (mantenimiento).
2. Haz commits pequeños; el hook `pre-commit` bloquea Excel, CSV y `.env`.
3. Sube la rama y abre un Pull Request; completa la plantilla.
4. Fusiona cuando las verificaciones estén en verde y borra la rama.

Las versiones siguen **versionado semántico** (`vMAYOR.MENOR.PARCHE`) y se registran en el [CHANGELOG](CHANGELOG.md).