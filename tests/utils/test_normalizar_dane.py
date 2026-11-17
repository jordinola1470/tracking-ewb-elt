"""El código DANE se conserva completo (sin redondeo) al leer el Excel."""
import pytest

from src.ingestor import Ingestor


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        (108001000434, "108001000434"),
        (108001000434.0, "108001000434"),
        (" 108001000434 ", "108001000434"),
        ("108001000434.0", "108001000434"),
        (None, None),
        (float("nan"), None),
        ("", None),
    ],
)
def test_normalizar_dane(entrada, esperado):
    assert Ingestor.normalizar_dane(entrada) == esperado


def test_leer_referencia_ied(tmp_path):
    """La lista oficial se lee sin filas vacías, con el DANE como texto y espacios normalizados."""
    csv = tmp_path / "ied.csv"
    csv.write_text(
        "﻿INSTITUCION,DANE\n"
        "COLEGIO FICTICIO  UNO ,108001000001\n"
        "COLEGIO FICTICIO DOS,108001000002\n"
        ",\n,\n",
        encoding="utf-8",
    )
    df = Ingestor().leer_referencia_ied(csv)
    assert list(df.columns) == ["colegio_oficial", "codigo_dane"]
    assert df.to_dict("records") == [
        {"colegio_oficial": "COLEGIO FICTICIO UNO", "codigo_dane": "108001000001"},
        {"colegio_oficial": "COLEGIO FICTICIO DOS", "codigo_dane": "108001000002"},
    ]
