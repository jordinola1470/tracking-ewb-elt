# Contexto de cambios — Bases EwB 2023, 2024, 2025 y 2026

Registro de los cambios aplicados en la limpieza y armonización de las bases de English without Borders (EwB), como contexto para la actualización del código del ELT. Período de trabajo: 20 al 26 de noviembre de 2026.

## 1. Archivos y fuentes

| Año | Archivo | Hoja de datos | Columna de documento | Registros |
|---|---|---|---|---|
| 2023 | `090525 Base 2023.xlsx` | `Base de datos` | `ID` | 1.072 |
| 2024 | `090525 Base 2024.xlsx` | `Consolidado por Docente` | `ID` | 1.731 |
| 2025 | `110226 Base 2025.xlsx` | `base` | `ID` | 930 |
| 2026 | `261126 Base 2026.xlsx` | `base` | `DOCENTE_ID` | 622 |

Archivos de apoyo:

- `4.5.2.1 Correcion SED/SED_BD EWB 2023-2025.xlsx`: hoja de validación de la SED (pestañas `2023`, `2024`, `2025`). Es la fuente de verdad para cédula, nombre, fecha de nacimiento, cargo, área y "¿sigue en servicio?".
- `4.5.2.1 Correcion SED/Cambios_Base_2023.xlsx`, `Cambios_Base_2024.xlsx`, `Cambios_Base_2025.xlsx`: detalle registro por registro de cada corrección propuesta (una pestaña por tipo de cambio).
- `4.5.2.2 Helpdesk/helpdesk_2023_docentes.xlsx` (hoja `nivel_inicial`): nivel en el que se matricularon los docentes de 2023 antes de un eventual retiro.

**Cambios de estructura de los archivos**

- El archivo 2026 cambió de nombre: `131026 Base 2026.xlsx` → `261126 Base 2026.xlsx`.
- 2023 quedó con una sola hoja (`Base de datos`); se eliminaron `Tabla dinámica 1` y `Resumen candidatos inscritos`.
- 2024 ya no tiene las hojas `Dashboard Análisis` ni `Consolidado por IED`.
- 2026 tiene una hoja nueva, `revision`, con el registro de las 6 cédulas corregidas en la hoja `base`.

## 2. Reglas generales aplicadas

1. **Fuente de verdad demográfica:** la hoja de la SED (2023-2025). Para 2026 se usaron los datos de 2023-2025 ya validados con la SED.
2. **Cédula:** número entero (no texto) en las cuatro bases. En `Cambios_Base_2025.xlsx` las columnas `Cédula base` y `Cédula SED` se convirtieron a número; en `Cambios_Base_2023.xlsx` y `Cambios_Base_2024.xlsx` siguen como texto.
3. **Coherencia entre años:** una misma cédula tiene exactamente el mismo nombre en los cuatro años, y la misma fecha de nacimiento, género y tipo de documento en los años que registran esos campos. Validado sobre las 1.071 personas que aparecen en más de un año (66 están en los cuatro).
4. **Nombres:** se usó el nombre completo de la SED (en mayúsculas). Los nombres corregidos quedaron en mayúsculas; los demás conservan el formato que tenían.
5. **Fechas de nacimiento:** fecha real (no texto ni serial). Las celdas que aparecían como `00:00:00` se dejaron vacías. Quedan 6 fechas vacías (3 en 2023 y 3 en 2024), de personas sin fecha en la SED.
6. **Edad (`EDAD`):** valor fijo, edad cumplida al 31 de diciembre del año de la base (31/12/2023, 31/12/2024, 31/12/2025). No es fórmula. 2026 no tiene edad ni fecha de nacimiento.
7. **Edad actual:** no se creó una columna `edad_hoy` en ninguna base.
8. **Valores estandarizados:** "¿Sigue en servicio?" usa `Sí` / `No` (sin espacios finales).
9. **Nombres de columnas:** no se renombraron columnas existentes. Solo se agregaron o eliminaron las indicadas abajo.

## 3. Base 2023

| Cambio | Registros |
|---|---|
| Cédulas corregidas según SED | 14 |
| Fechas de nacimiento completadas o corregidas | 256 + 5 de las cédulas corregidas |
| Fechas `00:00:00` dejadas vacías | 3 |
| Nombres reemplazados por el nombre SED | 246 + 5 |
| Cargo docente/directivo ajustado | 61 + 1 |
| Edad recalculada (corte 31/12/2023) | 166 |
| Género corregido (coherencia entre años) | 3 |

Columnas:

