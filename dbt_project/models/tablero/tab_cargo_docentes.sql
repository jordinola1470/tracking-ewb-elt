-- Tablero · docentes por cargo (todos los años). El cargo de cada docente es el último registrado (tab_perfiles).
-- Componente: ana_graf_cargo_docentes
select
    coalesce(cargo, 'Sin dato') as cargo,
    count(*)                    as docentes
from {{ ref('tab_perfiles') }}
group by 1
