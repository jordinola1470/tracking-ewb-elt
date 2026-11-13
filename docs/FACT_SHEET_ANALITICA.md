# 📊 Fact Sheet EwB — Business Analytics sobre `public.consolidado_historico`

Hechos claros (no estadística) para responder preguntas de negocio sobre los participantes del programa *English without Borders* 2023-2025. Cada consulta es independiente: se copia, se pega en el cliente SQL y se ejecuta.

## Convenciones y advertencias de calidad de datos

- **Participante** = `docente_id` distinto. La tabla tiene una fila por docente y año (3.734 filas, 2.638 docentes).
- Se excluyen las filas con `docente_id` nulo (1 fila de 2025).
- **Duplicado conocido:** un docente aparece dos veces en un mismo año. Las consultas de progresión lo resuelven con `docente_anio` (una fila por docente y año).
- **Nivel cursado** = `nivel_estandar` (`PRE_A1 < A1 < A2 < B1 < B2`). Se ignoran `-`, `B1+` y NULL porque no tienen orden definido.
- **MCER** (`mcer_entrada`, `mcer_salida`) viene con variantes (`PRE - A1`, `PRE A1`) y valores no evaluables (`-`, `No ha realizado`, `Invalidado por ES`, `Abandonado`). Las consultas los normalizan y descartan los no evaluables.
- **`asistencia_porcentaje_fix`** está en escala 0-1 (`0.85` = 85 %).
- El género y el nivel de formación se leen del **registro más reciente** del docente cuando se cuenta a personas únicas.

---

## 1. Panorama general

### 1.1 Cifras globales

```sql
SELECT
    COUNT(*)                          AS registros_totales,
    COUNT(DISTINCT docente_id)        AS participantes_unicos,
    COUNT(DISTINCT codigo_dane)       AS colegios_distintos,
    MIN(anio_lectivo)                 AS primer_anio,
    MAX(anio_lectivo)                 AS ultimo_anio
FROM public.consolidado_historico
WHERE docente_id IS NOT NULL;
```

### 1.2 Participantes por año

```sql
SELECT
    anio_lectivo,
    COUNT(*)                     AS registros,
    COUNT(DISTINCT docente_id)   AS docentes,
    COUNT(DISTINCT codigo_dane)  AS colegios,
    COUNT(DISTINCT grupo_id)     AS grupos
FROM public.consolidado_historico
WHERE docente_id IS NOT NULL
GROUP BY anio_lectivo
ORDER BY anio_lectivo;
```

### 1.3 Nuevos vs. recurrentes por año

Un docente es *nuevo* en el primer año en que aparece y *recurrente* si ya había participado antes.

```sql
WITH primer AS (
    SELECT docente_id, MIN(anio_lectivo) AS primer_anio
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    GROUP BY docente_id
)
SELECT
    t.anio_lectivo,
    COUNT(DISTINCT t.docente_id)                                              AS docentes,
    COUNT(DISTINCT t.docente_id) FILTER (WHERE p.primer_anio = t.anio_lectivo) AS nuevos,
    COUNT(DISTINCT t.docente_id) FILTER (WHERE p.primer_anio < t.anio_lectivo) AS recurrentes
FROM public.consolidado_historico t
JOIN primer p USING (docente_id)
GROUP BY t.anio_lectivo
ORDER BY t.anio_lectivo;
```

---

## 2. Permanencia: ¿cuántos años han estado con nosotros?

### 2.1 Docentes según número de años de participación

```sql
WITH anios AS (
    SELECT docente_id, COUNT(DISTINCT anio_lectivo) AS anios_participados
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    GROUP BY docente_id
)
SELECT
    anios_participados,
    COUNT(*)                                          AS docentes,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS porcentaje
FROM anios
GROUP BY anios_participados
ORDER BY anios_participados;
```

### 2.2 Trayectorias exactas (qué años cursó cada grupo)

```sql
WITH trayectoria AS (
    SELECT docente_id,
           STRING_AGG(DISTINCT anio_lectivo::text, ' + ' ORDER BY anio_lectivo::text) AS anios
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    GROUP BY docente_id
)
SELECT anios AS trayectoria, COUNT(*) AS docentes
FROM trayectoria
GROUP BY anios
ORDER BY docentes DESC;
```

