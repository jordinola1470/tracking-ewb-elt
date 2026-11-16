# Genera datos FICTICIOS que imitan la estructura de la base histórica (sin datos reales)
import random, json
random.seed(11)
nom_f=["Ana","Laura","Marta","Sofía","Diana","Paula","Carmen","Lucía","Elena","Rosa","Julia","Valeria","Andrea","Clara","Nora"]
nom_m=["Carlos","Jorge","Luis","Andrés","Pedro","Mario","Diego","Felipe","Raúl","Hugo"]
ape=["Gómez","Rojas","Torres","Vargas","Ríos","Castro","Mejía","Ortiz","Peña","Suárez","Mora","Cruz","Lara","Silva","Duarte"]
form=[("Especialista",34),("Magíster",40),("Profesional universitario",23),("Normalista",3),("Doctorado",2)]
cargo=[("Docente de Aula",67),("Docente de Primaria",13),("Directivo Docente",10),("Docente de Contenido",10)]
NIV=["Entry","Fundamentals","Fundamentals 2","Progress","Progress 2","Connections","Evolution/Specialist"]
pn=[30,18,12,10,8,14,8]
# patrones de años parecidos a la base: solo un año, dos años (consecutivos o no) y los tres
pat=[((2024,),892),((2023,),572),((2024,2025),394),((2025,),293),((2023,2024),257),((2023,2024,2025),188),((2023,2025),55)]
def w(opts): return random.choices([o for o,_ in opts],[p for _,p in opts])[0]
rows=[]; n=0
for i in range(300):
  g=random.random()<0.74
  nombre=f"{random.choice(nom_f if g else nom_m)} {random.choice(ape)} (ficticio)"
  f=w(form); c=w(cargo); col=f"Colegio Ejemplo {random.randint(1,24):02d}"
  anios=w(pat); lv=random.choices(range(len(NIV)),pn)[0]
  for a in anios:
    n+=1
    nivel=NIV[lv] if random.random()>0.18 else "Sin nivel asignado"
    asis=round(min(1,max(0,random.betavariate(2.2,1.3) if random.random()>.25 else random.random()*.3)),2)
    ent=random.random()<{2023:.68,2024:.66,2025:.81}[a]
    sal=ent and asis>=0.4 and random.random()<0.85
    cons=asis>=0.45 and random.random()<0.9
    rows.append(dict(registro=f"R-{n:04d}",docente_id=f"D-{i+1:04d}",docente_nombre=nombre,genero="Femenino" if g else "Masculino",
      anio_lectivo=str(a),nivel_formacion=f,colegio=col,cargo=c,grupo=f"GRP-{a%100}-{random.randint(1,9)}",
      nivel_grupo=nivel,asistencia=asis,prueba_entrada="SI" if ent else "NO",prueba_salida="SI" if sal else "NO",
      constancia="SI" if cons else "NO"))
    if cons and lv<len(NIV)-1: lv+=1
json.dump(rows,open("mock_docentes.json","w"),ensure_ascii=False)
print(len(rows))
