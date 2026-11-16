# Tablero de formación docente en inglés

> **Estado:** versión inicial (mock con datos ficticios). Es la base sobre la que se construye el tablero
> definitivo: Next.js + inicio de sesión (Auth.js con Google y Microsoft) en Vercel, leyendo las tablas
> finales de `public` en Supabase. Cada componente tendrá un nombre y sus datos vendrán de dbt.

Mock de un tablero con dos vistas, **Analítica** y **Perfiles de docentes**, construido sobre la estructura de la base histórica 2023–2025.

**Todos los datos son ficticios.** Se generaron con un script que imita las columnas y proporciones aproximadas de la base, pero ningún nombre, colegio, grupo ni cifra corresponde a personas o resultados reales. No uses estas cifras como resultados.

Versión publicada: https://claude.ai/artifact/9VzXFsWK6TMxekkcGoBkqY

## Cómo abrirlo

Abre `index.html` con doble clic en cualquier navegador. Es un archivo único y autónomo: incluye d3, los datos y el código, y no necesita servidor ni internet.

## Estructura

```
index.html                 Tablero listo para abrir (generado con npm run build)
package.json               Dependencias (d3 7.9.0) y comandos
src/
  dashboard.html           Código fuente del tablero: HTML, CSS y JS (cálculos y gráficos)
  dash-shim.js             Versión local de la API `dash` que provee claude.ai
  tokens.css               Variables de color, tipografía y espacios (claro y oscuro)
vendor/d3.min.js           d3 v7.9.0
data/
  mock_docentes.json       430 registros ficticios (uno por docente y año)
  mock_docentes.csv        Los mismos datos en CSV
scripts/
  generar_datos_base.py    Genera los registros base
  agregar_campos.py        Agrega estado, nivel de inglés y código de grupo
  build.mjs                Ensambla index.html
  capturas.py              Toma las capturas de pantalla
artifact/                  Definición de la fuente y metadatos usados en claude.ai
screenshots/               Una captura de cada vista
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run build` | Regenera `index.html` después de editar `src/` o `data/` |
| `npm run datos` | Regenera `data/mock_docentes.json` (mismo resultado, semillas fijas) |
| `npm run capturas` | Rehace las capturas (requiere `pip install playwright` y `playwright install chromium`) |

Después de `npm run datos`, regenera el CSV si lo necesitas y vuelve a correr `npm run build`.

## Campos de los datos

| Campo | Descripción | Columna equivalente en la base real |
|---|---|---|
| registro | Id de la fila (docente + año) | — |
| docente_id | Código del docente | docente_id |
| docente_nombre | Nombre ficticio | docente_nombre |
| genero | Femenino / Masculino | genero |
| anio_lectivo | 2023, 2024 o 2025 | anio_lectivo |
| nivel_formacion | Máximo título (normalizado) | nivel_formacion |
| colegio | Colegio ficticio | colegio_nombre-2 |
| cargo | Cargo estandarizado | cargo_estandar |
| grupo | Código del grupo con la nomenclatura de cada año | grupo_id |
| nivel_grupo | Nivel del grupo matriculado | nivel_asignado (normalizado) |
| nivel_ingles | Nivel de inglés del grupo | derivado de nivel_asignado |
| asistencia | Proporción de asistencia (0–1) | asistencia_porcentaje_fix |
| prueba_entrada / prueba_salida | SI / NO según si presentó la prueba | score_entrada / score_salida (vacío o "-" = NO) |
| constancia | SI / NO | recibe_constancia |
| estado | Activo / Retirado | grupo_id que empieza por "Ret" |

## Reglas de cálculo

- **Filtro de año:** arranca en el año más reciente; no hay vista "todos los años" para los indicadores del año.
- **Constancia:** se mide por separado en cada año, nunca acumulada.
- **Asistencia promedio:** excluye a los retirados.
- **Pruebas por nivel de grupo:** cada barra es el total de matriculados en el nivel, dividido en *entrada y salida*, *solo entrada* y *sin entrada*.
- **Permanencia:** 3 años, 2 años seguidos, 2 años no seguidos (2023 y 2025) o solo 1 año. *Continua* = 3 años o 2 años seguidos.
- No se usan resultados MCER ni puntajes como notas.

## Equivalencia nivel de grupo → nivel de inglés

| Nivel de grupo | Nivel de inglés |
|---|---|
| Entry | Pre-A1 |
| Fundamentals | A1 |
| Fundamentals 2 | A1.2 |
| Progress | A2 |
| Progress 2 | A2.2 |
| Connections | B1 |
| Evolution/Specialist | B2/C1 |

## Pendiente para conectar la base real

- Normalizar `nivel_asignado`, `nivel_formacion` y `cargo_rol`, que hoy tienen variantes de escritura.
- Definir si los registros con `grupo_id` que empieza por "Des" (deserción) también se excluyen de la asistencia.
- Antes de cargar datos reales en cualquier herramienta, revisarlo con la Unidad de Informática.
