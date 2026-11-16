-- Tablero · una fila por grupo de permanencia (todos los años).
-- Componente: ana_graf_permanencia
select
    permanencia,
    anios_participados,
    es_continuo,
    count(*) as docentes
from {{ ref('int_permanencia_docente') }}
group by permanencia, anios_participados, es_continuo
