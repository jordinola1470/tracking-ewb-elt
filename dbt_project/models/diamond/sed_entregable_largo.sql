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
    {{ o_guion('c.programa') }}                                      as programa,
    {{ o_guion('c.codigo_dane') }}                                   as dane,
    {{ o_guion('c.colegio_nombre') }}                                as ied,
    {{ o_guion('c.tipo_documento') }}                                as tipo_documento,
    c.docente_id                                                     as numero_documento,
    {{ o_guion('n.nombres') }}                                       as nombres,
    {{ o_guion('n.apellidos') }}                                     as apellidos,
    {{ o_guion('c.genero') }}                                        as sexo,
    {{ o_guion('c.cargo_estandar') }}                                as cargo,
    {{ o_guion('cast(c.edad as integer)') }}                         as edad,
    {{ nivel_cursado() }}                                            as nivel_cursado,
    {{ estado_finalizacion('c.retirado_segun_base', 'c.recibe_constancia') }} as estado_finalizacion,
    {{ puntaje_texto('c.score_entrada') }}                           as es_entrada,
    coalesce({{ mcer_etiqueta('c.mcer_entrada') }}, '-')  as nivel_mcer_entrada,
    {{ puntaje_texto('c.score_salida') }}                            as es_salida,
    coalesce({{ mcer_etiqueta('c.mcer_salida') }}, '-')   as nivel_mcer_salida,
    {{ o_guion('c.aprobado_sed') }}                                  as aprobado_sed
from c
left join {{ ref('int_sed_nombres') }} n using (docente_id)
