-- Tablero · docentes por cargo según su último nivel cursado hasta un año de corte (acumulado).
-- Para cada año de corte: docentes que participaron en algún año hasta el corte, cada uno con el último nivel
-- cursado hasta ese año (misma regla que tab_nivel_ultimo) y el último cargo registrado hasta ese año.
-- Comparar cortes muestra cómo se movió la distribución de niveles. Componente: ana_graf_nivel_cargo
with base as (
    select * from {{ ref('consolidado_historico') }}
    where docente_id is not null
),

cortes as (
    select distinct anio_lectivo as anio_corte from base
),

por_corte as (
    select
        c.anio_corte,
        b.docente_id,
        (array_agg(b.nivel_estandar order by b.anio_lectivo desc, {{ es_retirado('b.grupo_id') }} asc)
            filter (where b.nivel_estandar is not null and b.nivel_estandar <> '-'))[1] as nivel,
        (array_agg(b.cargo_rol order by b.anio_lectivo desc)  -- cargo: CARGO_ROL tal cual en la base
            filter (where b.cargo_rol is not null))[1]                              as cargo
    from cortes c
    join base b on b.anio_lectivo <= c.anio_corte
    group by c.anio_corte, b.docente_id
)

select
    anio_corte,
    coalesce(cargo, 'Sin dato')                       as cargo,
    coalesce(nivel, 'Sin nivel registrado')           as nivel,
    {{ orden_nivel("coalesce(nivel, 'Sin nivel registrado')") }} as orden_nivel,
    count(*)                                          as docentes
from por_corte
group by 1, 2, 3, 4
