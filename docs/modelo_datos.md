# Modelo de datos

Detalle de las capas, las tablas y las reglas de transformación del pipeline. Para la visión general, ver el
[README](../README.md).

---

## Capas (arquitectura Medallion)

### 🟤 Bronze (`raw`)
- Carga en Python (Pandas y SQLAlchemy) desde `main.py cargar`.
- Lee los Excel de `data/`, normaliza los nombres de columna según `config/column_mapping.yaml` y los guarda
  sin transformar en `raw.base_docentes_AAAA`, para conservar la trazabilidad.
- También carga dos fuentes de referencia (ver más abajo): `raw.referencia_ied` y `raw.helpdesk_alertas`.
- Cada carga registra la huella SHA-256 del archivo en `raw._registro_cargas`. Solo se recarga un año si su
  Excel cambió, en una sola transacción, y se deshace si las filas del Excel y de raw no coinciden.

### ⚪️ Silver (`staging`)
- Modelos dbt `stg_docentes_AAAA` y `stg_helpdesk_alertas`.
- Tipos de datos, valores nulos y limpieza de texto.
- Se materializa como **vistas** (`view`): no duplica los datos de raw y deja el cálculo a las capas siguientes.

### 🟡 Gold (`marts`)
Modelo dimensional (esquema estrella):

| Tabla | Contenido |
| :--- | :--- |
| `dim_docentes` | Datos de cada docente (último valor no nulo de cada campo) |
| `dim_ied` | Instituciones educativas, con el nombre oficial cuando existe |
| `dim_curso` | Grupos asignados |
| `dim_perfil` | Perfil laboral del docente por año |
| `dim_mcer` | Niveles MCER de inglés (`PRE_A1` = 0, `A1` = 1 … `C2` = 6) |
| `fct_docentes` | Tabla de hechos: puntajes de entrada y salida, asistencia y llaves a las dimensiones |
| `fct_helpdesk_retiros` | Nivel del curso del que se retiró cada docente, por año (helpdesk) |

Más detalle en [fct_docentes_architecture.md](fct_docentes_architecture.md) y [fact_tables.md](fact_tables.md).
Consultas de ejemplo en [INSTRUCCIONES_ANALITICA.md](INSTRUCCIONES_ANALITICA.md).

### 💎 Diamond (`public`)
Tablas finales para el tablero y la analítica:

- **`consolidado_historico`:** una fila por registro de cada año (2023 a 2026, `UNION ALL` desde staging, sin
  deduplicar). Unifica entre años:
  - **Un solo nombre por docente:** el del año más reciente.
  - **Nombre oficial de la IED** según su código DANE (lista `raw.referencia_ied`). Si el nombre de una fila
    corresponde a otra IED oficial, también se corrige su DANE. Las IED fuera de la lista conservan el nombre
    con que aparecen en 2023.
  - **Nivel de los retirados:** los retirados sin nivel (`-`) reciben el nivel del curso del que se retiraron
    (`fct_helpdesk_retiros`). Siguen contando como retirados porque `grupo_id` no cambia.
  - **Eximidos:** los grupos que indican el nivel (por ejemplo, «Eximido C1») toman ese nivel en lugar de `-`.
- **`trazabilidad_historica`:** MCER de salida por año de cada docente que alcanzó A2 o un nivel superior.

---

## Tabla `public.consolidado_historico`

| Grupo | Columnas |
| :--- | :--- |
| Docente | `docente_id`, `tipo_documento` (NULL en 2025), `docente_nombre`, `genero`, `fecha_nacimiento`, `correo_electronico` |
| Contexto | `anio_lectivo`, `nivel_formacion`, `codigo_dane`, `colegio_nombre`, `cargo_rol`, `grupo_id`, `nivel_asignado` |
| Métricas | `asistencia_porcentaje_fix` (decimal 0-1), `score_entrada`, `mcer_entrada`, `score_salida`, `mcer_salida`, `recibe_constancia` |
| Derivadas | `nivel_estandar`, `cargo_estandar` |

### `nivel_estandar`
Se deriva de `nivel_asignado`, sin distinguir mayúsculas. Los NULL se conservan.

