-- Tablero · una fila por año lectivo.
-- Componentes: ana_filtro_anio, ana_texto_resumen, ana_kpi_participaciones, ana_kpi_docentes_unicos,
--              ana_kpi_entrada_salida, ana_kpi_constancia, ana_kpi_asistencia, ana_graf_constancia_anio
with base as (
    select * from {{ ref('consolidado_historico') }}
)

select
    anio_lectivo,
    count(*)                                                                    as participaciones,
    count(distinct docente_id)                                                  as docentes_unicos,
    count(*) filter (where {{ tiene_entrada() }} and {{ tiene_salida() }})      as con_entrada_salida,
    sum({{ tiene_constancia() }})                                               as con_constancia,
    count({{ tiene_constancia() }})                                             as con_dato_constancia,
    -- Sin constancia = tienen el dato y es "No" (para la barra apilada de constancia por año)
    count({{ tiene_constancia() }}) - coalesce(sum({{ tiene_constancia() }}), 0) as sin_constancia,
    -- % sobre quienes tienen el dato de constancia (vacío si el año aún no lo trae)
    round(avg({{ tiene_constancia() }})::numeric, 4)                            as pct_constancia,
    -- Asistencia promedio sin contar retirados (escala 0-1)
    round((avg(asistencia_porcentaje_fix) filter (where not {{ es_retirado() }}))::numeric, 4) as asistencia_promedio,
    count(*) filter (where {{ es_retirado() }})                                 as retirados
from base
group by anio_lectivo
