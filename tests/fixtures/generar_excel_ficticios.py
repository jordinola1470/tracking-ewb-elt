"""
Genera las 4 bases de docentes con datos 100 % FICTICIOS para la prueba de punta a punta (CI).

- Usa los mismos encabezados que los Excel reales (así también se prueba el ColumnStandardizer).
- Los nombres de archivo y la hoja de cada año se leen de config/sources.yaml.
- Ningún dato corresponde a personas reales: nombres "Docente Prueba N", correos @ejemplo.com.

Uso:
    uv run python tests/fixtures/generar_excel_ficticios.py <carpeta_destino>
"""
import sys
from pathlib import Path

import pandas as pd
import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCES_YAML = PROJECT_ROOT / "config" / "sources.yaml"

# 5 docentes ficticios que aparecen los 4 años (permite probar el seguimiento en el tiempo)
DOCENTES = [
    {"n": i, "id": 900000000 + i, "dane": f"00000000000{i % 2 + 1}"} for i in range(1, 6)
]

# MCER de salida por año y docente (2026 aún no tiene salida). Diseñado para que la
# trazabilidad (máximo histórico >= A2) incluya a los docentes 1, 2 y 3.
MCER_SALIDA = {
    2023: ["A2", "A1", "B1", "Pre A1", None],
    2024: ["B1", "A1", "A1", "A1", "A1"],
    2025: ["B1", "A2", "A2", "A1", "Pre A1"],
}
MCER_ENTRADA = ["A1", "Pre A1", "A2", "A1", "A1"]
NIVELES_A2_O_MAS = {"A2", "B1", "B2", "C1", "C2"}

FILAS_POR_ANIO = len(DOCENTES)
TOTAL_FILAS = FILAS_POR_ANIO * 4
TRAZABILIDAD_ESPERADA = sum(
    1 for idx in range(len(DOCENTES))
    if any((MCER_SALIDA[a][idx] or "") in NIVELES_A2_O_MAS for a in MCER_SALIDA)
)


def _comunes(d: dict) -> dict:
    return {
        "nombre": f"Docente Prueba {d['n']}",
        "correo": f"docente{d['n']}@ejemplo.com",
        "celular": f"3000000{d['n']:03d}",
        "colegio": f"Colegio Ficticio {d['dane'][-1]}",
    }


def base_2023() -> pd.DataFrame:
    filas = []
    for idx, d in enumerate(DOCENTES):
        c = _comunes(d)
        filas.append({
            "PARTICIPANTE": c["nombre"], "ID": d["id"], "TIPO ID": "CC", "GENERO": "F",
            "FECHA DE NACIMIENTO": "1990-01-01", "CORREO ELECTRONICO": c["correo"], "CELULAR": c["celular"],
            "IED": c["colegio"], "DANE": d["dane"], "NIVEL DE FORMACIÓN": "Pregrado",
            "ROL QUE DESEMPEÑA": "Docente de aula", "TIPO DE NOMBRAMIENTO": "Propiedad", "JORNADA": "Mañana",
            "CURSO-NIVEL": "Fundamentals - A1", "GRUPO EWB": f"G23-{d['n']}", "REMOTE": "No",
            "ENGLISH SCORE ENTRADA 2023": 40 + idx, "NIVEL MCER ENTRADA 2023": MCER_ENTRADA[idx],
            "ENGLISH SCORE SALIDA 2023": 50 + idx, "NIVEL MCER SALIDA 2023": MCER_SALIDA[2023][idx],
            "% DE ASISTENCIA": 0.9, "RECIBE CONSTANCIA": "Si",
        })
    return pd.DataFrame(filas)


def base_2024() -> pd.DataFrame:
    filas = []
    for idx, d in enumerate(DOCENTES):
        c = _comunes(d)
        filas.append({
            "PARTICIPANTE": c["nombre"], "ID": d["id"], "TIPO ID": "CC", "GENERO": "F",
            "FECHA DE NACIMIENTO": "1990-01-01", "CORREO ELECTRONICO": c["correo"], "CELULAR": c["celular"],
            "IED": c["colegio"], "DANE": d["dane"], "CLUSTER": "Cluster Ficticio",
            "NIVEL DE FORMACIÓN": "Pregrado", "ROL QUE DESEMPEÑA": "Docente", "TIPO DE NOMBRAMIENTO": "Propiedad",
            "JORNADA": "Mañana", "NIVEL DICTA": "Secundaria", "GRUPO": f"G24-{d['n']}", "NIVEL": "Progress - A2",
            "ENGLISH SCORE ENTRADA 2024": 45 + idx, "NIVEL MCER ENTRADA 2024": "A1",
            "ENGLISH SCORE SALIDA 2024": 55 + idx, "NIVEL MCER SALIDA 2024": MCER_SALIDA[2024][idx],
            "% DE PARTICIPACION EWB 2024": "95.00%", "RECIBE CONSTANCIA": "Si",
        })
    return pd.DataFrame(filas)


