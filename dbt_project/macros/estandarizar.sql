{#
  Estandarización de textos (se aplica en staging, así gold y diamond reciben el mismo formato).
  Un solo lugar para cambiar las reglas.
#}

{# Espacios: quita los de los extremos y deja uno solo entre palabras; vacío -> NULL #}
{% macro limpiar_espacios(col) -%}
    nullif(regexp_replace(trim(cast({{ col }} as varchar)), '\s+', ' ', 'g'), '')
{%- endmacro %}

{# Partículas en minúscula dentro del nombre ("María del Carmen de la Hoz") #}
{% macro _particulas_minuscula(expr) -%}
    replace(replace(replace(replace(replace(replace(replace(' ' || {{ expr }} || ' ',
        ' De ', ' de '), ' Del ', ' del '), ' La ', ' la '), ' Las ', ' las '), ' Los ', ' los '), ' Y ', ' y '), ' E ', ' e ')
{%- endmacro %}

{# Nombre de persona: "MARÍA DEL CARMEN PÉREZ" / "maria del carmen" -> "María del Carmen Pérez" #}
{% macro nombre_propio(col) -%}
    nullif(trim({{ _particulas_minuscula('initcap(lower(' ~ limpiar_espacios(col) ~ '))') }}), '')
{%- endmacro %}

{# Nombre de la IED con el estilo de la lista oficial (raw.referencia_ied): MAYÚSCULAS y prefijo completo.
   "IED Las Américas" / "I.E.D. ..." -> "INSTITUCION EDUCATIVA DISTRITAL LAS AMÉRICAS"; "ENS ..." -> "ESCUELA NORMAL SUPERIOR ...";
   "# 201" / "No. 201" -> "NO. 201". En diamond se reemplaza por el nombre oficial según el DANE. #}
{% macro nombre_ied(col) -%}
    nullif(trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
        upper({{ limpiar_espacios(col) }}),
        '^INSTITUCI[OÓ]N EDUCATIVA DISTRITAL\s*|^I\.?\s?E\.?\s?D\.?\s+', 'INSTITUCION EDUCATIVA DISTRITAL '),
        '^ENS\s+', 'ESCUELA NORMAL SUPERIOR '),
        '(#|\mNO\.?|N°)\s*([0-9]+)', 'NO. \2', 'g'),
        '\s+', ' ', 'g')), '')
{%- endmacro %}

{# Clave para comparar nombres de IED: sin tildes, signos, prefijos ni "NO."/"#" #}
{% macro clave_ied(expr) -%}
    trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
        upper(translate({{ expr }}, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')),
        '["''.,#°]', ' ', 'g'),
        '^\s*(I?NSTITUCION EDUCATIVA( COMUNITARIA)?( DISTRITAL)?|I\s*E\s*D|IED|IE|ESCUELA NORMAL SUPERIOR|ENS)\M', ' '),
        '\mNO\s+([0-9]+)', '\1', 'g'),
        '\s+', ' ', 'g'))
{%- endmacro %}

{# Correo: sin espacios y en minúscula #}
{% macro correo(col) -%}
    lower({{ limpiar_espacios(col) }})
{%- endmacro %}

{# Sí / No: "SI", "Si", "si" -> "Si"; "NO", "No" -> "No"; otro valor se conserva #}
{% macro si_no(col) -%}
    case upper({{ limpiar_espacios(col) }})
        when 'SI' then 'Si' when 'SÍ' then 'Si' when 'NO' then 'No'
        else {{ limpiar_espacios(col) }} end
{%- endmacro %}

{# Clave para comparar textos sin tildes, mayúsculas ni espacios de más #}
{% macro clave_texto(expr) -%}
    regexp_replace(upper(translate({{ expr }}, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g')
{%- endmacro %}
