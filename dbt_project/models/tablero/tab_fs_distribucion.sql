-- Fact sheet · distribuciones en formato largo: (seccion, anio, categoria, orden, docentes, pct, extra).
-- Secciones: genero, genero_todos_los_anios, nivel_formacion, cargo_anio, permanencia_anios, trayectoria,
--            top_ied, nivel_cursado_anio, progresion_nivel, mcer_salida_anio, mejora_historica_mcer.
-- Solo conteos agregados (sin datos de personas). Componente: rep_fact_sheet
with d as (
    select * from {{ ref('int_fs_docente_anio') }}
),

total_anios as (select count(distinct anio_lectivo) as n from d),

docente as (
    -- Una fila por docente: datos del registro más reciente y años en que participó
    select
        docente_id,
        (array_agg(genero order by anio_lectivo desc) filter (where genero is not null))[1] as genero,
        (array_agg(nivel_formacion order by anio_lectivo desc) filter (where nivel_formacion is not null))[1] as nivel_formacion,
        count(*)                                                                         as anios_participados,
        string_agg(anio_lectivo::text, ' + ' order by anio_lectivo)                      as trayectoria,
        (array_agg(orden_nivel order by anio_lectivo asc)  filter (where orden_nivel is not null))[1] as nivel_primero,
        (array_agg(orden_nivel order by anio_lectivo desc) filter (where orden_nivel is not null))[1] as nivel_ultimo,
        count(orden_nivel)                                                               as anios_con_nivel,
        (array_agg(mcer_entrada_orden order by anio_lectivo asc)  filter (where mcer_entrada_orden is not null))[1] as mcer_primera_entrada,
        (array_agg(mcer_salida_orden  order by anio_lectivo desc) filter (where mcer_salida_orden  is not null))[1] as mcer_ultima_salida
    from d
    group by docente_id
),

filas as (
    -- 3.1 Género (participantes únicos, registro más reciente)
    select 'genero' as seccion, null::int as anio, coalesce(genero, 'Sin dato') as categoria, 0 as orden, count(*) as docentes, null::int as extra
    from docente group by 3

    -- 3.3 Género de quienes participaron todos los años
    union all
    select 'genero_todos_los_anios', null, coalesce(genero, 'Sin dato'), 0, count(*), null
    from docente, total_anios t where anios_participados = t.n group by 3

    -- 3.4 Nivel de formación (académico), con variantes de escritura unificadas
    union all
    select 'nivel_formacion', null,
        case
            when nivel_formacion is null or lower(trim(nivel_formacion)) in ('undefined', '', '-') then 'Sin dato'
            when lower(translate(trim(nivel_formacion), 'íÍ', 'iI')) in ('magister', 'maestria') then 'Magíster'
            when lower(translate(trim(nivel_formacion), 'óÓ', 'oO')) in ('especialista', 'especializacion') then 'Especialista'
            else initcap(lower(trim(nivel_formacion)))
        end, 0, count(*), null
    from docente group by 3

    -- 3.5 Cargo por año
    union all
    select 'cargo_anio', anio_lectivo, coalesce(cargo_estandar, 'Sin dato'), 0, count(*), null
    from d group by 2, 3

    -- 2.1 Docentes según años de participación
    union all
    select 'permanencia_anios', null, anios_participados || case when anios_participados = 1 then ' año' else ' años' end,
        anios_participados, count(*), null
    from docente group by anios_participados

    -- 2.2 Trayectorias exactas
    union all
    select 'trayectoria', null, trayectoria, 0, count(*), null
    from docente group by trayectoria

    -- 5.1 Nivel cursado por año
    union all
    select 'nivel_cursado_anio', anio_lectivo,
        coalesce(case when nivel_estandar = '-' then 'Sin nivel asignado' else nivel_estandar end, 'Sin dato'),
        {{ orden_nivel('nivel_estandar') }}, count(*), null
    from d group by 2, 3, 4

    -- 5.2 Progresión de nivel cursado: primer vs. último año (2 o más años con nivel)
    union all
    select 'progresion_nivel', null,
        case when nivel_ultimo > nivel_primero then 'Subió de nivel'
             when nivel_ultimo = nivel_primero then 'Mismo nivel'
             else 'Bajó de nivel' end,
        case when nivel_ultimo > nivel_primero then 1 when nivel_ultimo = nivel_primero then 2 else 3 end,
        count(*), null
    from docente where anios_con_nivel >= 2 group by 3, 4

    -- 6.1 MCER de salida por año
    union all
    select 'mcer_salida_anio', anio_lectivo,
        case mcer_salida_orden when 0 then 'PRE A1' when 1 then 'A1' when 2 then 'A2' when 3 then 'B1'
             when 4 then 'B2' when 5 then 'C1' else 'No evaluado' end,
        coalesce(mcer_salida_orden, 99), count(*), null
    from d group by 2, 3, 4

    -- 6.3 Mejora histórica: primer MCER de entrada vs. último MCER de salida
    union all
    select 'mejora_historica_mcer', null,
        case when mcer_ultima_salida > mcer_primera_entrada then 'Mejoró su nivel de inglés'
             when mcer_ultima_salida = mcer_primera_entrada then 'Mismo nivel'
             else 'Nivel inferior' end,
        case when mcer_ultima_salida > mcer_primera_entrada then 1 when mcer_ultima_salida = mcer_primera_entrada then 2 else 3 end,
        count(*), null
    from docente where mcer_primera_entrada is not null and mcer_ultima_salida is not null group by 3, 4
),

top_ied as (
    -- 4.1 Top 10 IED con más docentes (histórico); extra = años en que estuvo presente
    select 'top_ied' as seccion, null::int as anio, colegio as categoria,
        row_number() over (order by docentes desc, colegio)::int as orden, docentes, anios as extra
    from (
        select max(colegio_nombre) as colegio, count(distinct docente_id) as docentes, count(distinct anio_lectivo)::int as anios
        from d where codigo_dane is not null group by codigo_dane
    ) x
)

select seccion, anio, categoria, orden, docentes, extra,
    round(docentes::numeric / sum(docentes) over (partition by seccion, anio), 4) as pct
from (
    select * from filas
    union all
    select * from top_ied where orden <= 10
) t
