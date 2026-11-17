-- Fact sheet · resumen ejecutivo en una sola fila (secciones 1.1, 4.2 y 8). Componente: rep_fact_sheet
with d as (
    select * from {{ ref('int_fs_docente_anio') }}
),
total_anios as (select count(distinct anio_lectivo) as n, min(anio_lectivo) as primer, max(anio_lectivo) as ultimo from d),
docente as (
    select docente_id, count(*) as anios, (array_agg(genero order by anio_lectivo desc) filter (where genero is not null))[1] as genero
    from d group by docente_id
),
ied as (
    select codigo_dane, count(distinct anio_lectivo) as anios from d where codigo_dane is not null group by codigo_dane
)
select
    (select count(*) from d)                                                as participaciones,
    (select count(*) from docente)                                          as participantes_unicos,
    (select count(*) from docente where genero = 'Femenino')                as mujeres,
    (select count(*) from docente where genero = 'Masculino')               as hombres,
    (select count(*) from docente where anios = 1)                          as un_anio,
    (select count(*) from docente where anios = 2)                          as dos_anios,
    (select count(*) from docente where anios = 3)                          as tres_anios,
    (select count(*) from docente where anios = 4)                          as cuatro_anios,
    (select count(*) from ied)                                              as colegios,
    (select count(*) from ied, total_anios t where ied.anios = t.n)         as colegios_todos_los_anios,
    t.n                                                                     as anios_programa,
    t.primer                                                                as primer_anio,
    t.ultimo                                                                as ultimo_anio
from total_anios t
