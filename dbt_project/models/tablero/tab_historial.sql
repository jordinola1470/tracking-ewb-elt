-- Tablero · una fila por participación (docente y año), para la ficha del docente.
-- Componente: per_tabla_historial
select
    docente_id,
    anio_lectivo,
    grupo_id                                                       as grupo,
    coalesce(nivel_estandar, 'Sin dato')                           as nivel_formacion,
    {{ orden_nivel('nivel_estandar') }}                            as orden_nivel,
    case when {{ tiene_entrada() }} then 'Sí' else 'No' end        as prueba_entrada,
    case when {{ tiene_salida() }}  then 'Sí' else 'No' end        as prueba_salida,
    case {{ tiene_constancia() }} when 1 then 'Sí' when 0 then 'No' else 'Sin dato' end as constancia,
    asistencia_porcentaje_fix                                      as asistencia,
    -- Nivel MCER de las pruebas de entrada y salida del año, tal cual viene en la base (sin puntaje)
    nullif(trim(mcer_entrada), '')                                 as mcer_entrada,
    nullif(trim(mcer_salida), '')                                  as mcer_salida,
    {{ es_retirado() }}                                            as es_retirado
from {{ ref('consolidado_historico') }}
where docente_id is not null