### 2.3 Retención año a año

De los docentes de un año, cuántos vuelven al siguiente.

```sql
WITH d AS (
    SELECT DISTINCT docente_id, anio_lectivo
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
)
SELECT
    a.anio_lectivo                                            AS anio_base,
    a.anio_lectivo + 1                                        AS anio_siguiente,
    COUNT(*)                                                  AS docentes_anio_base,
    COUNT(b.docente_id)                                       AS continuan,
    ROUND(100.0 * COUNT(b.docente_id) / COUNT(*), 1)          AS porcentaje_retencion
FROM d a
LEFT JOIN d b
       ON b.docente_id = a.docente_id
      AND b.anio_lectivo = a.anio_lectivo + 1
WHERE a.anio_lectivo < (SELECT MAX(anio_lectivo) FROM d)
GROUP BY a.anio_lectivo
ORDER BY a.anio_lectivo;
```

---

## 3. Perfil de los participantes

### 3.1 Género de los participantes únicos

```sql
WITH ultimo AS (
    SELECT DISTINCT ON (docente_id) docente_id, genero
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    ORDER BY docente_id, anio_lectivo DESC
)
SELECT
    COALESCE(genero, 'Sin dato')                       AS genero,
    COUNT(*)                                           AS docentes,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS porcentaje
FROM ultimo
GROUP BY genero
ORDER BY docentes DESC;
```

### 3.2 Género por año

```sql
SELECT
    anio_lectivo,
    COUNT(DISTINCT docente_id) FILTER (WHERE genero = 'Femenino')  AS mujeres,
    COUNT(DISTINCT docente_id) FILTER (WHERE genero = 'Masculino') AS hombres,
    ROUND(100.0 * COUNT(DISTINCT docente_id) FILTER (WHERE genero = 'Femenino')
          / COUNT(DISTINCT docente_id), 1)                         AS pct_mujeres
FROM public.consolidado_historico
WHERE docente_id IS NOT NULL
GROUP BY anio_lectivo
ORDER BY anio_lectivo;
```

### 3.3 Género de quienes han estado los 3 años

```sql
WITH anios AS (
    SELECT docente_id, COUNT(DISTINCT anio_lectivo) AS n
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    GROUP BY docente_id
),
ultimo AS (
    SELECT DISTINCT ON (docente_id) docente_id, genero
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    ORDER BY docente_id, anio_lectivo DESC
)
SELECT COALESCE(u.genero, 'Sin dato') AS genero, COUNT(*) AS docentes_3_anios
FROM anios a
JOIN ultimo u USING (docente_id)
WHERE a.n = 3
GROUP BY u.genero
ORDER BY docentes_3_anios DESC;
```

### 3.4 Nivel de formación de los participantes únicos

Agrupa variantes de escritura (`Magister`/`Magíster`, `Profesional universitario`/`Profesional Universitario`).

```sql
WITH ultimo AS (
    SELECT DISTINCT ON (docente_id) docente_id, nivel_formacion
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    ORDER BY docente_id, anio_lectivo DESC
)
SELECT
    CASE
        WHEN LOWER(nivel_formacion) IN ('magister', 'magíster')   THEN 'Magíster'
        WHEN LOWER(nivel_formacion) = 'profesional universitario' THEN 'Profesional Universitario'
        WHEN nivel_formacion IS NULL OR LOWER(nivel_formacion) = 'undefined' THEN 'Sin dato'
        ELSE nivel_formacion
    END                                                AS nivel_formacion,
    COUNT(*)                                           AS docentes,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS porcentaje
FROM ultimo
GROUP BY 1
ORDER BY docentes DESC;
```

### 3.5 Cargo de los participantes por año

```sql
SELECT
    anio_lectivo,
    COALESCE(cargo_estandar, 'Sin dato') AS cargo,
    COUNT(DISTINCT docente_id)           AS docentes
FROM public.consolidado_historico
WHERE docente_id IS NOT NULL
GROUP BY anio_lectivo, 2
ORDER BY anio_lectivo, docentes DESC;
```

---

## 4. Instituciones (IED)

