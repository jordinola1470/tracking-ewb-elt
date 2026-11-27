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
        -- Último nivel de formación: el del año más reciente. Los retirados cuentan con el nivel del curso
        -- del que se retiraron (helpdesk); si ese año también tiene una fila activa, se usa la activa.
        (array_agg(nivel_estandar order by anio_lectivo desc, {{ es_retirado() }} asc)
            filter (where nivel_estandar is not null and (not {{ es_retirado() }} or nivel_estandar <> '-')))[1] as ultimo_nivel_formacion,
        -- Nivel MCER (tal cual viene en la base): el de la primera prueba de entrada con nivel y el de la
        -- última prueba de salida con nivel
        (array_agg(nullif(trim(mcer_entrada), '') order by anio_lectivo asc)
            filter (where {{ orden_mcer('mcer_entrada') }} is not null))[1]                              as mcer_entrada,
        (array_agg(nullif(trim(mcer_salida), '') order by anio_lectivo desc)
            filter (where {{ orden_mcer('mcer_salida') }} is not null))[1]                               as mcer_salida,
        -- Asistencia de la última participación sin retirarse (no es un promedio)
        (array_agg(asistencia_porcentaje_fix order by anio_lectivo desc)
            filter (where nivel_estandar is not null and not {{ es_retirado() }}))[1]                      as asistencia
    from base
    group by docente_id
)

select
    u.docente_id,
    u.docente_nombre,
    u.genero,
    u.cargo,
    u.colegio,
    u.ultimo_nivel_formacion,
    u.mcer_entrada,
    u.mcer_salida,
    r.anios,
    r.niveles_por_anio,
    p.permanencia,
    p.es_continuo,
    u.asistencia
from ultimo u
join resumen r using (docente_id)
join {{ ref('int_permanencia_docente') }} p using (docente_id)
