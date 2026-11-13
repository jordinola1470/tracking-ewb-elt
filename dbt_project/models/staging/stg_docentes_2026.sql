with source as (
    select * from {{ source('raw_tracking_ewb', 'base_docentes_2026') }}
)

select
    -- DOCENTE
    trim(cast(docente_id as varchar)) as docente_id,
    -- 2026 trae nombres y apellidos por separado
    nullif(trim(concat_ws(' ', trim(cast(nombres as varchar)), trim(cast(apellidos as varchar)))), '') as docente_nombre,
    -- 2026 viene como 'CC - CEDULA DE CIUDADANIA'; se deja solo el código (CC, CE...) como en 2023/2024
    trim(split_part(cast(tipo_documento as varchar), ' - ', 1)) as tipo_documento,
    cast(null as varchar) as genero,
    cast(null as varchar) as fecha_nacimiento,
    trim(cast(correo_electronico as varchar)) as correo_electronico,
    trim(cast(telefono_celular as varchar)) as telefono_celular,

    -- IED
    trim(cast(colegio_nombre as varchar)) as colegio_nombre,
    trim(cast(codigo_dane as varchar)) as codigo_dane,
    cast(null as varchar) as ubicacion_geo,

    -- PERFIL
    trim(cast(nivel_formacion as varchar)) as nivel_formacion,
    trim(cast(cargo_rol as varchar)) as cargo_rol,
    trim(cast(tipo_nombramiento as varchar)) as tipo_nombramiento,
    cast(null as varchar) as jornada_laboral,
    cast(null as varchar) as grado_dicta,

    -- CURSO
    trim(cast(grupo_id as varchar)) as grupo_id,
    trim(cast(nivel_asignado as varchar)) as nivel_asignado,

    -- METRICAS / HECHOS
    -- Las columnas de entrada 2026 traen contenido mezclado (niveles, puntajes y estados como 'Pendiente'):
    -- el puntaje es el valor numérico de cualquiera de las dos y el MCER es el valor con forma de nivel.
    case
        when trim(cast(nivel_mcer_entrada_2026 as varchar)) ~ '^[0-9]+(\.[0-9]+)?$' then cast(trim(cast(nivel_mcer_entrada_2026 as varchar)) as numeric)
        when trim(cast(english_score_entrada_2026 as varchar)) ~ '^[0-9]+(\.[0-9]+)?$' then cast(trim(cast(english_score_entrada_2026 as varchar)) as numeric)
        else null
    end as score_entrada,
    case
        when upper(trim(cast(nivel_mcer_entrada_2026 as varchar))) ~ '^(PRE[ -]*A1|[ABC][12]\+?)$' then trim(cast(nivel_mcer_entrada_2026 as varchar))
        when upper(trim(cast(english_score_entrada_2026 as varchar))) ~ '^(PRE[ -]*A1|[ABC][12]\+?)$' then trim(cast(english_score_entrada_2026 as varchar))
        else null
    end as mcer_entrada,

    -- La salida 2026 aún no existe
    cast(null as numeric) as score_salida,
    cast(null as varchar) as mcer_salida,

    case
        when cast(porcentaje_final as varchar) ~ '^[0-9]+(\.[0-9]+)?$' then cast(porcentaje_final as numeric)
        else null
    end as asistencia_porcentaje,
    cast(null as varchar) as recibe_constancia

from source