### 4.1 Top 10 colegios con más docentes (histórico)

```sql
SELECT
    codigo_dane,
    MAX(colegio_nombre)             AS colegio,
    COUNT(DISTINCT docente_id)      AS docentes_unicos,
    COUNT(DISTINCT anio_lectivo)    AS anios_presentes
FROM public.consolidado_historico
WHERE docente_id IS NOT NULL AND codigo_dane IS NOT NULL
GROUP BY codigo_dane
ORDER BY docentes_unicos DESC
LIMIT 10;
```

### 4.2 Colegios presentes en los 3 años

```sql
SELECT COUNT(*) AS colegios_en_los_3_anios
FROM (
    SELECT codigo_dane
    FROM public.consolidado_historico
    WHERE codigo_dane IS NOT NULL
    GROUP BY codigo_dane
    HAVING COUNT(DISTINCT anio_lectivo) = 3
) x;
```

---

## 5. Nivel cursado (`nivel_estandar`)

### 5.1 Docentes por nivel cursado y año

```sql
SELECT
    anio_lectivo,
    COALESCE(nivel_estandar, 'Sin dato') AS nivel_cursado,
    COUNT(DISTINCT docente_id)           AS docentes
FROM public.consolidado_historico
WHERE docente_id IS NOT NULL
GROUP BY anio_lectivo, 2
ORDER BY anio_lectivo, 2;
```

### 5.2 ¿Quiénes subieron de nivel cursado? (primer vs. último año)

Compara el nivel del primer año con el del último año de cada docente que participó en 2 o más años. Solo considera niveles con orden definido.

```sql
WITH docente_anio AS (
    SELECT DISTINCT ON (docente_id, anio_lectivo)
        docente_id, anio_lectivo,
        CASE nivel_estandar
            WHEN 'PRE_A1' THEN 0 WHEN 'A1' THEN 1 WHEN 'A2' THEN 2
            WHEN 'B1' THEN 3 WHEN 'B2' THEN 4
        END AS nivel_orden
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    ORDER BY docente_id, anio_lectivo, 3 DESC NULLS LAST
),
validos AS (
    SELECT * FROM docente_anio WHERE nivel_orden IS NOT NULL
),
extremos AS (
    SELECT
        docente_id,
        COUNT(*)                                                    AS anios_con_nivel,
        (ARRAY_AGG(nivel_orden ORDER BY anio_lectivo ASC))[1]       AS nivel_primer_anio,
        (ARRAY_AGG(nivel_orden ORDER BY anio_lectivo DESC))[1]      AS nivel_ultimo_anio
    FROM validos
    GROUP BY docente_id
    HAVING COUNT(*) >= 2
)
SELECT
    CASE
        WHEN nivel_ultimo_anio > nivel_primer_anio THEN 'Subió de nivel'
        WHEN nivel_ultimo_anio = nivel_primer_anio THEN 'Mismo nivel'
        ELSE 'Bajó de nivel'
    END                                                AS resultado,
    COUNT(*)                                           AS docentes,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS porcentaje
FROM extremos
GROUP BY 1
ORDER BY docentes DESC;
```

### 5.3 Transición de nivel año a año

```sql
WITH docente_anio AS (
    SELECT DISTINCT ON (docente_id, anio_lectivo)
        docente_id, anio_lectivo,
        CASE nivel_estandar
            WHEN 'PRE_A1' THEN 0 WHEN 'A1' THEN 1 WHEN 'A2' THEN 2
            WHEN 'B1' THEN 3 WHEN 'B2' THEN 4
        END AS nivel_orden
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    ORDER BY docente_id, anio_lectivo, 3 DESC NULLS LAST
)
SELECT
    a.anio_lectivo || ' → ' || b.anio_lectivo                            AS transicion,
    COUNT(*)                                                             AS docentes_comparables,
    COUNT(*) FILTER (WHERE b.nivel_orden > a.nivel_orden)                AS subieron,
    COUNT(*) FILTER (WHERE b.nivel_orden = a.nivel_orden)                AS mismo_nivel,
    COUNT(*) FILTER (WHERE b.nivel_orden < a.nivel_orden)                AS bajaron
FROM docente_anio a
JOIN docente_anio b
  ON b.docente_id = a.docente_id
 AND b.anio_lectivo = a.anio_lectivo + 1
WHERE a.nivel_orden IS NOT NULL AND b.nivel_orden IS NOT NULL
GROUP BY a.anio_lectivo, b.anio_lectivo
ORDER BY a.anio_lectivo;
```

