-- Gold · nivel del curso del que se retiró cada docente, por año (según las alertas del helpdesk).
-- Una fila por docente y año: el último retiro del año (fecha más reciente; si hay empate, la alerta
-- más arriba en el archivo, que viene de la más reciente a la más antigua).
-- Lo usa consolidado_historico para completar el nivel de los retirados que no lo tienen.
with retiros as (
    select
        docente_id, anio_lectivo, fecha_alerta, nivel_curso_antes,
        row_number() over (
            partition by docente_id, anio_lectivo
            order by fecha_alerta desc, fila asc
        ) as orden
    from {{ ref('stg_helpdesk_alertas') }}
    where es_retiro and nivel_curso_antes is not null
)

select
    docente_id,
    anio_lectivo,
    nivel_curso_antes as nivel_retiro,
    fecha_alerta      as fecha_retiro
from retiros
where orden = 1
