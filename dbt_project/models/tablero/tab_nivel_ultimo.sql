-- Tablero · distribución de toda la población de docentes según su último nivel cursado (corte actual).
-- Cálculo propio de este gráfico (no cambia la ficha de Perfiles): el nivel del año más reciente en que
-- el docente participó sin retirarse; "-" (sin nivel asignado) no cuenta como nivel cursado.
-- Componente: ana_graf_nivel_ultimo
with ultimo as (
    select
        docente_id,
        (array_agg(nivel_estandar order by anio_lectivo desc)
            filter (where nivel_estandar is not null and nivel_estandar <> '-' and not {{ es_retirado() }}))[1] as nivel
    from {{ ref('consolidado_historico') }}
    where docente_id is not null
    group by docente_id
),

poblacion as (
    select coalesce(nivel, 'Sin nivel registrado') as nivel from ultimo
)

select
    nivel,
    {{ orden_nivel('nivel') }}                                        as orden_nivel,
    count(*)                                                          as docentes,
    round(count(*)::numeric / sum(count(*)) over (), 4)               as pct_docentes
from poblacion
group by nivel