---

## 6. Mejora de inglés (MCER y score)

> Para estas consultas el nivel MCER se normaliza a un orden numérico: `PRE A1 = 0, A1 = 1, A2 = 2, B1 = 3, B2 = 4, C1 = 5`. Cualquier otro valor (`-`, `No ha realizado`, `Invalidado por ES`, `Abandonado`, NULL) no se evalúa.

### 6.1 Distribución del MCER de salida por año

```sql
SELECT
    anio_lectivo,
    CASE UPPER(REPLACE(REPLACE(mcer_salida, ' ', ''), '-', ''))
        WHEN 'PREA1' THEN 'PRE A1' WHEN 'A1' THEN 'A1' WHEN 'A2' THEN 'A2'
        WHEN 'B1' THEN 'B1' WHEN 'B2' THEN 'B2' WHEN 'C1' THEN 'C1'
        ELSE 'No evaluado'
    END                          AS mcer_salida,
    COUNT(DISTINCT docente_id)   AS docentes
FROM public.consolidado_historico
WHERE docente_id IS NOT NULL
GROUP BY anio_lectivo, 2
ORDER BY anio_lectivo, 2;
```

### 6.2 Mejora dentro de un mismo año (entrada vs. salida)

```sql
WITH niveles AS (
    SELECT
        docente_id, anio_lectivo,
        CASE UPPER(REPLACE(REPLACE(mcer_entrada, ' ', ''), '-', ''))
            WHEN 'PREA1' THEN 0 WHEN 'A1' THEN 1 WHEN 'A2' THEN 2
            WHEN 'B1' THEN 3 WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 END AS entrada,
        CASE UPPER(REPLACE(REPLACE(mcer_salida, ' ', ''), '-', ''))
            WHEN 'PREA1' THEN 0 WHEN 'A1' THEN 1 WHEN 'A2' THEN 2
            WHEN 'B1' THEN 3 WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 END AS salida
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
)
SELECT
    anio_lectivo,
    COUNT(*)                                       AS docentes_con_entrada_y_salida,
    COUNT(*) FILTER (WHERE salida > entrada)       AS mejoraron,
    COUNT(*) FILTER (WHERE salida = entrada)       AS se_mantuvieron,
    COUNT(*) FILTER (WHERE salida < entrada)       AS bajaron,
    ROUND(100.0 * COUNT(*) FILTER (WHERE salida > entrada) / COUNT(*), 1) AS pct_mejoraron
FROM niveles
WHERE entrada IS NOT NULL AND salida IS NOT NULL
GROUP BY anio_lectivo
ORDER BY anio_lectivo;
```

### 6.3 Mejora histórica: primer MCER registrado vs. último MCER de salida

Para cada docente con datos válidos, compara el **primer MCER de entrada** con el **último MCER de salida** de toda su trayectoria.

```sql
WITH niveles AS (
    SELECT
        docente_id, anio_lectivo,
        CASE UPPER(REPLACE(REPLACE(mcer_entrada, ' ', ''), '-', ''))
            WHEN 'PREA1' THEN 0 WHEN 'A1' THEN 1 WHEN 'A2' THEN 2
            WHEN 'B1' THEN 3 WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 END AS entrada,
        CASE UPPER(REPLACE(REPLACE(mcer_salida, ' ', ''), '-', ''))
            WHEN 'PREA1' THEN 0 WHEN 'A1' THEN 1 WHEN 'A2' THEN 2
            WHEN 'B1' THEN 3 WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 END AS salida
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
),
extremos AS (
    SELECT
        docente_id,
        (ARRAY_AGG(entrada ORDER BY anio_lectivo ASC)  FILTER (WHERE entrada IS NOT NULL))[1] AS primera_entrada,
        (ARRAY_AGG(salida  ORDER BY anio_lectivo DESC) FILTER (WHERE salida  IS NOT NULL))[1] AS ultima_salida
    FROM niveles
    GROUP BY docente_id
)
SELECT
    CASE
        WHEN ultima_salida > primera_entrada THEN 'Mejoró su nivel de inglés'
        WHEN ultima_salida = primera_entrada THEN 'Mismo nivel'
        ELSE 'Nivel inferior'
    END                                                AS resultado,
    COUNT(*)                                           AS docentes,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS porcentaje
FROM extremos
WHERE primera_entrada IS NOT NULL AND ultima_salida IS NOT NULL
GROUP BY 1
ORDER BY docentes DESC;
```

