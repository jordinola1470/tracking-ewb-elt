with stg_2023 as (
    select 
        codigo_dane,
        colegio_nombre,
        'No Registrado' as ubicacion_geo,
        2023 as source_year
    from {{ ref('stg_docentes_2023') }}
),

stg_2024 as (
    select 
        codigo_dane,
        colegio_nombre,
        ubicacion_geo,
        2024 as source_year
    from {{ ref('stg_docentes_2024') }}
),

stg_2025 as (
    select 
        codigo_dane,
        colegio_nombre,
        ubicacion_geo,
        2025 as source_year
    from {{ ref('stg_docentes_2025') }}
),

stg_2026 as (
    select 
        codigo_dane,
        colegio_nombre,
        ubicacion_geo,
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

-- Un registro por IED: último valor no nulo de cada campo (2026 no trae ubicación geográfica).
deduplicated as (
    select
        codigo_dane,
        (array_agg(colegio_nombre order by source_year desc) filter (where colegio_nombre is not null))[1] as colegio_nombre,
        (array_agg(ubicacion_geo order by source_year desc) filter (where ubicacion_geo is not null))[1] as ubicacion_geo
    from unioned_data
    where codigo_dane is not null
    group by codigo_dane
)

select * from deduplicated
