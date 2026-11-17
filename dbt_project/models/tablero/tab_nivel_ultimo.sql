-- Tablero · distribución de toda la población de docentes según su último nivel cursado (corte actual).
-- El último nivel es el del año más reciente en que participó sin retirarse (ver tab_perfiles).
-- Componente: ana_graf_nivel_ultimo
with perfiles as (
    select coalesce(ultimo_nivel_formacion, 'Sin nivel registrado') as nivel
    from {{ ref('tab_perfiles') }}
)

select
    nivel,
    {{ orden_nivel('nivel') }}                                        as orden_nivel,
    count(*)                                                          as docentes,
    round(count(*)::numeric / sum(count(*)) over (), 4)               as pct_docentes
from perfiles
group by nivel
