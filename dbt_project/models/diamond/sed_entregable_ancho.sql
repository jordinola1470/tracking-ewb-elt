-- Entregable SED · versión ANCHA: una fila por persona formada (2023-2026), en el orden de columnas pedido.
-- Identificación: el último dato disponible (año más reciente con valor). En 2026, si el docente está en dos
-- programas, se conserva la última versión del participante: la fila de ewb_two o ewb_presencial, no la de ewb_plus.
-- Resumen: ES y nivel MCER de entrada = primera prueba de entrada registrada; de salida = última prueba de salida.
-- Por año: nivel cursado, estado al cierre y ES de salida; 'No aplica' si no participó ese año.
{% set anios = [2023, 2024, 2025, 2026] %}
with c as (
    select
        *,
        {{ prioridad_programa() }}                                    as prioridad,
        {{ orden_nivel('nivel_estandar') }}                           as orden
    from {{ ref('consolidado_historico') }}
    where docente_id is not null
),

-- Último dato disponible de cada campo de identificación
persona as (
    select
        docente_id,
        (array_agg(codigo_dane    order by anio_lectivo desc, prioridad) filter (where codigo_dane is not null))[1]    as dane,
        (array_agg(colegio_nombre order by anio_lectivo desc, prioridad) filter (where colegio_nombre is not null))[1] as ied,
        (array_agg(tipo_documento order by anio_lectivo desc, prioridad) filter (where tipo_documento is not null))[1] as tipo_documento,
        (array_agg(genero         order by anio_lectivo desc, prioridad) filter (where genero is not null))[1]         as sexo,
        (array_agg(cargo_estandar order by anio_lectivo desc, prioridad) filter (where cargo_estandar is not null))[1] as cargo,
        (array_agg(edad           order by anio_lectivo desc, prioridad) filter (where edad is not null))[1]           as edad,
        count(distinct anio_lectivo)                                                                                  as total_anios_participando
    from c
    group by docente_id
),

-- Primera prueba de entrada y última de salida (puntaje y nivel MCER de la misma prueba)
entrada as (
    select distinct on (docente_id) docente_id, score_entrada, mcer_entrada
    from c
    where {{ tiene_prueba('score_entrada', 'mcer_entrada') }}
    order by docente_id, anio_lectivo asc, prioridad desc
),

salida as (
    select distinct on (docente_id) docente_id, score_salida, mcer_salida
    from c
    where {{ tiene_prueba('score_salida', 'mcer_salida') }}
    order by docente_id, anio_lectivo desc, prioridad asc
),

-- Una fila por docente y año: en 2026 manda la que no es ewb_plus; luego la no retirada y la de nivel más alto
por_anio as (
    select distinct on (docente_id, anio_lectivo)
        docente_id,
        anio_lectivo,
        {{ nivel_cursado() }}                                         as nivel_cursado,
        {{ estado_finalizacion() }}                                   as estado_finalizacion,
        {{ puntaje_texto('score_salida') }}                           as es_salida
    from c
    order by docente_id, anio_lectivo, prioridad, retirado_segun_base, case when orden < 98 then orden end desc nulls last
),

pivote as (
    select
        docente_id
        {%- for a in anios %},
        coalesce(max(nivel_cursado)       filter (where anio_lectivo = {{ a }}), 'No aplica') as nivel_cursado_{{ a }},
        coalesce(max(estado_finalizacion) filter (where anio_lectivo = {{ a }}), 'No aplica') as estado_finalizacion_{{ a }},
        coalesce(max(es_salida)           filter (where anio_lectivo = {{ a }}), 'No aplica') as es_salida_{{ a }}
        {%- endfor %}
    from por_anio
    group by docente_id
)

select
    row_number() over (order by n.apellidos, n.nombres, p.docente_id)::int as no,
    p.dane,
    p.ied,
    p.tipo_documento,
    p.docente_id                                                      as numero_documento,
    n.nombres,
    n.apellidos,
    p.sexo,
    p.cargo,
    cast(p.edad as integer)                                           as edad,
    p.total_anios_participando::int                                   as total_anios_participando,
    {{ puntaje_texto('e.score_entrada') }}                            as es_entrada,
    {{ puntaje_texto('s.score_salida') }}                             as es_salida,
    coalesce({{ mcer_etiqueta('e.mcer_entrada') }}, 'Sin registro')   as nivel_mcer_entrada,
    coalesce({{ mcer_etiqueta('s.mcer_salida') }}, 'Sin registro')    as nivel_mcer_salida
    {%- for a in anios %},
    v.nivel_cursado_{{ a }},
    v.estado_finalizacion_{{ a }},
    v.es_salida_{{ a }}
    {%- endfor %},
    -- Control (no es parte del formato pedido): nombres y apellidos separados por posición
    n.nombre_aproximado
from persona p
join pivote v using (docente_id)
left join {{ ref('int_sed_nombres') }} n using (docente_id)
left join entrada e using (docente_id)
left join salida s using (docente_id)
