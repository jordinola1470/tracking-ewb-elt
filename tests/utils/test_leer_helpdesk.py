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
