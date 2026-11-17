-- Fact sheet · una fila por docente y año (si el Excel lo trae dos veces, se prefiere la fila no retirada
-- y luego la de nivel más alto). Base de todos los cálculos del fact sheet. Solo uso interno (no lo lee el tablero).
select distinct on (docente_id, anio_lectivo)
    docente_id,
    anio_lectivo,
    codigo_dane,
    colegio_nombre,
    grupo_id,
    genero,
    nivel_formacion,
    cargo_estandar,
    nivel_estandar,
    case when {{ orden_nivel('nivel_estandar') }} < 98 then {{ orden_nivel('nivel_estandar') }} end as orden_nivel,
    {{ es_retirado() }}                                   as es_retirado,
    {{ orden_mcer('mcer_entrada') }}                      as mcer_entrada_orden,
    {{ orden_mcer('mcer_salida') }}                       as mcer_salida_orden,
    mcer_salida,
    score_entrada,
    score_salida,
    {{ tiene_constancia() }}                              as constancia,
    asistencia_porcentaje_fix                             as asistencia
from {{ ref('consolidado_historico') }}
where docente_id is not null
order by docente_id, anio_lectivo, {{ es_retirado() }} asc,
    case when {{ orden_nivel('nivel_estandar') }} < 98 then {{ orden_nivel('nivel_estandar') }} else -1 end desc
