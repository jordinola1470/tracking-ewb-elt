{{ config(
    materialized='table',
    schema='public'
)}}

SELECT 
    d.docente_id,
    d.docente_nombre,
    d.tipo_documento,
    -- Pivote de MCER por Año
    MAX(CASE WHEN f.anio_lectivo = 2023 THEN m_out.nivel_mcer END) as mcer_salida_2023,
    MAX(CASE WHEN f.anio_lectivo = 2024 THEN m_out.nivel_mcer END) as mcer_salida_2024,
    MAX(CASE WHEN f.anio_lectivo = 2025 THEN m_out.nivel_mcer END) as mcer_salida_2025,
    MAX(CASE WHEN f.anio_lectivo = 2026 THEN m_out.nivel_mcer END) as mcer_salida_2026,
    -- Máximo nivel alcanzado de forma histórica (ID numérico máximo)
    MAX(f.mcer_salida_id) as id_maximo_historico

FROM {{ ref('fct_docentes') }} f
JOIN {{ ref('dim_docentes') }} d ON f.docente_id = d.docente_id

-- Cruce para la información de perfil (cargo_rol)
JOIN {{ ref('dim_perfil') }} p ON f.perfil_id = p.perfil_id

LEFT JOIN {{ ref('dim_mcer') }} m_out ON f.mcer_salida_id = m_out.mcer_id

GROUP BY 
    d.docente_id,
    d.docente_nombre,
    d.tipo_documento
-- Filtro Having: Retenemos únicamente a quienes en SU MEJOR MOMENTO histórico alcanzaron A2 o un nivel superior (mcer_id >= 2)
HAVING MAX(f.mcer_salida_id) >= 2
ORDER BY d.docente_nombre

