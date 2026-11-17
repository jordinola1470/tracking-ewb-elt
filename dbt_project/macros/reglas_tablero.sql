{#
  Reglas de lectura del tablero sobre consolidado_historico.
  Usan los valores TAL COMO VIENEN de los Excel; se ajustan aquí en un solo lugar.
#}

{# Constancia: "Si"/"SI" = sí; "No"/"NO" = no; vacío = sin dato (no cuenta en el %) #}
{% macro tiene_constancia(col='recibe_constancia') -%}
    case when upper(trim({{ col }})) = 'SI' then 1
         when upper(trim({{ col }})) = 'NO' then 0 end
{%- endmacro %}

{# Retirado: el grupo empieza con "Retirados" (ej. "Retirados Docentes", "Retirados Directivos") #}
{% macro es_retirado(col='grupo_id') -%}
    coalesce({{ col }} ilike 'retirados%', false)
{%- endmacro %}

{# Prueba presentada: tiene puntaje o nivel MCER #}
{% macro tiene_entrada() -%}
    (score_entrada is not null or mcer_entrada is not null)
{%- endmacro %}
{% macro tiene_salida() -%}
    (score_salida is not null or mcer_salida is not null)
{%- endmacro %}

{# Orden de la escala de nivel de formación (nivel_estandar) para los gráficos #}
{% macro orden_nivel(col='nivel_estandar') -%}
    case {{ col }}
        when 'PRE_A1' then 1 when 'A1' then 2 when 'A2' then 3 when 'A2+' then 4
        when 'B1' then 5 when 'B1+' then 6 when 'B2' then 7 when 'C1' then 8
        when '-' then 98 else 99 end
{%- endmacro %}

{# MCER a orden numérico (fact sheet): PRE A1=0, A1=1, A2=2, B1=3, B2=4, C1=5; otro valor = sin evaluar (NULL) #}
{% macro orden_mcer(col) -%}
    case upper(replace(replace({{ col }}, ' ', ''), '-', ''))
        when 'PREA1' then 0 when 'A1' then 1 when 'A2' then 2
        when 'B1' then 3 when 'B2' then 4 when 'C1' then 5 end
{%- endmacro %}
