{{ config(materialized='ephemeral') }}
-- Entregable SED · nombres y apellidos por separado, una fila por docente (uso interno; no se publica).
-- 1) Los de la base más reciente que los trae separados (2026: NOMBRES / APELLIDOS; 2025: NOMBRES /
--    PRIMER y SEGUNDO APELLIDO). En 2026, si el docente está en dos programas, manda la fila que no es ewb_plus.
-- 2) Si solo participó en 2023 o 2024 (nombre completo en una sola columna), se separa por posición:
--    las dos últimas palabras son los apellidos (con 3 palabras: 1 nombre y 2 apellidos; con 2: 1 y 1).
--    Verificado: en 2023 y 2024 el nombre completo empieza por los nombres. Esos casos quedan marcados.
with c as (
    select * from {{ ref('consolidado_historico') }}
    where docente_id is not null
),

separados as (
    select
        docente_id,
        (array_agg(nombres order by anio_lectivo desc, {{ prioridad_programa() }})
            filter (where nombres is not null or apellidos is not null))[1]   as nombres,
        (array_agg(apellidos order by anio_lectivo desc, {{ prioridad_programa() }})
            filter (where nombres is not null or apellidos is not null))[1]   as apellidos,
        max(docente_nombre)                                                    as nombre_completo
    from c
    group by docente_id
),

palabras as (
    select *, regexp_split_to_array(trim(nombre_completo), '\s+') as p
    from separados
)

select
    docente_id,
    nombre_completo,
    (nombres is null and apellidos is null)                                   as nombre_aproximado,
    case
        when nombres is not null or apellidos is not null then nombres
        when cardinality(p) >= 4 then array_to_string(p[1:cardinality(p) - 2], ' ')
        else p[1]
    end                                                                       as nombres,
    case
        when nombres is not null or apellidos is not null then apellidos
        when cardinality(p) >= 3 then array_to_string(p[cardinality(p) - 1:cardinality(p)], ' ')
        when cardinality(p) = 2 then p[2]
    end                                                                       as apellidos
from palabras
