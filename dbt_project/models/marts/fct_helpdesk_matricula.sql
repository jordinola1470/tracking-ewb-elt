-- Gold · nivel del curso en que se matriculó cada docente, por año (listas de matrícula del helpdesk).
-- Una fila por docente y año. Lo usa consolidado_historico para el nivel de los retirados que no lo tienen
-- en la base (por ejemplo, los desertores de 2024).
select
    docente_id,
    anio_lectivo,
    min(nivel_matricula) as nivel_matricula
from {{ ref('stg_helpdesk_matricula') }}
where nivel_matricula is not null
group by docente_id, anio_lectivo
having count(distinct nivel_matricula) = 1
