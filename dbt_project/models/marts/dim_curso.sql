with stg_2023 as (
    select 
        grupo_id,
        nivel_asignado,
        rt_remoto,
        2023 as source_year
    from {{ ref('stg_docentes_2023') }}
),

stg_2024 as (
    select 
        grupo_id,
        nivel_asignado,
        cast(null as varchar) as rt_remoto,
        2024 as source_year
    from {{ ref('stg_docentes_2024') }}
),

stg_2025 as (
    select 
        grupo_id,
        nivel_asignado,
        cast(null as varchar) as rt_remoto,
        2025 as source_year
    from {{ ref('stg_docentes_2025') }}
),

stg_2026 as (
    select 
        grupo_id,
        nivel_asignado,
        cast(null as varchar) as rt_remoto,
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
),

deduplicated as (
    select 
        *,
        row_number() over (partition by grupo_id order by source_year desc) as rn
    from unioned_data
    where grupo_id is not null
)

select 
    grupo_id,
    nivel_asignado,
    rt_remoto
from deduplicated
where rn = 1
