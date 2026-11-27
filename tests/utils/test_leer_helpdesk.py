"""Las alertas del helpdesk se leen sin datos personales (solo documento, grupos y fecha)."""
import pytest

from src.exceptions import DatabaseLoadError
from src.ingestor import Ingestor

ENCABEZADO = (
    "student\\.firstName,student\\.lastName,student\\.secondLastName,student\\.typeId,student\\.documentId,"
    "student\\.email,student\\.gender,title,description,before,after,read,archived,source,"
    "creationDate\\.dateString,currentAttendanceStatus\n"
)


def test_leer_helpdesk_descarta_datos_personales(tmp_path):
    (tmp_path / "helpdesk_2099_docentes.csv").write_text(
        ENCABEZADO
        + "Ana,Ficticia,Uno,CC, 1000001 ,ana@ejemplo.com,F,Aviso,null,XX99DOC-G01-SA08-A2,Retirados Docentes,false,false,ADMIN,2099-05-02,null\n"
        + "Ana,Ficticia,Uno,CC,1000001,ana@ejemplo.com,F,Aviso,null,XX99DOC-G02-MA07-A1,XX99DOC-G01-SA08-A2,false,false,ADMIN,2099-04-01,null\n",
        encoding="utf-8",
    )
    df = Ingestor().leer_helpdesk(tmp_path)
    assert list(df.columns) == ["archivo", "fila", "docente_id", "grupo_antes", "grupo_despues", "fecha_alerta"]
    assert df.to_dict("records")[0] == {
        "archivo": "helpdesk_2099_docentes.csv", "fila": 1, "docente_id": "1000001",
        "grupo_antes": "XX99DOC-G01-SA08-A2", "grupo_despues": "Retirados Docentes", "fecha_alerta": "2099-05-02",
    }
    assert len(df) == 2


def test_leer_helpdesk_carpeta_vacia(tmp_path):
    assert Ingestor().leer_helpdesk(tmp_path).empty


def test_leer_helpdesk_columnas_faltantes(tmp_path):
    (tmp_path / "malo.csv").write_text("a,b\n1,2\n", encoding="utf-8")
    with pytest.raises(DatabaseLoadError):
        Ingestor().leer_helpdesk(tmp_path)


def test_leer_helpdesk_matricula_formatos_2023_y_2024(tmp_path):
    """Listas de matrícula en Excel: se guardan solo documento, grupo, curso y nivel (datos ficticios)."""
    import pandas as pd

    pd.DataFrame({"PARTICIPANTE": ["Ana Ficticia"], "ID": [1000001], "GRUPO EWB": ["G1"],
                  "CURSO INICIAL": ["Entry - Pre A1"], "NIVEL INICIAL": ["PRE_A1"]}).to_excel(
        tmp_path / "helpdesk_2099_docentes.xlsx", sheet_name="nivel_inicial", index=False)
    pd.DataFrame({"firstName": ["Luis"], "email": ["luis@ejemplo.com"], "documentId": [1000002.0],
                  "group": ["G2"], "Nivel": ["Fundamentals 2"]}).to_excel(
        tmp_path / "helpdesk_2098_docentes.xlsx", sheet_name="help_desk", index=False)
    df = Ingestor().leer_helpdesk_matricula(tmp_path)
    assert list(df.columns) == ["archivo", "anio_lectivo", "docente_id", "grupo", "curso", "nivel"]
    filas = {r["anio_lectivo"]: r for r in df.to_dict("records")}
    assert filas[2099]["docente_id"] == "1000001" and filas[2099]["nivel"] == "PRE_A1"
    assert filas[2098]["docente_id"] == "1000002" and filas[2098]["curso"] == "Fundamentals 2"
    assert filas[2098]["nivel"] is None


def test_leer_helpdesk_matricula_nombre_invalido(tmp_path):
    import pandas as pd

    pd.DataFrame({"ID": [1], "Nivel": ["Entry"]}).to_excel(tmp_path / "helpdesk_sin_anio.xlsx", index=False)
    with pytest.raises(DatabaseLoadError):
        Ingestor().leer_helpdesk_matricula(tmp_path)
