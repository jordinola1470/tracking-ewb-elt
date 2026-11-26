-- Entregable SED · versión LARGA: una fila por participación (docente y año), igual que consolidado_historico.
-- Conserva todas las filas, también las dos de los docentes de 2026 que están en dos programas.
-- Los datos son los de cada año; nombres y apellidos son los del docente (int_sed_nombres).
with c as (
    select * from {{ ref('consolidado_historico') }}
    where docente_id is not null
)

select
    row_number() over (order by c.anio_lectivo, n.apellidos, n.nombres, c.docente_id, c.programa)::int as no,
    c.anio_lectivo                                                   as anio,
    c.programa,
    c.codigo_dane                                                    as dane,
    c.colegio_nombre                                                 as ied,
    c.tipo_documento,
    c.docente_id                                                     as numero_documento,
    n.nombres,
    n.apellidos,
    c.genero                                                         as sexo,
    c.cargo_estandar                                                 as cargo,
    cast(c.edad as integer)                                          as edad,
    {{ nivel_cursado() }}                                            as nivel_cursado,
    {{ estado_finalizacion('c.retirado_segun_base', 'c.recibe_constancia') }} as estado_finalizacion,
    {{ puntaje_texto('c.score_entrada') }}                           as es_entrada,
    coalesce({{ mcer_etiqueta('c.mcer_entrada') }}, 'Sin registro')  as nivel_mcer_entrada,
    {{ puntaje_texto('c.score_salida') }}                            as es_salida,
    coalesce({{ mcer_etiqueta('c.mcer_salida') }}, 'Sin registro')   as nivel_mcer_salida,
    c.aprobado_sed,
    n.nombre_aproximado
from c
left join {{ ref('int_sed_nombres') }} n using (docente_id)