- `CATEGORIA DEL DOCENTE`: ahora contiene el cargo validado por la SED. El valor original quedó en la columna nueva `CATEGORIA DEL DOCENTE_2023`. La columna mezcla dos nomenclaturas: la original (`Docente primaria`, `Docente contenido`, `Docente de inglés`, `Directivo docente`) y la de la SED (`Docente de aula`, `Coordinador`, `Docente Orientador`…).
- Nuevas: `Área educativa (SED)`, `¿Sigue en servicio?`.
- Se agregó y luego se eliminó `Tipo de docente (SED)` por ser duplicado del cargo.

Notas:

- Los 18 registros marcados por la SED como "No aparece en BBDD" y el colegio en concesión (no oficial) se dan por cumplidos; no se pueden validar.
- `helpdesk_2023_docentes.xlsx`: se actualizaron 14 cédulas y 5 nombres; coincide al 100 % con la Base 2023 (1.072 registros).
- **Nivel de matrícula antes del retiro:** para 2023 existe la base (`helpdesk_2023_docentes.xlsx`, hoja `nivel_inicial`).

## 4. Base 2024

| Cambio | Registros |
|---|---|
| Cédulas corregidas según SED | 23 |
| Fechas completadas (vacías en base) | 402 |
| Fechas corregidas (123 inversión día/mes, 4 año, 30 otras) | 157 |
| Fechas `00:00:00` dejadas vacías | 3 |
| Nombres reemplazados por el nombre SED | 1.376 |
| Cargo docente/directivo ajustado | 37 |
| Área educativa corregida | 102 |
| Edad completada o corregida (corte 31/12/2024) | 419 |
| Género corregido (coherencia entre años) | 2 |
| Tipo de documento TI → CC (según SED) | 2 |

Columnas:

- `CATEGORIA DEL DOCENTE`: reemplazada con el cargo SED en los registros ajustados (sin columna de respaldo, a diferencia de 2023).
- `AREA EDUCATIVA`: corregida con el área de la SED (en 2024 ya existía, por eso no hay `Área educativa (SED)`).
- Nueva: `¿Sigue en servicio?`.
- No tiene `Tipo de docente (SED)`.

Notas:

- 4 registros "No aparece en BBDD" se dan por cumplidos.
- **Nivel de matrícula antes del retiro:** para 2024 todavía no existe una base con ese dato.

## 5. Base 2025

| Cambio | Registros |
|---|---|
| Registro duplicado eliminado (grupo "Eximido C1", marcado por la SED) | 1 |
| Cédulas corregidas según SED | 8 |
| Fechas corregidas (289 inversión día/mes, 12 año, 65 otras) | 366 |
| Nombres reemplazados (también `NOMBRES`, `PRIMER APELLIDO`, `SEGUNDO APELLIDO`) | 112 |
| Cargo reemplazado con el valor SED | 12 (9 ya coincidían) |
| Género corregido (coherencia entre años) | 1 |

Columnas:

- Había dos columnas `CARGO` casi idénticas (2 diferencias). Se eliminó la **primera** y se conservó la segunda (la que pandas leía como `CARGO.1`). Ahora solo existe `CARGO`.
- `CARGO`: en los registros ajustados contiene el valor SED tal cual (`Docente de aula`, `Rector Institucion Educativa Completa`…). `DIR/DOC` no se modificó y puede no coincidir con `CARGO` en esos registros.
- `FECHA DE NACIMIENTO (DD/MM/AAAA)`: ahora toda la columna es fecha real (antes mezclaba texto y seriales de Excel con día/mes invertidos).
- Nueva: `EDAD`, justo después de la fecha de nacimiento (corte 31/12/2025).
- Nuevas al final: `Área educativa (SED)`, `¿Sigue en servicio?`.
- La base 2025 no tiene columna de tipo de documento.

Excepciones a la SED (decisión del equipo):

- 1 registro: se conservó el segundo apellido completo (la SED lo trae cortado).
- 1 registro: se conservó el segundo apellido igual que la SED y que 2024 (coherencia entre años).

## 6. Base 2026

Estructura:

