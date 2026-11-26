
with source as (
    select * from {{ source('raw_tracking_ewb', 'base_docentes_2023') }}
)

select
    -- DOCENTE
    trim(cast(docente_id as varchar)) as docente_id,
    {{ nombre_propio('docente_nombre') }} as docente_nombre,
    trim(cast(tipo_documento as varchar)) as tipo_documento,
    trim(cast(genero as varchar)) as genero,
    trim(cast(fecha_nacimiento as varchar)) as fecha_nacimiento,
    {{ correo('correo_electronico') }} as correo_electronico,
    trim(cast(telefono_celular as varchar)) as telefono_celular,

    -- IED
    {{ nombre_ied('colegio_nombre') }} as colegio_nombre,
    trim(cast(codigo_dane as varchar)) as codigo_dane,

    -- PERFIL
    trim(cast(nivel_formacion as varchar)) as nivel_formacion,
    trim(cast(cargo_rol as varchar)) as cargo_rol,
    trim(cast(tipo_nombramiento as varchar)) as tipo_nombramiento,
    trim(cast(jornada_laboral as varchar)) as jornada_laboral,
    
    -- CURSO
    trim(cast(nivel_asignado as varchar)) as nivel_asignado,
    trim(cast(grupo_id as varchar)) as grupo_id,
    trim(cast(rt_remoto as varchar)) as rt_remoto,

    -- METRICAS / HECHOS
    case 
        when cast(english_score_entrada_2023 as varchar) ~ '^[0-9]+(\.[0-9]+)?$' then cast(english_score_entrada_2023 as numeric)
        else null 
    end as score_entrada,
    trim(cast(nivel_mcer_entrada_2023 as varchar)) as mcer_entrada,
    
    case 
        when cast(english_score_salida_2023 as varchar) ~ '^[0-9]+(\.[0-9]+)?$' then cast(english_score_salida_2023 as numeric)
        else null 
    end as score_salida,
    trim(cast(nivel_mcer_salida_2023 as varchar)) as mcer_salida,
    
    case 
        when cast(de_asistencia as varchar) ~ '^[0-9]+(\.[0-9]+)?$' then cast(de_asistencia as numeric)
        else null 
    end as asistencia_porcentaje,
    {{ si_no('recibe_constancia') }} as recibe_constancia,

    -- ENTREGABLE SED (columnas nuevas de la base validada con la SED; NULL si el Excel no las trae)
    {% set src = source('raw_tracking_ewb', 'base_docentes_2023') %}
    cast({{ texto_opcional(src, 'edad') }} as numeric)            as edad,
    cast(null as varchar)                                          as nombres,
    cast(null as varchar)                                          as apellidos,
    cast(null as varchar)                                          as programa,
    cast(null as varchar)                                          as aprobado_sed,
    -- Retirado según la base: en 2023 la columna ESTADO = 'RETIRADO'
    coalesce(upper({{ texto_opcional(src, 'estado') }}) = 'RETIRADO', false) as retirado_segun_base

from source
