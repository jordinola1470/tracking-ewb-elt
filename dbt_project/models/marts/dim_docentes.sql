with stg_2023 as (
    select 
        docente_id,
        docente_nombre,
        tipo_documento,
        genero,
        fecha_nacimiento,
        correo_electronico,
        telefono_celular,
        2023 as source_year
    from {{ ref('stg_docentes_2023') }}
),

stg_2024 as (
    select 
        docente_id,
        docente_nombre,
        tipo_documento,
        genero,
        fecha_nacimiento,
        correo_electronico,
        telefono_celular,
        2024 as source_year
    from {{ ref('stg_docentes_2024') }}
),

stg_2025 as (
    select 
        docente_id,
        docente_nombre,
        null as tipo_documento,
        genero,
        fecha_nacimiento,
        correo_electronico,
        telefono_celular,
        2025 as source_year
    from {{ ref('stg_docentes_2025') }}
),

stg_2026 as (
    select 
        docente_id,
        docente_nombre,
        tipo_documento,
        genero,
        fecha_nacimiento,
        correo_electronico,
        telefono_celular,
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

-- Un registro por docente: para cada campo se toma el último valor NO nulo (2026 no trae
-- género ni fecha de nacimiento y no debe borrar lo que ya se conocía de años anteriores).
deduplicated as (
    select
        docente_id,
        (array_agg(docente_nombre order by source_year desc) filter (where docente_nombre is not null))[1] as docente_nombre,
        (array_agg(tipo_documento order by source_year desc) filter (where tipo_documento is not null))[1] as tipo_documento,
        (array_agg(genero order by source_year desc) filter (where genero is not null))[1] as genero,
        (array_agg(fecha_nacimiento order by source_year desc) filter (where fecha_nacimiento is not null and fecha_nacimiento <> ''))[1] as fecha_nacimiento,
        (array_agg(correo_electronico order by source_year desc) filter (where correo_electronico is not null))[1] as correo_electronico,
        (array_agg(telefono_celular order by source_year desc) filter (where telefono_celular is not null))[1] as telefono_celular
    from unioned_data
    where docente_id is not null
    group by docente_id
)

select * from deduplicated
