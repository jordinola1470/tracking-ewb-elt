-- Coherencia: en cada año, la suma de matriculados por nivel debe ser igual a las participaciones del año.
-- Devuelve los años que no cuadran (debe devolver 0 filas).
select k.anio_lectivo
from {{ ref('tab_kpis_anio') }} k
join (
    select anio_lectivo, sum(matriculados) as total
    from {{ ref('tab_pruebas_nivel_anio') }}
    group by anio_lectivo
) n using (anio_lectivo)
where k.participaciones <> n.total
