# Estructura de Tabla de Hechos: `fct_docentes`

Este documento detalla la estructura y orígenes de la tabla de hechos transaccional para el proyecto Tracking-EwB-IA. Esta tabla recopila las métricas (medidas) de rendimiento académico y evaluación de nivel MCER por docente a lo largo del tiempo, consolidando las variaciones temporales ocurridas entre las tomas de 2023, 2024 y 2025.

## 1. Mapeo de Extracción (Capa Silver a Gold)

| Atributo Estándar | Origen Raw 2023 | Origen Raw 2024 | Origen Raw 2025 | Tipo de Dato | Etiqueta / Rol |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `docente_id` | `docente_id` | `docente_id` | `docente_id` | `VARCHAR` | Foreign Key (`dim_docentes`) |
| `codigo_dane` | `codigo_dane` | `codigo_dane` | `codigo_dane` | `VARCHAR` | Foreign Key (`dim_ied`) |
| `perfil_id` | MD5 Hash | MD5 Hash | MD5 Hash | `VARCHAR` | Foreign Key (`dim_perfil`) |
| `grupo_id` | `grupo_id` | `grupo_id` | `grupo_id` | `VARCHAR` | Foreign Key (`dim_curso`) |
| `anio_lectivo` | (Constante: 2023) | (Constante: 2024) | (Constante: 2025) | `INTEGER` | Time Dimension |
| `score_entrada` | (N/A) | `english_score_entrada_2024` | `english_score_entrada_2025` | `NUMERIC` | Metric / Measure |
| `mcer_entrada_id` | (N/A) | `nivel_mcer_entrada_2024` | `nivel_mcer_entrada_2025` | `INTEGER` | Foreign Key (`dim_mcer`) |
| `score_salida` | (N/A) | `english_score_salida_2024` | `english_score_salida_2025` | `NUMERIC` | Metric / Measure |
| `mcer_salida_id`| (N/A) | `nivel_mcer_salida_2024`| `nivel_mcer_salida_2025` | `INTEGER` | Foreign Key (`dim_mcer`) |
| `asistencia_porcentaje` | `asistencia_ewb_2023` | `de_participacion_ewb_2024` | `porcentaje_final` | `NUMERIC` | Metric / Measure |
| `recibe_constancia` | `constancia_ewb_2023` | `recibe_constancia` | `recibe_constancia` | `VARCHAR`| Degenerate Dimension |

*Nota: Los nombres exactos bajo "Origen Raw" responden a los encabezados pre-limpiados asimilados en la capa Bronze y que se encuentran alojados en la estructura actual física de la BD.*

## 2. Reglas de Negocio (Transformaciones)

1. **Granularidad y Lllave Primaria:** Un registro único por `docente_id` + `anio_lectivo`.
2. **Modelo de Estrella Riguroso:** La tabla incorpora `codigo_dane`, `perfil_id` y `grupo_id` generados o extraídos durante la ingesta para consolidar los cruces analíticos hacia las dimensiones (`dim_ied`, `dim_perfil` y `dim_curso`).
3. **Conversión de MCER a FK (Normalización Analítica):** Las clasificaciones de texto "A1", "A2", "B1", etc., serán cruzadas internamente hacia valores enteros (`1`, `2`, `3`...) correspondientes al nuevo catálogo dimensional de soporte denominado `dim_mcer`. Esto habilita análisis de deltas y optimización de índices.
4. **Armonización de Nulos (2023):** Para el año 2023, los puntajes métricos y asignaciones MCER que no existían en la extracción inicial se rellenarán puramente como `NULL` para impedir que los sesgos rompan métricas de agregación como promedios analíticos en dashboards.
5. **Conversión Estricta:** Las columnas de "Score" serán purificadas hacia `NUMERIC`, excluyendo textos "N/A" o vacíos ingresados manualmente por encuestadores, que serán manejados como `NULL`.
6. **Porcentajes:** La asistencia se estandarizará en la regla fraccionaria genérica unificada (i.e., `NUMERIC` o decimal).