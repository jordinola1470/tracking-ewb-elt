# Pasos aplicados después de generar_datos_base.py (en este orden) para llegar a data/mock_docentes.json.
# Todos los datos son FICTICIOS: solo imitan la estructura de la base histórica.
import json, random
rows = json.load(open("mock_docentes.json"))

# 1) Estado activo / retirado (los retirados se excluyen del promedio de asistencia)
random.seed(5)
for r in rows:
    ret = r["asistencia"] < 0.3 and random.random() < 0.55
    r["estado"] = "Retirado" if ret else "Activo"

# 2) Nivel de inglés del grupo según el nombre del nivel
m = {"Entry": "Pre-A1", "Fundamentals": "A1", "Fundamentals 2": "A1.2", "Progress": "A2", "Progress 2": "A2.2",
     "Connections": "B1", "Evolution/Specialist": "B2/C1", "Sin nivel asignado": "Sin nivel"}
for r in rows:
    r["nivel_ingles"] = m[r["nivel_grupo"]]

# 3) Código de grupo con la nomenclatura de cada año
random.seed(21)
code25 = {"Pre-A1": "PRE_A1", "A1": "A1", "A1.2": "A1", "A2": "A2", "A2.2": "A2", "B1": "B1", "B2/C1": "B2"}
for r in rows:
    a = r["anio_lectivo"]; dir_ = r["cargo"] == "Directivo Docente"
    if r["estado"] == "Retirado":
        r["grupo"] = "Retirados Directivos" if (a == "2025" and dir_) else ("Retirados Docentes" if a == "2025" else "Retirados")
    elif a == "2023":
        r["grupo"] = f"BAR-H{random.randint(12,18)}-G{random.randint(1,11)}"
    elif a == "2024":
        niv = "" if r["nivel_grupo"] == "Sin nivel asignado" else "-" + r["nivel_grupo"]
        r["grupo"] = (f"BAQ24DirDoc-H{random.randint(59,61)}-GU{random.randint(1,9)}DD" if dir_
                      else f"BAQ24Doc-H{random.randint(59,61)}-GU{random.randint(1,45)}") + niv
    else:
        niv = "" if r["nivel_ingles"] == "Sin nivel" else "-" + code25[r["nivel_ingles"]]
        r["grupo"] = f"BAQ25DOC-G{random.randint(1,10):02d}-{random.choice(['MA','SA'])}{random.randint(1,18):02d}" + niv

json.dump(rows, open("mock_docentes.json", "w"), ensure_ascii=False)
print(len(rows), "registros")
