{{ config(
    materialized='table',
    schema='public'
) }}

with unioned as (

select
    docente_id,
    tipo_documento,
    docente_nombre,
    genero,
    fecha_nacimiento,
    correo_electronico,
    cast(2023 as integer) as anio_lectivo,
    nivel_formacion,
    codigo_dane,
    colegio_nombre,
    cargo_rol,
    grupo_id,
    nivel_asignado,
    asistencia_porcentaje as asistencia_porcentaje_fix,
    score_entrada,
    mcer_entrada,
    score_salida,
    mcer_salida,
    recibe_constancia
from {{ ref('stg_docentes_2023') }}

union all

select
    docente_id,
    tipo_documento,
    docente_nombre,
    genero,
    fecha_nacimiento,
    correo_electronico,
    cast(2024 as integer) as anio_lectivo,
    nivel_formacion,
    codigo_dane,
    colegio_nombre,
    cargo_rol,
    grupo_id,
    nivel_asignado,
    asistencia_porcentaje as asistencia_porcentaje_fix,
    score_entrada,
    mcer_entrada,
    score_salida,
    mcer_salida,
    recibe_constancia
from {{ ref('stg_docentes_2024') }}

union all

select
    docente_id,
    cast(null as varchar) as tipo_documento,
    docente_nombre,
    genero,
    fecha_nacimiento,
    correo_electronico,
    cast(2025 as integer) as anio_lectivo,
    nivel_formacion,
    codigo_dane,
    colegio_nombre,
    cargo_rol,
    grupo_id,
    nivel_asignado,
    asistencia_porcentaje as asistencia_porcentaje_fix,
    score_entrada,
    mcer_entrada,
    score_salida,
    mcer_salida,
    recibe_constancia
from {{ ref('stg_docentes_2025') }}

union all

select
    docente_id,
    tipo_documento,
    docente_nombre,
    genero,
    fecha_nacimiento,
    correo_electronico,
    cast(2026 as integer) as anio_lectivo,
    nivel_formacion,
    codigo_dane,
    colegio_nombre,
    cargo_rol,
    grupo_id,
    nivel_asignado,
    asistencia_porcentaje as asistencia_porcentaje_fix,
    score_entrada,
    mcer_entrada,
    score_salida,
    mcer_salida,
    recibe_constancia
from {{ ref('stg_docentes_2026') }}

)

select
    unioned.*,

    -- Regla Excel sobre nivel_asignado (comparaciones sin distinguir mayúsculas, como en Excel; los NULL se conservan; el trim se aplica en staging)
    case
        when lower(nivel_asignado) in ('entry - pre a1', 'entry - pre-a1') then 'PRE_A1'
        when lower(nivel_asignado) in ('fundamentals - a1', 'fundamentals 2 - a1.2') then 'A1'
        when lower(nivel_asignado) in (
            'evolution/specialist - b1/b2/c1', 'connections a - b1-', 'connections b - b1',
            'connections 4 - b1.4', 'connections 2 - b1.2'
        ) then 'B1'
        when lower(nivel_asignado) in ('progress - a2', 'progress 2 - a2.2') then 'A2'
        when lower(nivel_asignado) in ('evolution/specialist - b2/c1', 'evolution 2 - b2.2') then 'B2'
        when nivel_asignado in ('0', 'NULL') then '-'
        else nivel_asignado
    end as nivel_estandar,

    -- Regla Excel sobre cargo_rol
    case
        when cargo_rol in ('-', 'No') then 'S/N'
        when lower(cargo_rol) in (
            'coordinador(a)', 'coordinador(a) encargado(a)', 'rector(a)', 'rector(a) encargado(a)',
            'directivo docente', 'coordinador', 'rector institucion educativa completa', 'rector'
        ) then 'Directivo Docente'
        when lower(cargo_rol) in (
            'docente', 'docente orientadora', 'docente de aula', 'docente orientador',
            'docente con funciones de apoyo'
        ) then 'Docente de Aula'
        when lower(cargo_rol) = 'psicologa' then 'Otro'
        when lower(cargo_rol) = 'docente de primaria' then 'Docente de Primaria'
        when lower(cargo_rol) = 'docente de contenido' then 'Docente de Contenido'
        else cargo_rol
    end as cargo_estandar

from unioned
