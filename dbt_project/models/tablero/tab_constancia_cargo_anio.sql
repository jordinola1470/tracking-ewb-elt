-- Tablero · una fila por año lectivo y cargo (cargo_estandar).
-- Componente: ana_graf_constancia_cargo
select
    anio_lectivo,
    coalesce(cargo_estandar, 'Sin dato')               as cargo,
    count(*)                                           as participaciones,
    count({{ tiene_constancia() }})                    as con_dato_constancia,
    round(avg({{ tiene_constancia() }})::numeric, 4)   as pct_constancia
from {{ ref('consolidado_historico') }}
group by anio_lectivo, cargo_estandar
