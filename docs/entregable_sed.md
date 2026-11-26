# Entregable SED (2023-2026)

Base consolidada de las personas formadas en la estrategia entre 2023 y 2026, para entregar a la SED.
Se construye en la capa Diamante (`public`) sobre `consolidado_historico`, en dos versiones.

| Tabla | Grano | Uso |
| :--- | :--- | :--- |
| `public.sed_entregable_ancho` | Una fila por persona | Formato pedido por la SED (columnas en el orden de la especificación) |
| `public.sed_entregable_largo` | Una fila por persona y año | Detalle de cada participación, como el consolidado |

La exportación a Excel todavía no está implementada: las tablas se consultan desde la base de datos.

---

## Versión ancha (`sed_entregable_ancho`)

| # | Columna | Regla |
| :--- | :--- | :--- |
| 1 | `no` | Consecutivo ordenado por apellidos y nombres |
| 2-3 | `dane`, `ied` | Último dato disponible (nombre oficial de la IED) |
| 4-5 | `tipo_documento`, `numero_documento` | Último dato disponible / documento del docente |
| 6-7 | `nombres`, `apellidos` | Ver [Nombres y apellidos](#nombres-y-apellidos) |
| 8 | `sexo` | Último dato disponible (2026 se completa en la base) |
| 9 | `cargo` | Último `cargo_estandar` disponible |
| 10 | `edad` | Última edad disponible (cada base la trae al 31/12 de su año; 2026 se completa en la base) |
| 11 | `total_anios_participando` | Años distintos en que participó |
| 12 | `es_entrada` | Puntaje de la **primera** prueba de entrada registrada |
| 13 | `es_salida` | Puntaje de la **última** prueba de salida registrada |
| 14 | `nivel_mcer_entrada` | Nivel MCER de esa primera prueba de entrada |
| 15 | `nivel_mcer_salida` | Nivel MCER de esa última prueba de salida |
| 16-27 | `nivel_cursado_AAAA`, `estado_finalizacion_AAAA`, `es_salida_AAAA` | Por año, de 2023 a 2026 |
| — | `nombre_aproximado` | Control, no es parte del formato: nombres y apellidos separados por posición |

**Último dato disponible:** el del año más reciente que tiene valor.

**Duplicados de 2026:** si un docente está en dos programas, se conserva la última versión del participante: la
fila de `ewb_two` o `ewb_presencial`, no la de `ewb_plus`. Solo en la versión ancha.

**Una fila por año:** si un docente tiene más de una fila en el año, se usa (en este orden) la que no es de ewb_plus
en 2026, la que no está retirada y la de nivel más alto.

## Versión larga (`sed_entregable_largo`)

Las mismas filas de `consolidado_historico` (incluye las dos filas de los docentes de 2026 en dos programas), con
`anio`, `programa`, identificación del año, `nivel_cursado`, `estado_finalizacion`, `es_entrada`,
`nivel_mcer_entrada`, `es_salida`, `nivel_mcer_salida` y `aprobado_sed`.

---

## Valores

| Valor | Significado |
| :--- | :--- |
| Puntaje | Puntaje de la prueba ES, entero |
| `-` | No hay dato en la base (puntaje, nivel MCER, nivel cursado, constancia). La base 2026 aún está por cerrarse |
| `No aplica` | La persona no participó ese año (solo en la versión ancha) |
| `Aprobado` | Recibió constancia |
| `Sin constancia` | Finalizó sin constancia |
| `Retirado` | No finalizó |

**Nivel MCER:** resultado de la prueba ES (no el nivel del curso), con una sola escritura: `PRE A1`, `A1`, `A2`, `B1`,
`B2`, `C1`. En la versión larga se conservan otros textos de la base (`No ha realizado`, `Invalidado por ES`,
`Abandonado`).

**Retirado según la base de cada año:**

| Año | Regla |
| :--- | :--- |
| 2023 | Columna `ESTADO` = `RETIRADO` |
| 2024 | Columna `2024 EWB` = `Deserción` |
| 2025, 2026 | Grupo «Retirados …» |

Esta regla solo la usa el entregable. El tablero (versión 1) sigue contando como retirados a los del grupo «Retirados …».

**Nivel cursado de los retirados:** 2025 y 2026 se completan con el helpdesk; 2023 ya viene en la base (coincide con
el helpdesk 2023); 2024 queda en `-` porque no hay helpdesk de ese año.

---

## Nombres y apellidos

1. Se toman de la base más reciente que los trae separados: 2023, 2024 y 2026 (`NOMBRES`, `APELLIDOS`) o 2025
   (`NOMBRES`, `PRIMER APELLIDO`, `SEGUNDO APELLIDO`, que se unen en una sola columna de apellidos).
2. Si ninguna base los trae separados (nombre completo en una columna), se separa por posición: las dos
   últimas palabras son los apellidos (3 palabras: 1 nombre y 2 apellidos; 2 palabras: 1 y 1). En esas bases el
   nombre completo empieza por los nombres. Estos casos quedan con `nombre_aproximado = true`.

---

## Columnas de la base 2026 que se completan después

Se leen si existen en la hoja `base`; mientras no existan quedan vacías y la carga no falla:
`EDAD`, `SEXO` (o `GENERO`), `PROGRAMA`, `Recibe Constancia?`, `ES SALIDA 2026 - NIVEL SCORE`,
`ES SALIDA 2026 - NIVEL MCER` y `Aprobado SED`.

Después de actualizar el Excel: `cargar` y `transformar`.
