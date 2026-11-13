with stg_2023 as (
    select 
        docente_id,
        codigo_dane,
        grupo_id,
        cast(2023 as integer) as anio_lectivo,
        score_entrada,
        mcer_entrada,
        score_salida,
        mcer_salida,
        asistencia_porcentaje,
        recibe_constancia
    from {{ ref('stg_docentes_2023') }}
),

stg_2024 as (
    select 
        docente_id,
        codigo_dane,
        grupo_id,
        cast(2024 as integer) as anio_lectivo,
        score_entrada,
        mcer_entrada,
        score_salida,
        mcer_salida,
        asistencia_porcentaje,
        recibe_constancia
    from {{ ref('stg_docentes_2024') }}
),

stg_2025 as (
    select 
        docente_id,
        codigo_dane,
        grupo_id,
        cast(2025 as integer) as anio_lectivo,
        score_entrada,
        mcer_entrada,
        score_salida,
        mcer_salida,
        asistencia_porcentaje,
        recibe_constancia
    from {{ ref('stg_docentes_2025') }}
),

stg_2026 as (
    select 
        docente_id,
        codigo_dane,
        grupo_id,
        cast(2026 as integer) as anio_lectivo,
        score_entrada,
        mcer_entrada,
        score_salida,
        mcer_salida,
        asistencia_porcentaje,
        recibe_constancia
    from {{ ref('stg_docentes_2026') }}
),

unioned_metrics as (
    select * from stg_2023
    union all
    select * from stg_2024
    union all
    select * from stg_2025
    union all
    select * from stg_2026
),

-- Reference dimensional catalog for mapping text to IDs
mcer_catalog as (
    select mcer_id, nivel_mcer 
    from {{ ref('dim_mcer') }}
),

fact_built as (
    select
        um.docente_id as docente_id,
        um.codigo_dane as codigo_dane,
        um.grupo_id as grupo_id,
        md5(coalesce(cast(um.docente_id as varchar), '') || '-' || cast(um.anio_lectivo as varchar)) as perfil_id,
        um.anio_lectivo as anio_lectivo,
        
        -- Entrada
        um.score_entrada as score_entrada,
        m1.mcer_id as mcer_entrada_id,
        
        -- Salida
        um.score_salida as score_salida,
        m2.mcer_id as mcer_salida_id,
        
        -- Finales
        um.asistencia_porcentaje as asistencia_porcentaje,
        um.recibe_constancia as recibe_constancia

    from unioned_metrics um
    -- Left join para mapear categorías MCER de entrada a Foreign Keys
    -- (las variantes 'Pre A1', 'PRE-A1', 'PreA1' se normalizan a 'PRE_A1' como en dim_mcer)
    left join mcer_catalog m1 on regexp_replace(upper(trim(um.mcer_entrada)), '^PRE[ _-]*A1$', 'PRE_A1') = m1.nivel_mcer
    -- Left join para mapear categorías MCER de salida a Foreign Keys
    left join mcer_catalog m2 on regexp_replace(upper(trim(um.mcer_salida)), '^PRE[ _-]*A1$', 'PRE_A1') = m2.nivel_mcer
)

-- Filtramos posibles nulos que carezcan de sujeto (no hay docente al que atar el hecho)
select * 
from fact_built
where docente_id is not null
