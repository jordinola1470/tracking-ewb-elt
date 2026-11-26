{#
  Macros del entregable para la SED y de columnas que pueden no venir en el Excel.
#}

{# Columna opcional: si existe en la tabla de origen la devuelve con el tipo pedido; si no, NULL de ese tipo.
   Sirve para columnas que se agregan a un Excel después (por ejemplo, EDAD o PROGRAMA en 2026) sin romper la carga
   cuando todavía no existen. Al leer el proyecto (dbt parse) no hay conexión y se usa NULL. #}
{% macro columna_opcional(relacion, columna, tipo='varchar') -%}
    {%- set existe = false -%}
    {%- if execute -%}
        {%- set nombres = adapter.get_columns_in_relation(relacion) | map(attribute='name') | map('lower') | list -%}
        {%- set existe = columna | lower in nombres -%}
    {%- endif -%}
    {%- if existe -%}
        cast({{ adapter.quote(columna) }} as {{ tipo }})
    {%- else -%}
        cast(null as {{ tipo }})
    {%- endif -%}
{%- endmacro %}

{# Texto de una columna opcional, sin espacios y con vacío = NULL #}
{% macro texto_opcional(relacion, columna) -%}
    nullif(trim({{ columna_opcional(relacion, columna, 'varchar') }}), '')
{%- endmacro %}

{# Puntaje como texto para el entregable: entero sin decimales; sin dato → '-' #}
{% macro puntaje_texto(col) -%}
    coalesce(cast(round({{ col }}) as integer)::text, '-')
{%- endmacro %}

{# Nivel MCER de una prueba con una sola escritura: 'PRE - A1', 'Pre A1' → 'PRE A1'; A1…C2 igual;
   '-' o vacío → NULL; otros textos (p. ej. 'No ha realizado', 'Abandonado') se conservan tal cual. #}
{% macro mcer_etiqueta(col) -%}
    case
        when nullif(trim({{ col }}), '') is null or trim({{ col }}) = '-' then null
        when upper(replace(replace({{ col }}, ' ', ''), '-', '')) = 'PREA1' then 'PRE A1'
        when upper(replace({{ col }}, ' ', '')) ~ '^[ABC][12]\+?$' then upper(replace({{ col }}, ' ', ''))
        else trim({{ col }})
    end
{%- endmacro %}

{# Dato faltante del entregable → '-' (todas las columnas del entregable son texto) #}
{% macro o_guion(col) -%}
    coalesce(nullif(trim(cast({{ col }} as varchar)), ''), '-')
{%- endmacro %}

{# ¿La prueba tiene resultado? (puntaje, o nivel MCER válido) #}
{% macro tiene_prueba(score, mcer) -%}
    ({{ score }} is not null or {{ orden_mcer(mcer) }} is not null)
{%- endmacro %}

{# Nivel cursado en el año: nivel_estandar; sin dato → '-' #}
{% macro nivel_cursado(col='nivel_estandar') -%}
    coalesce(nullif(trim({{ col }}), ''), '-')
{%- endmacro %}

{# Estado al cierre de la vigencia: Retirado (según la base del año) > Aprobado (constancia Sí) >
   Sin constancia (constancia No) > '-' (sin dato de constancia) #}
{% macro estado_finalizacion(retirado='retirado_segun_base', constancia='recibe_constancia') -%}
    case
        when {{ retirado }} then 'Retirado'
        when upper(trim({{ constancia }})) in ('SI', 'SÍ') then 'Aprobado'
        when upper(trim({{ constancia }})) = 'NO' then 'Sin constancia'
        else '-'
    end
{%- endmacro %}

{# Prioridad de la fila de 2026 cuando un docente está en dos programas: la de ewb_plus va al final
   (se conserva la última versión del participante: ewb_two o ewb_presencial) #}
{% macro prioridad_programa(col='programa') -%}
    case when lower({{ col }}) = 'ewb_plus' then 1 else 0 end
{%- endmacro %}
