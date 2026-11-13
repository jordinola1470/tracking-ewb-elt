"""
Prueba de punta a punta: verifica la base DESPUÉS de correr `cargar` y `transformar`
con los Excel ficticios de tests/fixtures/generar_excel_ficticios.py.

Solo corre con EWB_E2E=1 (en CI o en una base de prueba), nunca contra la base con datos reales.
Las consultas devuelven solo conteos: ningún dato de filas se imprime.
"""
import os

import pytest
from sqlalchemy import text

from tests.fixtures.generar_excel_ficticios import FILAS_POR_ANIO, TOTAL_FILAS, TRAZABILIDAD_ESPERADA

pytestmark = [
    pytest.mark.integracion,
    pytest.mark.e2e,
    pytest.mark.skipif(os.getenv("EWB_E2E") != "1", reason="Solo con EWB_E2E=1 sobre la base de prueba"),
]


def _contar(conn, sql: str) -> int:
    return conn.execute(text(sql)).scalar()


def test_raw_tiene_las_4_bases(db_conn):
    for anio in (2023, 2024, 2025, 2026):
        assert _contar(db_conn, f"select count(*) from raw.base_docentes_{anio}") == FILAS_POR_ANIO


def test_bitacora_registra_una_carga_por_anio(db_conn):
    # La segunda ejecución de `cargar` (sin cambios) no debe agregar registros
    assert _contar(db_conn, "select count(*) from raw._registro_cargas") == 4


def test_consolidado_historico_tiene_todas_las_filas(db_conn):
    assert _contar(db_conn, "select count(*) from public.consolidado_historico") == TOTAL_FILAS
    assert _contar(db_conn, "select count(distinct anio_lectivo) from public.consolidado_historico") == 4


def test_seguimiento_del_docente_en_el_tiempo(db_conn):
    # Cada docente ficticio aparece los 4 años y queda una sola vez en la dimensión
    assert _contar(db_conn, "select count(*) from marts.dim_docentes") == FILAS_POR_ANIO
    assert _contar(
        db_conn,
        "select count(*) from (select docente_id from public.consolidado_historico "
        "group by docente_id having count(distinct anio_lectivo) = 4) t",
    ) == FILAS_POR_ANIO


def test_trazabilidad_historica(db_conn):
    assert _contar(db_conn, "select count(*) from public.trazabilidad_historica") == TRAZABILIDAD_ESPERADA


def test_pre_a1_se_normaliza(db_conn):
    # 'Pre A1' de los Excel debe mapearse al id 0 de dim_mcer
    assert _contar(db_conn, "select count(*) from marts.fct_docentes where mcer_salida_id = 0") > 0
