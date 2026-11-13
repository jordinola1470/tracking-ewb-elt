import pytest
import pandas as pd
from src.utils.column_standardizer import ColumnStandardizer
from src.exceptions import MissingMappingYearError

def test_standardizer_year_2023():
    # Arrange
    data = {
        "PARTICIPANTE": ["Juan", "Pedro"],
        "ID": [1, 2],
        "TIPO ID": ["CC", "CE"],
        "GENERO": ["M", "M"],
        "FECHA DE NACIMIENTO": ["1990-01-01", "1985-05-12"],
        "CORREO ELECTRONICO": ["j@test.com", "p@test.com"],
        "CELULAR": ["300", "301"],
        "IED": ["Colegio A", "Colegio B"],
        "DANE": ["123", "456"],
        "NIVEL DE FORMACIÓN": ["Pregrado", "Posgrado"],
        "ROL QUE DESEMPEÑA": ["Docente", "Rector"],
        "TIPO DE NOMBRAMIENTO": ["Propiedad", "Provisional"],
        "JORNADA": ["Mañana", "Tarde"],
        "CURSO-NIVEL": ["11", "10"],
        "GRUPO EWB": ["G1", "G2"],
        "REMOTE": ["Sí", "No"],
        "  COLUMNA EXTRA CON ESPACIOS  ": ["X", "Y"],
        "TílDe!@#": ["A", "B"]
    }
    df = pd.DataFrame(data)

    # Act
    df_std = ColumnStandardizer.standardize(df, 2023)
    columns = list(df_std.columns)

    # Assert
    assert "docente_nombre" in columns
    assert "docente_id" in columns
    assert "tipo_documento" in columns
    assert "genero" in columns
    assert "fecha_nacimiento" in columns
    assert "correo_electronico" in columns
    assert "telefono_celular" in columns
    assert "colegio_nombre" in columns
    assert "codigo_dane" in columns
    assert "nivel_formacion" in columns
    assert "cargo_rol" in columns
    assert "tipo_nombramiento" in columns
    assert "jornada_laboral" in columns
    # En 2023 "CURSO-NIVEL" es el nivel asignado (2023 no trae grado_dicta) y "REMOTE" se mapea a rt_remoto
    assert "nivel_asignado" in columns
    assert "grupo_id" in columns
    assert "rt_remoto" in columns
    
    # Test _clean_string in action for non-mapped columns
    assert "columna_extra_con_espacios" in columns
    assert "tilde" in columns
    
    # Assert old columns are gone
    assert "PARTICIPANTE" not in columns
    assert "  COLUMNA EXTRA CON ESPACIOS  " not in columns


def test_standardizer_year_2024():
    # Arrange
    data = {"CLUSTER": ["A"], "NIVEL DICTA": ["11"], "NIVEL": ["A"]}
    df = pd.DataFrame(data)

    # Act
    df_std = ColumnStandardizer.standardize(df, 2024)
    columns = list(df_std.columns)

    # Assert
    assert "ubicacion_geo" in columns
    assert "grado_dicta" in columns
    assert "nivel_asignado" in columns


def test_standardizer_year_2025():
    # Arrange
    data = {
        "NOMBRES": ["Juan"], 
        "PRIMER APELLIDO": ["Perez"], 
        "FECHA DE NACIMIENTO (DD/MM/AAAA)": ["01/01/90"],
        "MUNICIPIO DE RESIDENCIA": ["Bogota"],
        "CARGO.1": ["Alt"],
        "TIPO DE NOMBRAMIENTO EN LA INSTITUCIÓN EDUCATIVA": ["Propiedad"],
        "JORNADA EDUCATIVA EN LA QUE LABORA": ["Mañana"],
        "NIVEL EDUCATIVO QUE ORIENTA": ["10"]
    }
    df = pd.DataFrame(data)

    # Act
    df_std = ColumnStandardizer.standardize(df, 2025)
    columns = list(df_std.columns)

    # Assert
    assert "nombres" in columns
    assert "primer_apellido" in columns
    assert "fecha_nacimiento" in columns
    assert "ubicacion_geo" in columns
    assert "cargo_rol_alt" in columns
    assert "tipo_nombramiento" in columns
    assert "jornada_laboral" in columns
    assert "grado_dicta" in columns

def test_standardizer_missing_year():
    # Arrange
    df = pd.DataFrame({"ID": [1]})
    
    # Act / Assert (2099: un año que nunca tendrá mapeo; 2026 ya está definido)
    with pytest.raises(MissingMappingYearError) as excinfo:
        ColumnStandardizer.standardize(df, 2099)

    assert "2099" in str(excinfo.value)
    assert "no está definido en" in str(excinfo.value)

def test_clean_string_nulls():
    # Arrange
    val1 = None
    val2 = float("nan") # NaN is functionally pd.isna == True
    
    # Act
    res1 = ColumnStandardizer._clean_string(val1)
    res2 = ColumnStandardizer._clean_string(val2)
    
    # Assert
    assert res1 == "columna_nula"
    assert res2 == "columna_nula"
