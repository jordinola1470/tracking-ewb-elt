with mcer_levels as (
    -- PRE_A1 usa id 0 para no desplazar los ids existentes (trazabilidad_historica filtra mcer_id >= 2)
    select 0 as mcer_id, 'PRE_A1' as nivel_mcer union all
    select 1 as mcer_id, 'A1' as nivel_mcer union all
    select 2 as mcer_id, 'A2' as nivel_mcer union all
    select 3 as mcer_id, 'B1' as nivel_mcer union all
    select 4 as mcer_id, 'B2' as nivel_mcer union all
    select 5 as mcer_id, 'C1' as nivel_mcer union all
    select 6 as mcer_id, 'C2' as nivel_mcer
)

select * from mcer_levels
