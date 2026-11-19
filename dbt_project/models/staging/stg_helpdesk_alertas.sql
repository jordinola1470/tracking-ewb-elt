-- Alertas de movimientos del helpdesk (raw.helpdesk_alertas, cargada desde data/helpdesk_data/).
-- Una fila por alerta, sin duplicados exactos. Solo documento, grupos y fecha (sin nombres ni correos).
-- Si la tabla raw no existe (p. ej., un entorno sin la carga del helpdesk), el modelo queda vacío.
{%- set alertas = adapter.get_relation(database=target.database, schema='raw', identifier='helpdesk_alertas') %}

with source as (
{%- if alertas %}
    select archivo, fila, docente_id, grupo_antes, grupo_despues, fecha_alerta
    from {{ alertas }}
{%- else %}
    select null::text as archivo, null::bigint as fila, null::text as docente_id,
        null::text as grupo_antes, null::text as grupo_despues, null::text as fecha_alerta
    where false
{%- endif %}
),

limpio as (
    select
        trim(archivo)                                     as archivo,
        cast(fila as integer)                             as fila,
        trim(cast(docente_id as varchar))                 as docente_id,
        {{ limpiar_espacios('grupo_antes') }}             as grupo_antes,
        {{ limpiar_espacios('grupo_despues') }}           as grupo_despues,
        cast(left(trim(fecha_alerta), 10) as date)        as fecha_alerta
    from source
    where nullif(trim(docente_id), '') is not null
)

select
    min(archivo)                                          as archivo,
    min(fila)                                             as fila,
    docente_id,
    grupo_antes,
    grupo_despues,
    fecha_alerta,
    cast(extract(year from fecha_alerta) as integer)      as anio_lectivo,
    coalesce(grupo_despues ilike 'retirados%', false)
        and not coalesce(grupo_antes ilike 'retirados%', false) as es_retiro,
    -- Nivel del curso: último tramo del código de grupo (BAQ26PLUS-G08-SA08-A2 -> A2)
    substring(upper(grupo_antes) from '-\s*(PRE_A1|A1\+?|A2\+?|B1\+?|B2\+?|C1\+?)\s*$') as nivel_curso_antes
from limpio
group by docente_id, grupo_antes, grupo_despues, fecha_alerta
