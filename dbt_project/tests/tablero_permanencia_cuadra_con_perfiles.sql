-- Coherencia: la suma de docentes por permanencia debe ser igual al número de perfiles.
-- Devuelve una fila si no cuadra (debe devolver 0 filas).
select 1
where (select sum(docentes) from {{ ref('tab_permanencia') }})
   <> (select count(*) from {{ ref('tab_perfiles') }})