| Condición | `nivel_estandar` |
| :--- | :--- |
| Retirado sin nivel, con alerta de retiro en el helpdesk | Nivel del curso del que se retiró |
| Grupo de eximidos con nivel en el nombre (`Eximido C1`) | Nivel del nombre del grupo (`C1`) |
| Entry - Pre A1 / Entry - Pre-A1 | `PRE_A1` |
| Fundamentals - A1 / Fundamentals 2 - A1.2 | `A1` |
| Progress - A2 / Progress 2 - A2.2 | `A2` |
| Connections A - B1- / Connections B - B1 / Connections 2 - B1.2 / Connections 4 - B1.4 / Evolution/Specialist - B1/B2/C1 | `B1` |
| Evolution/Specialist - B2/C1 / Evolution 2 - B2.2 | `B2` |
| `0` o `NULL` (texto) | `-` |
| Cualquier otro valor | Se conserva el valor original |

### `cargo_estandar`
Se deriva de `cargo_rol`, sin distinguir mayúsculas. Los NULL se conservan.

| Valor de `cargo_rol` | `cargo_estandar` |
| :--- | :--- |
| `-` o `No` | `S/N` |
| Coordinador(a), Coordinador(a) encargado(a), Coordinador, Rector(a), Rector(a) encargado(a), Rector, Rector Institucion Educativa Completa, Directivo docente | `Directivo Docente` |
| Docente, Docente de aula, Docente orientador(a), Docente con funciones de apoyo | `Docente de Aula` |
| Psicologa | `Otro` |
| Docente de primaria | `Docente de Primaria` |
| Docente de contenido | `Docente de Contenido` |
| Cualquier otro valor | Se conserva el valor original |

---

## Estandarización en staging

Las columnas de texto de `stg_docentes_*` se normalizan con `trim()` y con las macros de
[`macros/estandarizar.sql`](../dbt_project/macros/estandarizar.sql):

- **Nombres de docentes:** mayúscula inicial y partículas en minúscula («María del Carmen Pérez»).
- **Correos:** en minúscula.
- **Constancia:** «Si» / «No».
- **Nombres de IED:** con el formato de la lista oficial («INSTITUCION EDUCATIVA DISTRITAL …»).

Particularidades por año:

- **2024 · asistencia:** viene como texto con «%» (`100.00%`); se convierte a decimal (`1.0000`), en la misma
  escala 0-1 que los demás años.
- **2026:** se lee la hoja `base`. No trae `genero`, `fecha_nacimiento`, `ubicacion_geo`, `jornada_laboral`,
  `grado_dicta`, `recibe_constancia` ni score/MCER de salida (quedan en NULL). `docente_nombre` se arma con
  `nombres` + `apellidos`, `tipo_documento` se reduce al código (`CC`, `CE`) y las columnas de entrada se separan
  por contenido (número → `score_entrada`; nivel → `mcer_entrada`). `dim_docentes` y `dim_ied` toman el último
  valor no nulo para que 2026 no borre datos de años anteriores.

---

## Fuentes de referencia

Ninguna de estas fuentes se sube al repositorio: viven en `data/` y se obtienen por canal interno.

### Lista oficial de IED
- Archivo: `data/referencia_ied/ied_name.csv` (columnas `INSTITUCION` y `DANE`).
- `cargar` la lleva a `raw.referencia_ied` en cada ejecución. Sin archivo, crea la tabla vacía y dbt usa los
  nombres estandarizados.
- El código DANE se lee siempre **como texto**, para que no se redondee (por ejemplo, a `108001000000`).

### Alertas del helpdesk (nivel de los retirados)
- Archivos: `data/helpdesk_data/helpdesk_<año>_<grupo>.csv` (por ejemplo, `helpdesk_2026_docentes.csv`).
- `cargar` lee todos los CSV de la carpeta y reemplaza `raw.helpdesk_alertas`, guardando solo documento, grupo
  antes, grupo después y fecha (descarta nombres, correos y títulos).
- `stg_helpdesk_alertas` quita duplicados y saca el nivel del código de grupo; `fct_helpdesk_retiros` deja, por
  docente y año, el nivel del curso del último retiro.
- Para actualizar: reemplaza los CSV y corre `cargar` y `transformar`. Sin archivos, la tabla queda vacía y los
  retirados conservan `-`.

---

## Mapeo de columnas entre años

`ColumnStandardizer` (ver [columns_standardizer.md](columns_standardizer.md)) lleva cada encabezado del Excel a
una etiqueta canónica, según `config/column_mapping.yaml`:

