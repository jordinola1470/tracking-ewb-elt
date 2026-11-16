-- Tablero · una fila por docente (datos más recientes no vacíos y resumen de su historial).
-- Componentes: per_buscador, per_tabla_docentes, per_ficha_docente
with base as (
    select * from {{ ref('consolidado_historico') }}
    where docente_id is not null
),

niveles_anio as (
    -- Nivel de formación de cada año (si hubiera más de un registro en el año, se listan todos)
    select
        docente_id,
        anio_lectivo,
        string_agg(distinct coalesce(nivel_estandar, 'Sin dato'), ' / ') as niveles
    from base
    group by docente_id, anio_lectivo
),

resumen as (
    select
        docente_id,
        string_agg(anio_lectivo::text, ', ' order by anio_lectivo)                     as anios,
        string_agg(anio_lectivo || ': ' || niveles, ' · ' order by anio_lectivo)       as niveles_por_anio
    from niveles_anio
    group by docente_id
),

ultimo as (
    select
        docente_id,
        (array_agg(docente_nombre order by anio_lectivo desc) filter (where docente_nombre is not null))[1] as docente_nombre,
        (array_agg(genero         order by anio_lectivo desc) filter (where genero is not null))[1]         as genero,
        (array_agg(cargo_estandar order by anio_lectivo desc) filter (where cargo_estandar is not null))[1] as cargo,
        (array_agg(colegio_nombre order by anio_lectivo desc) filter (where colegio_nombre is not null))[1] as colegio,
        (array_agg(nivel_estandar order by anio_lectivo desc) filter (where nivel_estandar is not null))[1] as nivel_formacion_actual,
        round(avg(asistencia_porcentaje_fix)::numeric, 4)                                                  as asistencia_promedio
    from base
    group by docente_id
)

select
    u.docente_id,
    u.docente_nombre,
    u.genero,
    u.cargo,
    u.colegio,
    u.nivel_formacion_actual,
    r.anios,
    r.niveles_por_anio,
    p.permanencia,
    p.es_continuo,
    u.asistencia_promedio
from ultimo u
join resumen r using (docente_id)
join {{ ref('int_permanencia_docente') }} p using (docente_id)
