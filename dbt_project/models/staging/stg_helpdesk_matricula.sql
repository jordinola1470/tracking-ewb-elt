-- Listas de matrícula del helpdesk (raw.helpdesk_matricula, desde data/helpdesk_data/helpdesk_<año>_*.xlsx).
-- Una fila por docente, año y archivo, con el nivel del curso en que se matriculó.
-- El nivel viene en la columna NIVEL INICIAL (2023) o se deduce del nombre del curso (2024: Entry, Fundamentals 2…).
-- Si la tabla raw no existe, el modelo queda vacío.
{%- set matricula = adapter.get_relation(database=target.database, schema='raw', identifier='helpdesk_matricula') %}

with source as (
{%- if matricula %}
    select archivo, anio_lectivo, docente_id, grupo, curso, nivel
    from {{ matricula }}
{%- else %}
    select null::text as archivo, null::bigint as anio_lectivo, null::text as docente_id,
        null::text as grupo, null::text as curso, null::text as nivel
    where false
{%- endif %}
),

limpio as (
    select
        trim(archivo)                                   as archivo,
        cast(anio_lectivo as integer)                   as anio_lectivo,
        trim(cast(docente_id as varchar))               as docente_id,
        {{ limpiar_espacios('grupo') }}                 as grupo,
        {{ limpiar_espacios('curso') }}                 as curso,
        upper({{ limpiar_espacios('nivel') }})          as nivel_texto
    from source
    where nullif(trim(cast(docente_id as varchar)), '') is not null
)

select
    archivo,
    anio_lectivo,
    docente_id,
    grupo,
    curso,
    case
        when nivel_texto in ('PRE_A1', 'A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'C1') then nivel_texto
        else {{ nivel_de_curso('curso') }}
    end as nivel_matricula
from limpio
