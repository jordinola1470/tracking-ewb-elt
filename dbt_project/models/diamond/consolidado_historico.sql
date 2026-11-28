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
    recibe_constancia,
    -- Versión 2 (entregable SED)
    edad, nombres, apellidos, programa, aprobado_sed, retirado_segun_base
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
    recibe_constancia,
    -- Versión 2 (entregable SED)
    edad, nombres, apellidos, programa, aprobado_sed, retirado_segun_base
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
    recibe_constancia,
    -- Versión 2 (entregable SED)
    edad, nombres, apellidos, programa, aprobado_sed, retirado_segun_base
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
    recibe_constancia,
    -- Versión 2 (entregable SED)
    edad, nombres, apellidos, programa, aprobado_sed, retirado_segun_base
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
        u.score_entrada, u.mcer_entrada, u.score_salida, u.mcer_salida, u.recibe_constancia,
        u.edad, u.nombres, u.apellidos, u.programa, u.aprobado_sed, u.retirado_segun_base
    from unioned u
    left join nombre_docente nd on nd.docente_id = u.docente_id
    left join ied_resuelta ir
        on ir.dane_original is not distinct from u.codigo_dane::text and ir.colegio_nombre is not distinct from u.colegio_nombre
),

paso1 as (
select
    base.*,
    hr.nivel_retiro as nivel_helpdesk_retiro,

    -- Regla Excel sobre nivel_asignado (comparaciones sin distinguir mayúsculas, como en Excel; los NULL se conservan; el trim se aplica en staging)
    -- Retirados sin nivel ('-', 'NULL', '0' o vacío): se completa con el nivel del curso del que se retiró
    -- según el helpdesk (fct_helpdesk_retiros). Sigue contando como retirado porque grupo_id no cambia.
    case
        when {{ es_retirado('base.grupo_id') }} and hr.nivel_retiro is not null
            and (nivel_asignado is null or nivel_asignado in ('0', 'NULL', '-', '')) then hr.nivel_retiro
        -- Retirados o desertores sin nivel y sin alerta de retiro: nivel del curso en que se matricularon según la
        -- lista de matrícula del helpdesk (fct_helpdesk_matricula; p. ej., desertores de 2024)
        when ({{ es_retirado('base.grupo_id') }} or base.retirado_segun_base) and hm.nivel_matricula is not null
            and (nivel_asignado is null or nivel_asignado in ('0', 'NULL', '-', '')) then hm.nivel_matricula
        -- Eximidos que ya acreditan el nivel (grupo "Eximido C1"): toman el nivel del nombre del grupo
        when substring(upper(base.grupo_id) from '^EXIMID[OA]S?\s+([ABC][12]\+?)\s*$') is not null
            and (nivel_asignado is null or nivel_asignado in ('0', 'NULL', '-', ''))
            then substring(upper(base.grupo_id) from '^EXIMID[OA]S?\s+([ABC][12]\+?)\s*$')
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

    -- Regla sobre cargo_rol (sin distinguir mayúsculas ni tildes). Unifica la nomenclatura original de las bases
    -- ("Docente primaria", "Docente contenido", "Directivo docente") con la de la SED ("Docente de aula",
    -- "Coordinador", "Rector…") en 7 categorías.
    case
        when cargo_rol in ('-', 'No') then 'S/N'
        when lower(cargo_rol) in (
            'coordinador(a)', 'coordinador(a) encargado(a)', 'rector(a)', 'rector(a) encargado(a)',
            'directivo docente', 'coordinador', 'coordinadora', 'rector institucion educativa completa', 'rector'
        ) then 'Directivo Docente'
        when lower(cargo_rol) in (
            'docente', 'docente orientadora', 'docente de aula', 'docente orientador',
            'docente con funciones de apoyo'
        ) then 'Docente de Aula'
        when lower(cargo_rol) = 'psicologa' then 'Otro'
        when lower(cargo_rol) in ('docente de primaria', 'docente primaria') then 'Docente de Primaria'
        when lower(cargo_rol) in ('docente de contenido', 'docente contenido') then 'Docente de Contenido'
        when lower(translate(cargo_rol, 'éÉ', 'eE')) = 'docente de ingles' then 'Docente de Inglés'
        when lower(cargo_rol) = 'docente de preescolar' then 'Docente de Preescolar'
        else cargo_rol
    end as cargo_estandar

from base
left join {{ ref('fct_helpdesk_retiros') }} hr
    on hr.docente_id = base.docente_id and hr.anio_lectivo = base.anio_lectivo
left join {{ ref('fct_helpdesk_matricula') }} hm
    on hm.docente_id = base.docente_id and hm.anio_lectivo = base.anio_lectivo
),

-- Docentes en más de un programa el mismo año (2026: ewb_plus, ewb_two, ewb_presencial): nivel válido de su OTRO programa.
-- Si se retiró (o quedó sin nivel) en un programa pero sigue en otro, su nivel final es el del otro programa.
otro_programa as (
    select p.docente_id, p.anio_lectivo, p.programa,
        (array_agg(o.nivel_estandar order by {{ orden_nivel('o.nivel_estandar') }} desc))[1] as nivel_otro_programa
    from paso1 p
    join paso1 o
        on o.docente_id = p.docente_id and o.anio_lectivo = p.anio_lectivo
        and o.programa is distinct from p.programa
        and {{ orden_nivel('o.nivel_estandar') }} between 1 and 8
    group by 1, 2, 3
)

select
    p.docente_id, p.tipo_documento, p.docente_nombre, p.genero, p.fecha_nacimiento, p.correo_electronico, p.anio_lectivo,
    p.nivel_formacion, p.codigo_dane, p.colegio_nombre, p.cargo_rol, p.grupo_id, p.nivel_asignado, p.asistencia_porcentaje_fix,
    p.score_entrada, p.mcer_entrada, p.score_salida, p.mcer_salida, p.recibe_constancia,
    p.edad, p.nombres, p.apellidos, p.programa, p.aprobado_sed, p.retirado_segun_base,
    -- Nivel final de las filas sin nivel en la base ("-", vacío, "0", "NULL"), en este orden:
    --  1) el nivel de su otro programa del mismo año (2026: se movió de programa);
    --  2) el curso del que se retiró según el helpdesk, aunque el grupo de la base no diga "Retirados";
    --  3) la regla anterior (paso1: helpdesk de retiro de los retirados, matrícula, eximidos, cursos de 2023).
    -- Si nada aplica, queda "-": son los retiros sin otro programa y sin helpdesk (hay que pedir su curso inicial).
    case
        when (p.nivel_asignado is null or p.nivel_asignado in ('0', 'NULL', '-', '')) and op.nivel_otro_programa is not null
            then op.nivel_otro_programa
        when (p.nivel_estandar is null or p.nivel_estandar in ('-', '')) and p.nivel_helpdesk_retiro is not null
            then p.nivel_helpdesk_retiro
        else p.nivel_estandar
    end as nivel_estandar,
    p.cargo_estandar
from paso1 p
left join otro_programa op
    on op.docente_id = p.docente_id and op.anio_lectivo = p.anio_lectivo and op.programa is not distinct from p.programa
