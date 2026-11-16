-- Tablero · una fila por año lectivo y nivel de formación (nivel_estandar = nivel del grupo asignado).
-- Componentes: ana_graf_pruebas_nivel, ana_graf_constancia_nivel, ana_graf_nivel_formacion
with base as (
    select
        *,
        {{ tiene_entrada() }} as te,
        {{ tiene_salida() }}  as ts
    from {{ ref('consolidado_historico') }}
)

select
    anio_lectivo,
    coalesce(nivel_estandar, 'Sin dato')                          as nivel_formacion,
    {{ orden_nivel('nivel_estandar') }}                           as orden_nivel,
    count(*)                                                      as matriculados,
    count(*) filter (where te and ts)                             as con_entrada_salida,
    count(*) filter (where te and not ts)                         as solo_entrada,
    count(*) filter (where not te)                                as sin_entrada,
    round((count(*) filter (where te and ts))::numeric / count(*), 4) as pct_entrada_salida,
    round(avg({{ tiene_constancia() }})::numeric, 4)              as pct_constancia
from base
group by anio_lectivo, nivel_estandar
