-- Tablero · una sola fila con totales de todos los años.
-- Componente: ana_graf_ied_atendidas (total de IED atendidas)
select
    count(distinct codigo_dane) as ied_total,
    count(distinct docente_id)  as docentes_total,
    count(*)                    as participaciones_total
from {{ ref('consolidado_historico') }}
