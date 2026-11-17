-- Tablero · una fila con las fechas de actualización (aviso "Actualizado el" del tablero).
-- transformado_en = cuándo se recalcularon las tablas (dbt build); cargado_en = última carga de Excel a raw.
-- Componente: barra_avisos
{%- set registro = adapter.get_relation(database=target.database, schema='raw', identifier='_registro_cargas') %}
select
    current_timestamp                                                    as transformado_en,
{%- if registro %}
    (select max(cargado_en) from {{ registro }})                         as cargado_en,
{%- else %}
    null::timestamptz                                                    as cargado_en,
{%- endif %}
    (select max(anio_lectivo) from {{ ref('consolidado_historico') }})  as ultimo_anio,
    (select count(*) from {{ ref('consolidado_historico') }})           as registros
