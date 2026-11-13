# 📊 Manual de Consultas Analíticas (Star Schema)

Este documento es una guía rápida para que analistas y científicos de datos interactúen con la capa **Gold (`marts`)** del proyecto *Tracking EwB IA*. Al estar diseñado bajo un modelo de **Esquema de Estrella**, todas las consultas transversales deben girar en torno a la tabla de hechos (`fct_docentes`), apoyándose en cruces (`JOIN`) con sus dimensiones correspondientes.

---

## 1. Conocer el Volumen de Participantes (Docentes) por Año
*¿Cuántos docentes únicos han sido registrados en la base de datos divididos por año lectivo?*

```sql
SELECT 
    f.anio_lectivo,
    COUNT(DISTINCT f.docente_id) as total_docentes
FROM marts.fct_docentes f
GROUP BY f.anio_lectivo
ORDER BY f.anio_lectivo ASC;
```

---

## 2. Promedio de Asistencia EWB por Colegio (Institución)
*¿Cuáles son los 5 Colegios (IED) con el mejor promedio de asistencia histórica de sus docentes?*

```sql
SELECT 
    i.colegio_nombre,
    ROUND(AVG(f.asistencia_porcentaje), 2) as promedio_asistencia

FROM marts.fct_docentes f

JOIN marts.dim_ied i ON f.codigo_dane = i.codigo_dane
WHERE f.asistencia_porcentaje IS NOT NULL
GROUP BY i.colegio_nombre
ORDER BY promedio_asistencia DESC
LIMIT 5;
```

---

## 3. Matriz de Progreso MCER (Delta de Salida vs Entrada)
*¿Cómo evolucionaron los niveles de inglés (MCER) del inicio al final del curso para una cohorte específica (ej. 2024)?*

```sql
SELECT 
    m_in.nivel_mcer as nivel_entrada,
    m_out.nivel_mcer as nivel_salida,
    COUNT(f.docente_id) as cantidad_docentes
FROM marts.fct_docentes f
-- Cruce para obtener la etiqueta de entrada
JOIN marts.dim_mcer m_in ON f.mcer_entrada_id = m_in.mcer_id
-- Cruce para obtener la etiqueta de salida
JOIN marts.dim_mcer m_out ON f.mcer_salida_id = m_out.mcer_id
WHERE f.anio_lectivo = 2024
GROUP BY m_in.nivel_mcer, m_out.nivel_mcer
ORDER BY m_in.nivel_mcer, m_out.nivel_mcer;
```

---

## 4. Distribución de Docentes Remotos vs. Presenciales por Nivel de Formación
*¿Cuántos docentes tomaron el programa de forma remota este año, categorizados por su nivel educativo (Ej. Pregrado, Especialización)?*

```sql
SELECT 
    p.nivel_formacion,
    c.es_remoto,
    COUNT(DISTINCT f.docente_id) as total_docentes
FROM marts.fct_docentes f
JOIN marts.dim_perfil p ON f.perfil_id = p.perfil_id
JOIN marts.dim_curso c ON f.grupo_id = c.grupo_id
WHERE f.anio_lectivo = 2025
GROUP BY p.nivel_formacion, c.es_remoto
ORDER BY total_docentes DESC;
```

---

## 5. Ranking de Crecimiento de Puntaje General (Scores)
*¿Qué docentes experimentaron el salto más grande en su puntaje numérico de inglés?*

```sql
SELECT 
    d.docente_nombre,
    d.correo_electronico,
    f.anio_lectivo,
    f.score_entrada,
    f.score_salida,
    (f.score_salida - f.score_entrada) as delta_crecimiento
FROM marts.fct_docentes f
JOIN marts.dim_docentes d ON f.docente_id = d.docente_id
WHERE f.score_entrada IS NOT NULL 
  AND f.score_salida IS NOT NULL
ORDER BY delta_crecimiento DESC
LIMIT 10;
```

## 6. Trazabilidad Histórica de MCER Superior a A2 (Formato Pivote)
*¿Cuál ha sido la trayectoria histórica evolutiva de los docentes año tras año, presentándolo en columnas para facilitar la lectura analítica, y filtrando por quienes alguna vez alcanzaron o superaron el nivel A2?*

```sql
SELECT 
    d.docente_id,
    d.docente_nombre,
    d.tipo_documento,
    p.cargo_rol,
    -- Pivote de MCER por Año
    MAX(CASE WHEN f.anio_lectivo = 2023 THEN m_out.nivel_mcer END) as mcer_salida_2023,
    MAX(CASE WHEN f.anio_lectivo = 2024 THEN m_out.nivel_mcer END) as mcer_salida_2024,
    MAX(CASE WHEN f.anio_lectivo = 2025 THEN m_out.nivel_mcer END) as mcer_salida_2025,
    -- Máximo nivel alcanzado de forma histórica (ID numérico máximo)
    MAX(f.mcer_salida_id) as id_maximo_historico
FROM marts.fct_docentes f
JOIN marts.dim_docentes d ON f.docente_id = d.docente_id
-- Cruce para la información de perfil (cargo_rol)
JOIN marts.dim_perfil p ON f.perfil_id = p.perfil_id
LEFT JOIN marts.dim_mcer m_out ON f.mcer_salida_id = m_out.mcer_id
GROUP BY 
    d.docente_id,
    d.docente_nombre,
    d.tipo_documento,
    p.cargo_rol
-- Filtro Having: Retenemos únicamente a quienes en SU MEJOR MOMENTO histórico superaron el A1 (mcer_id >= 2)
HAVING MAX(f.mcer_salida_id) >= 2
ORDER BY d.docente_nombre;
```

---

## 💡 Mejores Prácticas al Escribir Consultas
1. **Siempre usa `marts.fct_docentes` como pivote (cláusula FROM principal).**
2. **Evita la capa Staging (`raw` o `staging`).** Toda la información limpia ya cruzó a `marts`.
3. **Manejo de Nulos.** Recuerda usar `WHERE campo IS NOT NULL` al usar funciones de agregación (`AVG`, `MIN`, `MAX`) para evitar resultados sesgados por años donde esos datos no se capturaron (como el 2023).