| Dimensión | Etiqueta estándar | 2023 | 2024 | 2025 |
| :--- | :--- | :--- | :--- | :--- |
| **DOCENTE** | `docente_nombre` | PARTICIPANTE | PARTICIPANTE | PARTICIPANTE / NOMBRES |
| | `docente_id` | ID | ID | ID |
| | `tipo_documento` | TIPO ID | TIPO ID | _(no definido)_ |
| | `genero` | GENERO | GENERO | GENERO |
| | `fecha_nacimiento` | FECHA DE NACIMIENTO | FECHA DE NACIMIENTO | FECHA DE NACIMIENTO |
| | `correo_electronico` | CORREO ELECTRONICO | CORREO ELECTRONICO | CORREO ELECTRONICO |
| | `telefono_celular` | CELULAR | CELULAR | CELULAR |
| **IED** | `colegio_nombre` | IED | IED | IED |
| | `codigo_dane` | DANE | DANE | DANE |
| | `ubicacion_geo` | _(no definido)_ | CLUSTER | MUNICIPIO DE RESIDENCIA |
| **PERFIL** | `nivel_formacion` | NIVEL DE FORMACIÓN | NIVEL DE FORMACIÓN | NIVEL DE FORMACIÓN |
| | `cargo_rol` | ROL QUE DESEMPEÑA | ROL QUE DESEMPEÑA | CARGO / CARGO.1 |
| | `tipo_nombramiento` | TIPO DE NOMBRAMIENTO | TIPO DE NOMBRAMIENTO | TIPO DE NOMBRAMIENTO EN LA IN... |
| | `jornada_laboral` | JORNADA | JORNADA | JORNADA EDUCATIVA... |
| | `grado_dicta` | CURSO-NIVEL | NIVEL DICTA | NIVEL EDUCATIVO QUE ORIENTA |
| **CURSO** | `grupo_id` | GRUPO EWB | GRUPO | GRUPO |
| | `nivel_asignado` | CURSO-NIVEL | NIVEL | NIVEL |

Para un año nuevo basta con agregar la fuente en `config/sources.yaml` y su mapeo en `column_mapping.yaml`.

---

## Tablas del tablero (`models/tablero/`)

Construidas sobre `consolidado_historico`. El tablero solo filtra y dibuja; todos los cálculos están aquí.

| Tabla | Grano | Componentes del tablero |
| :--- | :--- | :--- |
| `tab_kpis_anio` | Año | `ana_filtro_anio`, `ana_texto_resumen`, `ana_kpi_*`, `ana_graf_constancia_anio`, `ana_graf_pruebas_presentadas` |
| `tab_pruebas_nivel_anio` | Año × nivel | `ana_graf_constancia_nivel`, `ana_graf_nivel_formacion` |
| `tab_constancia_cargo_anio` | Año × cargo | `ana_graf_constancia_cargo` |
| `tab_permanencia` | Grupo de permanencia | `ana_graf_permanencia` |
| `tab_totales` | Una fila | `ana_graf_ied_atendidas` |
| `tab_cargo_docentes` | Cargo (último de cada docente) | `ana_graf_cargo_docentes` |
| `tab_nivel_ultimo` | Último nivel cursado | `ana_graf_nivel_ultimo` |
| `tab_perfiles` | Docente | `per_buscador`, `per_filtros`, `per_tabla_docentes`, `per_ficha_docente` |
| `tab_historial` | Docente × año | `per_tabla_historial` |
| `tab_fs_resumen`, `tab_fs_anio`, `tab_fs_distribucion` | Resumen / año / distribuciones | `rep_fact_sheet` (pestaña Reporte, PDF) |
| `tab_actualizacion` | Una fila | `barra_avisos` («Actualizado el …») |

- **Intermedios:** `int_permanencia_docente` (años y continuidad de cada docente) e `int_fs_docente_anio` (una fila
  por docente y año; si un docente aparece dos veces en el año, se prefiere la fila no retirada).
- **Nivel de formación** en el tablero = `nivel_estandar`. El último nivel de cada docente es el del año más
  reciente; los retirados cuentan con el nivel del curso del que se retiraron.
- Las reglas de lectura (constancia, retirado, prueba presentada, orden de niveles y de MCER) están en un solo
  lugar: [`macros/reglas_tablero.sql`](../dbt_project/macros/reglas_tablero.sql).
- El contenido del fact sheet está descrito en [FACT_SHEET_ANALITICA.md](FACT_SHEET_ANALITICA.md).
