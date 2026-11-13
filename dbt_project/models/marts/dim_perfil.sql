with stg_2023 as (
    select 
        docente_id,
        nivel_formacion,
        cargo_rol,
        tipo_nombramiento,
        jornada_laboral,
        cast(null as varchar) as grado_dicta,
        2023 as source_year
    from {{ ref('stg_docentes_2023') }}
),

stg_2024 as (
    select 
        docente_id,
        nivel_formacion,
        cargo_rol,
        tipo_nombramiento,
        jornada_laboral,
        grado_dicta,
        2024 as source_year
    from {{ ref('stg_docentes_2024') }}
),

stg_2025 as (
    select 
        docente_id,
        nivel_formacion,
        cargo_rol,
        tipo_nombramiento,
        jornada_laboral,
        grado_dicta,
        2025 as source_year
    from {{ ref('stg_docentes_2025') }}
),

stg_2026 as (
    select 
        docente_id,
        nivel_formacion,
        cargo_rol,
        tipo_nombramiento,
        jornada_laboral,
        grado_dicta,
        2026 as source_year
    from {{ ref('stg_docentes_2026') }}
),

unioned_data as (
    select * from stg_2023
    union all
    select * from stg_2024
    union all
    select * from stg_2025
    union all
    select * from stg_2026
)

select 
    md5(coalesce(cast(docente_id as varchar), '') || '-' || cast(source_year as varchar)) as perfil_id,
    docente_id,
    nivel_formacion,
    cargo_rol,
    tipo_nombramiento,
    jornada_laboral,
    grado_dicta,
    source_year as anio_lectivo
from unioned_data
where docente_id is not null