def base_2025() -> pd.DataFrame:
    filas = []
    for idx, d in enumerate(DOCENTES):
        c = _comunes(d)
        filas.append({
            "PARTICIPANTE": c["nombre"], "ID": d["id"], "GENERO": "F",
            "FECHA DE NACIMIENTO (DD/MM/AAAA)": "01/01/1990", "CORREO ELECTRONICO": c["correo"],
            "CELULAR": c["celular"], "IED": c["colegio"], "DANE": d["dane"],
            "MUNICIPIO DE RESIDENCIA": "Municipio Ficticio", "NIVEL DE FORMACIÓN": "Posgrado", "CARGO": "Docente",
            "TIPO DE NOMBRAMIENTO EN LA INSTITUCIÓN EDUCATIVA": "Provisional",
            "JORNADA EDUCATIVA EN LA QUE LABORA": "Tarde", "NIVEL EDUCATIVO QUE ORIENTA": "Primaria",
            "GRUPO": f"G25-{d['n']}", "NIVEL": "Connections B - B1",
            "ENGLISH SCORE ENTRADA 2025": 50 + idx, "NIVEL MCER ENTRADA 2025": "A2",
            "ENGLISH SCORE SALIDA 2025": 60 + idx, "NIVEL MCER SALIDA 2025": MCER_SALIDA[2025][idx],
            "PORCENTAJE FINAL": 0.85, "RECIBE CONSTANCIA": "Si",
        })
    return pd.DataFrame(filas)


def base_2026() -> pd.DataFrame:
    # 2026 llega con encabezados en MAYÚSCULAS y columnas de entrada con contenido mezclado
    entradas = [("55", "A2"), ("B1", "62"), ("Pendiente", ""), ("48", "Pre A1"), ("", "")]
    filas = []
    for idx, d in enumerate(DOCENTES):
        c = _comunes(d)
        score_col, mcer_col = entradas[idx]
        filas.append({
            "DOCENTE_ID": d["id"], "TIPO_DOCUMENTO": "CC - CEDULA DE CIUDADANIA",
            "NOMBRES": "Docente", "APELLIDOS": f"Prueba {d['n']}", "CORREO_ELECTRONICO": c["correo"],
            "TELEFONO_CELULAR": c["celular"], "COLEGIO_NOMBRE": c["colegio"], "CODIGO_DANE": d["dane"],
            "NIVEL_FORMACION": "Pregrado", "CARGO_ROL": "Docente", "TIPO_NOMBRAMIENTO": "Propiedad",
            "GRUPO_ID": f"G26-{d['n']}", "NIVEL_ASIGNADO": "Entry - Pre A1",
            "ENGLISH_SCORE_ENTRADA_2026": score_col, "NIVEL_MCER_ENTRADA_2026": mcer_col,
            "PORCENTAJE_FINAL": 0.5,
        })
    return pd.DataFrame(filas)


GENERADORES = {2023: base_2023, 2024: base_2024, 2025: base_2025, 2026: base_2026}


def generar(destino: Path) -> None:
    config = yaml.safe_load(SOURCES_YAML.read_text(encoding="utf-8"))
    sources, sheets = config["sources"], config.get("sheets") or {}
    destino.mkdir(parents=True, exist_ok=True)

    for key_name, filename in sources.items():
        anio = int(key_name.rsplit("_", 1)[-1])
        df = GENERADORES[anio]()
        hoja = sheets.get(key_name, "Sheet1")
        df.to_excel(destino / filename, sheet_name=hoja, index=False)
        print(f"   {anio}: {len(df)} filas ficticias -> {filename} (hoja '{hoja}')")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Uso: python tests/fixtures/generar_excel_ficticios.py <carpeta_destino>")
    generar(Path(sys.argv[1]))
    print(f"✅ Total: {TOTAL_FILAS} filas · trazabilidad esperada: {TRAZABILIDAD_ESPERADA} docentes")
