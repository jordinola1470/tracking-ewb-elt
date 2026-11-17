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

),

-- ── Estandarización entre años ────────────────────────────────────────────────
-- Un solo nombre por docente: el del año más reciente (ya con formato "María del Carmen Pérez")
nombre_docente as (
    select docente_id,
        (array_agg(docente_nombre order by anio_lectivo desc) filter (where docente_nombre is not null))[1] as nombre_unico
    from unioned
    where docente_id is not null
    group by docente_id
),

-- Nombre oficial de la IED según la lista oficial (raw.referencia_ied, cargada desde data/referencia_ied/).
-- 1) Si el nombre de la fila coincide con una IED oficial (igual, o contenido en un solo nombre oficial),
--    se usa esa IED: corrige filas con el DANE equivocado.
-- 2) Si no, se usa el nombre oficial de su DANE.  3) Si el DANE no está en la lista: el nombre tal cual en 2023
--    (si no aparece en 2023, el nombre estandarizado).
{%- set ref_ied = adapter.get_relation(database=target.database, schema='raw', identifier='referencia_ied') %}
referencia as (
{%- if ref_ied %}
    select codigo_dane::text as codigo_dane, colegio_oficial, {{ clave_ied('colegio_oficial') }} as clave
    from {{ ref_ied }}
{%- else %}
    select null::text as codigo_dane, null::text as colegio_oficial, null::text as clave where false
{%- endif %}
),

pares as (
    select distinct codigo_dane::text as dane_original, colegio_nombre, {{ clave_ied('colegio_nombre') }} as clave
    from unioned
),

coincide_exacta as (
    select p.dane_original, p.colegio_nombre, r.codigo_dane, r.colegio_oficial
    from pares p join referencia r on r.clave = p.clave
),

coincide_parcial as (
    select p.dane_original, p.colegio_nombre, min(r.codigo_dane) as codigo_dane, min(r.colegio_oficial) as colegio_oficial
    from pares p
    join referencia r on length(p.clave) >= 6 and position(' ' || p.clave || ' ' in ' ' || r.clave || ' ') > 0
    group by p.dane_original, p.colegio_nombre
    having count(*) = 1
),

-- Fuera de la lista oficial: el nombre tal cual aparece en 2023 (texto original del Excel)
nombre_2023 as (
    select trim(cast(codigo_dane as varchar)) as codigo_dane,
        min({{ limpiar_espacios('colegio_nombre') }}) as colegio_2023
    from {{ source('raw_tracking_ewb', 'base_docentes_2023') }}
    where codigo_dane is not null
    group by 1
),

ied_resuelta as (
    select p.dane_original, p.colegio_nombre,
        coalesce(e.codigo_dane, pa.codigo_dane, rd.codigo_dane, p.dane_original)          as codigo_dane_final,
        coalesce(e.colegio_oficial, pa.colegio_oficial, rd.colegio_oficial, n23.colegio_2023, p.colegio_nombre) as colegio_final
    from pares p
    left join coincide_exacta e
        on e.dane_original is not distinct from p.dane_original and e.colegio_nombre is not distinct from p.colegio_nombre
    left join coincide_parcial pa
        on pa.dane_original is not distinct from p.dane_original and pa.colegio_nombre is not distinct from p.colegio_nombre
    left join referencia rd on rd.codigo_dane = p.dane_original
    left join nombre_2023 n23 on n23.codigo_dane = p.dane_original
),

base as (
    select
        u.docente_id, u.tipo_documento,
        coalesce(nd.nombre_unico, u.docente_nombre) as docente_nombre,
        u.genero, u.fecha_nacimiento, u.correo_electronico, u.anio_lectivo, u.nivel_formacion,
        ir.codigo_dane_final as codigo_dane,
        ir.colegio_final as colegio_nombre,
        u.cargo_rol, u.grupo_id, u.nivel_asignado, u.asistencia_porcentaje_fix,
        u.score_entrada, u.mcer_entrada, u.score_salida, u.mcer_salida, u.recibe_constancia
    from unioned u
    left join nombre_docente nd on nd.docente_id = u.docente_id
    left join ied_resuelta ir
        on ir.dane_original is not distinct from u.codigo_dane::text and ir.colegio_nombre is not distinct from u.colegio_nombre
)

select
    base.*,

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

from base
