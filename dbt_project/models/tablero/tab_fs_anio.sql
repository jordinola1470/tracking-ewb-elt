-- Fact sheet · una fila por año (secciones 1.2, 1.3, 2.3, 3.2, 5.3, 6.2, 6.4, 7.1 y 7.2).
-- Base: int_fs_docente_anio (una fila por docente y año). Componente: rep_fact_sheet
with d as (
    select * from {{ ref('int_fs_docente_anio') }}
),

primer as (
    select docente_id, min(anio_lectivo) as primer_anio from d group by docente_id
),

siguiente as (
    -- Mismo docente en el año siguiente (para retención y transición de nivel)
    select a.anio_lectivo, a.docente_id, a.orden_nivel as nivel_a, b.orden_nivel as nivel_b, b.docente_id is not null as continua
    from d a
    left join d b on b.docente_id = a.docente_id and b.anio_lectivo = a.anio_lectivo + 1
),

ultimo_anio as (select max(anio_lectivo) as anio from d),

ied_anio as (
    -- IED por año con TODAS las filas del año (igual que el tablero): si un docente aparece en dos IED
    -- el mismo año, cuentan las dos
    select anio_lectivo, count(distinct codigo_dane) as colegios
    from {{ ref('consolidado_historico') }}
    group by anio_lectivo
),

por_anio as (
    select
        d.anio_lectivo,
        count(*)                                                                          as docentes,
        count(distinct d.grupo_id)                                                        as grupos,
        count(*) filter (where p.primer_anio = d.anio_lectivo)                            as nuevos,
        count(*) filter (where p.primer_anio < d.anio_lectivo)                            as recurrentes,
        count(*) filter (where d.genero = 'Femenino')                                     as mujeres,
        count(*) filter (where d.genero = 'Masculino')                                    as hombres,
        count(*) filter (where d.genero is null)                                          as genero_sin_dato,
        -- MCER en el mismo año (entrada vs. salida)
        count(*) filter (where d.mcer_entrada_orden is not null and d.mcer_salida_orden is not null) as mcer_comparables,
        count(*) filter (where d.mcer_salida_orden > d.mcer_entrada_orden)                as mcer_mejoraron,
        count(*) filter (where d.mcer_salida_orden = d.mcer_entrada_orden)                as mcer_mantuvieron,
        count(*) filter (where d.mcer_salida_orden < d.mcer_entrada_orden)                as mcer_bajaron,
        -- Puntaje (score)
        count(*) filter (where d.score_entrada is not null and d.score_salida is not null) as score_comparables,
        round(avg(d.score_entrada) filter (where d.score_entrada is not null and d.score_salida is not null)::numeric, 1) as score_entrada_promedio,
        round(avg(d.score_salida)  filter (where d.score_entrada is not null and d.score_salida is not null)::numeric, 1) as score_salida_promedio,
        count(*) filter (where d.score_salida > d.score_entrada)                          as score_subieron,
        -- Constancias (el % es sobre quienes tienen el dato)
        coalesce(sum(d.constancia), 0)                                                    as con_constancia,
        count(d.constancia) - coalesce(sum(d.constancia), 0)                              as sin_constancia,
        round(avg(d.constancia)::numeric, 4)                                              as pct_constancia,
        -- Asistencia (sin contar retirados)
        round((avg(d.asistencia) filter (where not d.es_retirado))::numeric, 4)           as asistencia_promedio,
        -- Rangos de asistencia SIN contar retirados (igual que el promedio); los retirados van aparte
        count(*) filter (where not d.es_retirado and d.asistencia >= 0.80)                as asistencia_80_o_mas,
        count(*) filter (where not d.es_retirado and d.asistencia < 0.80)                 as asistencia_menos_80,
        count(*) filter (where not d.es_retirado and d.asistencia is null)                as asistencia_sin_dato,
        count(*) filter (where d.es_retirado)                                             as retirados
    from d
    join primer p using (docente_id)
    group by d.anio_lectivo
),

paso as (
    select
        s.anio_lectivo,
        count(*)                                                                          as base_retencion,
        count(*) filter (where s.continua)                                                as continuan,
        count(*) filter (where s.nivel_a is not null and s.nivel_b is not null)           as nivel_comparables,
        count(*) filter (where s.nivel_b > s.nivel_a)                                     as nivel_subieron,
        count(*) filter (where s.nivel_b = s.nivel_a)                                     as nivel_mismo,
        count(*) filter (where s.nivel_b < s.nivel_a)                                     as nivel_bajaron
    from siguiente s, ultimo_anio u
    where s.anio_lectivo < u.anio
    group by s.anio_lectivo
)

select
    a.*,
    i.colegios,
    round(a.mujeres::numeric / nullif(a.mujeres + a.hombres, 0), 4)                       as pct_mujeres,
    round(a.mcer_mejoraron::numeric / nullif(a.mcer_comparables, 0), 4)                   as pct_mcer_mejoraron,
    p.base_retencion, p.continuan,
    round(p.continuan::numeric / nullif(p.base_retencion, 0), 4)                          as pct_retencion,
    p.nivel_comparables, p.nivel_subieron, p.nivel_mismo, p.nivel_bajaron
from por_anio a
left join paso p using (anio_lectivo)
left join ied_anio i using (anio_lectivo)