- La hoja `base` consolida las pestañas `ewb_plus` (487), `ewb_two` (85) y `ewb_presencial` (50), en ese orden: 622 filas.
- `base` conserva sus 50 columnas. Mapeo con las pestañas: `CODIGO_DANE`←`DANE`, `COLEGIO_NOMBRE`←`IED`, `TIPO_DOCUMENTO`←`Tipo de Documento`, `DOCENTE_ID`←`Número de Documento`, `CARGO_ROL`←`Cargo`, `GRUPO_ID`←`Grupo`, `NIVEL_ASIGNADO`←`Nivel`, `PORCENTAJE_FINAL`←`% Asistencia a Clases`, `NIVEL_FORMACION`←`Nivel de Formacion`, `TIPO_NOMBRAMIENTO`←`Tipo de Nombramiento`, `ENGLISH_SCORE_ENTRADA_2026`←`ENGLISH SCORE ENTRADA 2026`, `NIVEL_MCER_ENTRADA_2026`←`NIVEL MCER ENTRADA 2026`; el resto con el mismo nombre en mayúsculas. En `base` la segunda columna de RT se llama `RT.1`; en las pestañas las dos se llaman `RT`.
- `base` no tiene columna de programa. Las filas siguen el orden de las pestañas: plus en las filas 2-488, two en 489-573 y presencial en 574-623.
- `DOCENTE_ID` no es única: 16 docentes aparecen en dos pestañas (13 en plus y two, 3 en plus y presencial). Se mantuvieron como filas separadas.
- 2026 no tiene fecha de nacimiento, edad, género, área ni "¿sigue en servicio?".
- Las columnas de constancia, salida 2026 y aprobación SED existen solo en las pestañas de programa (`Recibe Constancia?`, `ES SALIDA 2026 - NIVEL SCORE`, `ES SALIDA 2026 - NIVEL MCER`, `Aprobado SED`); no se agregaron a `base`.

Cambios aplicados en `base` (las pestañas de programa no se modificaron):

| Cambio | Registros |
|---|---|
| Nombres alineados con los validados en 2023-2025 (`NOMBRES` / `APELLIDOS`) | 83 filas |
| Cédulas reemplazadas por la validada en años anteriores (detalle en hoja `revision`) | 6 |
| Tipo de documento CE → CC (coherencia con 2023-2024) | 2 |

Notas:

- En algunos casos el nombre validado de años anteriores es más corto que el de 2026 (se priorizó la coherencia con la SED).
- Las pestañas `ewb_plus`, `ewb_two` y `ewb_presencial` conservan las cédulas, nombres y tipos de documento originales; las correcciones solo están en `base`.
- `CARGO_ROL` tiene valores con mayúsculas distintas (`Docente de Primaria` / `Docente de primaria`, `Docente de Contenido` / `Docente de contenido`); no se modificaron.

Validación contra la SED (la hoja SED cubre 2023-2025):

- 416 docentes de 2026 (431 filas) están en la SED por cédula: el nombre y el tipo de documento coinciden en todos.
- Los otros 190 docentes son nuevos en 2026: ninguno aparece en la SED con otra cédula (búsqueda por nombre y por cédulas a un dígito de distancia).

## 7. Campos demográficos por año

| Campo | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|
| Documento | `ID` | `ID` | `ID` | `DOCENTE_ID` |
| Tipo documento | `TIPO ID` | `TIPO ID` | — | `TIPO_DOCUMENTO` (formato "CC - CEDULA DE CIUDADANIA") |
| Nombre completo | `PARTICIPANTE` | `PARTICIPANTE` | `PARTICIPANTE` | — (solo `NOMBRES` y `APELLIDOS`) |
| Nombres / apellidos por separado | — | — | `NOMBRES`, `PRIMER APELLIDO`, `SEGUNDO APELLIDO` | `NOMBRES`, `APELLIDOS` |
| Fecha nacimiento | `FECHA DE NACIMIENTO` | `FECHA DE NACIMIENTO` | `FECHA DE NACIMIENTO (DD/MM/AAAA)` | — |
| Edad (fija, al 31/12) | `EDAD` | `EDAD` | `EDAD` | — |
| Género | `GENERO` | `GENERO` | `GENERO` | — |
| Cargo | `CATEGORIA DEL DOCENTE` | `CATEGORIA DEL DOCENTE` | `CARGO` | `CARGO_ROL` (única columna de cargo; sin validación SED para 2026) |
| Área | `Área educativa (SED)` | `AREA EDUCATIVA` | `Área educativa (SED)` | — |
| Sigue en servicio | `¿Sigue en servicio?` | `¿Sigue en servicio?` | `¿Sigue en servicio?` | — |
| Constancia | `RECIBE CONSTANCIA` | `RECIBE CONSTANCIA` | `RECIBE CONSTANCIA` | solo en pestañas: `Recibe Constancia?` |

416 docentes de 2026 están también en alguna de las bases 2023-2025, con la misma cédula y el mismo nombre.
