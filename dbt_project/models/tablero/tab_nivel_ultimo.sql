-- Tablero · distribución de toda la población de docentes según su último nivel cursado (corte actual).
-- Cálculo propio de este gráfico (no cambia la ficha de Perfiles): el nivel del año más reciente en que
-- el docente participó; los retirados cuentan con el nivel del curso del que se retiraron (helpdesk) y, si ese
-- año también tiene una fila activa, se usa la activa. "-" (sin nivel asignado) no cuenta como nivel cursado.
-- Componente: ana_graf_nivel_ultimo
with ultimo as (
    select
        docente_id,
        (array_agg(nivel_estandar order by anio_lectivo desc, {{ es_retirado() }} asc)
            filter (where nivel_estandar is not null and nivel_estandar <> '-'))[1] as nivel
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