### 6.4 Mejora de puntaje (score) por año

```sql
SELECT
    anio_lectivo,
    COUNT(*)                                       AS docentes_con_ambos_scores,
    ROUND(AVG(score_entrada), 1)                   AS score_entrada_promedio,
    ROUND(AVG(score_salida), 1)                    AS score_salida_promedio,
    COUNT(*) FILTER (WHERE score_salida > score_entrada) AS subieron_score,
    COUNT(*) FILTER (WHERE score_salida <= score_entrada) AS no_subieron_score
FROM public.consolidado_historico
WHERE docente_id IS NOT NULL
  AND score_entrada IS NOT NULL
  AND score_salida  IS NOT NULL
GROUP BY anio_lectivo
ORDER BY anio_lectivo;
```

---

## 7. Cumplimiento: constancias y asistencia

### 7.1 Constancias por año

`recibe_constancia` viene como `Si/SI/No/NO`; se normaliza.

```sql
SELECT
    anio_lectivo,
    COUNT(*)                                                     AS registros,
    COUNT(*) FILTER (WHERE UPPER(recibe_constancia) = 'SI')      AS con_constancia,
    COUNT(*) FILTER (WHERE UPPER(recibe_constancia) = 'NO')      AS sin_constancia,
    ROUND(100.0 * COUNT(*) FILTER (WHERE UPPER(recibe_constancia) = 'SI') / COUNT(*), 1) AS pct_con_constancia
FROM public.consolidado_historico
WHERE docente_id IS NOT NULL
GROUP BY anio_lectivo
ORDER BY anio_lectivo;
```

### 7.2 Asistencia por año

```sql
SELECT
    anio_lectivo,
    ROUND(100 * AVG(asistencia_porcentaje_fix), 1)                              AS asistencia_promedio_pct,
    COUNT(*) FILTER (WHERE asistencia_porcentaje_fix >= 0.80)                   AS con_80_o_mas,
    COUNT(*) FILTER (WHERE asistencia_porcentaje_fix <  0.80)                   AS con_menos_de_80,
    COUNT(*) FILTER (WHERE asistencia_porcentaje_fix IS NULL)                   AS sin_dato
FROM public.consolidado_historico
WHERE docente_id IS NOT NULL
GROUP BY anio_lectivo
ORDER BY anio_lectivo;
```

---

## 8. Resumen ejecutivo en una sola fila

Las cifras clave del programa para pegar directamente en una presentación.

```sql
WITH anios AS (
    SELECT docente_id, COUNT(DISTINCT anio_lectivo) AS n
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    GROUP BY docente_id
),
ultimo AS (
    SELECT DISTINCT ON (docente_id) docente_id, genero
    FROM public.consolidado_historico
    WHERE docente_id IS NOT NULL
    ORDER BY docente_id, anio_lectivo DESC
)
SELECT
    (SELECT COUNT(*) FROM anios)                                         AS participantes_unicos,
    (SELECT COUNT(*) FROM ultimo WHERE genero = 'Femenino')              AS mujeres,
    (SELECT COUNT(*) FROM ultimo WHERE genero = 'Masculino')             AS hombres,
    (SELECT COUNT(*) FROM anios WHERE n = 1)                             AS un_anio,
    (SELECT COUNT(*) FROM anios WHERE n = 2)                             AS dos_anios,
    (SELECT COUNT(*) FROM anios WHERE n = 3)                             AS tres_anios,
    (SELECT COUNT(DISTINCT codigo_dane) FROM public.consolidado_historico
        WHERE codigo_dane IS NOT NULL)                                   AS colegios;
```
