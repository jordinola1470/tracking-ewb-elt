
with source as (
    select * from {{ source('raw_tracking_ewb', 'base_docentes_2024') }}
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
        when cast(english_score_entrada_2024 as varchar) ~ '^[0-9]+(\.[0-9]+)?$' then cast(english_score_entrada_2024 as numeric)
        else null 
    end as score_entrada,
    trim(cast(nivel_mcer_entrada_2024 as varchar)) as mcer_entrada,
    
    case 
        when cast(english_score_salida_2024 as varchar) ~ '^[0-9]+(\.[0-9]+)?$' then cast(english_score_salida_2024 as numeric)
        else null 
    end as score_salida,
    trim(cast(nivel_mcer_salida_2024 as varchar)) as mcer_salida,
    
    case 
        -- Viene como texto con '%' (ej. '100.00%'); se normaliza a decimal 0-1 como 2023 y 2025
        when cast("de_participacion_ewb_2024" as varchar) ~ '^[0-9]+(\.[0-9]+)?%$' then round(cast(replace(cast("de_participacion_ewb_2024" as varchar), '%', '') as numeric) / 100, 4)
        else null 
    end as asistencia_porcentaje,
    {{ si_no('recibe_constancia') }} as recibe_constancia,

    -- ENTREGABLE SED (columnas nuevas de la base validada con la SED; NULL si el Excel no las trae)
    {% set src = source('raw_tracking_ewb', 'base_docentes_2024') %}
    cast({{ texto_opcional(src, 'edad') }} as numeric)            as edad,
    -- Nombres y apellidos por separado: se leen cuando la base los trae (NOMBRES, PRIMER y SEGUNDO APELLIDO)
    {{ nombre_propio(texto_opcional(src, 'nombres')) }}           as nombres,
    {{ nombre_propio("nullif(concat_ws(' ', " ~ texto_opcional(src, 'primer_apellido') ~ ", " ~ texto_opcional(src, 'segundo_apellido') ~ "), '')") }} as apellidos,
    cast(null as varchar)                                          as programa,
    cast(null as varchar)                                          as aprobado_sed,
    -- Retirado según la base: en 2024 la columna "2024 EWB" = 'Deserción'
    coalesce(lower({{ texto_opcional(src, '2024_ewb') }}) in ('deserción', 'desercion'), false) as retirado_segun_base

from source
