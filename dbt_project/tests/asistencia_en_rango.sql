-- La asistencia debe estar en escala decimal 0-1 (ej. 0.95 = 95 %).
-- Severidad "warn": avisa sin detener el pipeline, para revisar el Excel de origen.
{{ config(severity='warn') }}

select anio_lectivo
from {{ ref('consolidado_historico') }}
where asistencia_porcentaje_fix is not null
  and (asistencia_porcentaje_fix < 0 or asistencia_porcentaje_fix > 1)
