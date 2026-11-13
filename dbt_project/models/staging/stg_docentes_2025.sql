
with source as (
    select * from {{ source('raw_tracking_ewb', 'base_docentes_2025') }}
)

select
    -- DOCENTE
    trim(cast(docente_id as varchar)) as docente_id,
    trim(cast(docente_nombre as varchar)) as docente_nombre,
    trim(cast(genero as varchar)) as genero,
    trim(cast(fecha_nacimiento as varchar)) as fecha_nacimiento,
    trim(cast(correo_electronico as varchar)) as correo_electronico,
    trim(cast(telefono_celular as varchar)) as telefono_celular,

    -- IED
    trim(cast(colegio_nombre as varchar)) as colegio_nombre,
    trim(cast(codigo_dane as varchar)) as codigo_dane,
    trim(cast(ubicacion_geo as varchar)) as ubicacion_geo,

    -- PERFIL
    trim(cast(nivel_formacion as varchar)) as nivel_formacion,
    trim(cast(cargo_rol as varchar)) as cargo_rol,
    trim(cast(tipo_nombramiento as varchar)) as tipo_nombramiento,
    trim(cast(jornada_laboral as varchar)) as jornada_laboral,
    trim(cast(grado_dicta as varchar)) as grado_dicta,

    -- CURSO
    trim(cast(grupo_id as varchar)) as grupo_id,
    trim(cast(nivel_asignado as varchar)) as nivel_asignado,

    -- METRICAS / HECHOS
    case 
        when cast(english_score_entrada_2025 as varchar) ~ '^[0-9]+(\.[0-9]+)?$' then cast(english_score_entrada_2025 as numeric)
        else null 
    end as score_entrada,
    trim(cast(nivel_mcer_entrada_2025 as varchar)) as mcer_entrada,
    
    case 
        when cast(english_score_salida_2025 as varchar) ~ '^[0-9]+(\.[0-9]+)?$' then cast(english_score_salida_2025 as numeric)
        else null 
    end as score_salida,
    trim(cast(nivel_mcer_salida_2025 as varchar)) as mcer_salida,
    
    case 
        when cast(porcentaje_final as varchar) ~ '^[0-9]+(\.[0-9]+)?$' then cast(porcentaje_final as numeric)
        else null 
    end as asistencia_porcentaje,
    trim(cast(recibe_constancia as varchar)) as recibe_constancia

from source
