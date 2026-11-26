-- Entregable SED · versión LARGA: una fila por participación (docente y año), igual que consolidado_historico.
-- Columnas de identificación del formato pedido + año, programa (distingue las dos filas de los docentes de 2026
-- que están en dos programas) y las tres columnas por año: nivel cursado, estado de finalización y ES salida.
with c as (
    select * from {{ ref('consolidado_historico') }}
    where docente_id is not null
)

select
    row_number() over (order by c.anio_lectivo, n.apellidos, n.nombres, c.docente_id, c.programa)::int as no,
    {{ o_guion('c.codigo_dane') }}                                   as dane,
    {{ o_guion('c.colegio_nombre') }}                                as ied,
    {{ o_guion('c.tipo_documento') }}                                as tipo_documento,
    c.docente_id                                                     as numero_documento,
    {{ o_guion('n.nombres') }}                                       as nombres,
    {{ o_guion('n.apellidos') }}                                     as apellidos,
    {{ o_guion('c.genero') }}                                        as sexo,
    {{ o_guion('c.cargo_estandar') }}                                as cargo,
    {{ o_guion('cast(c.edad as integer)') }}                         as edad,
    c.anio_lectivo                                                   as anio,
    {{ o_guion('c.programa') }}                                      as programa,
    {{ nivel_cursado() }}                                            as nivel_cursado,
    {{ estado_finalizacion('c.retirado_segun_base', 'c.recibe_constancia') }} as estado_finalizacion,
    {{ puntaje_texto('c.score_salida') }}                            as es_salida
from c
left join {{ ref('int_sed_nombres') }} n using (docente_id)
