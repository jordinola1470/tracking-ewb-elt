{{ config(materialized='ephemeral') }}
-- Intermedio (no se publica): permanencia de cada docente según los años en que participó.
-- Lo usan tab_permanencia y tab_perfiles, para que la regla esté en un solo lugar.
with por_docente as (
    select
        docente_id,
        count(distinct anio_lectivo)                       as anios_participados,
        max(anio_lectivo) - min(anio_lectivo) + 1          as rango_anios
    from {{ ref('consolidado_historico') }}
    where docente_id is not null
    group by docente_id
)

select
    docente_id,
    anios_participados,
    case
        when anios_participados = 1           then '1 año'
        when anios_participados = rango_anios then anios_participados || ' años seguidos'
        else                                       anios_participados || ' años no seguidos'
    end                                                    as permanencia,
    -- Continua = 2 o más años seguidos
    (anios_participados >= 2 and anios_participados = rango_anios) as es_continuo
from por_docente
