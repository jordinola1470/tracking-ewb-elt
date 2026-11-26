# tracking-ewb-elt

![Python](https://img.shields.io/badge/Python-3.11%2B-blue?style=flat-square&logo=python)
![dbt](https://img.shields.io/badge/dbt-1.11-FF694B?style=flat-square&logo=dbt)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Pipeline ELT y tablero de seguimiento de la formación docente del programa **English Without Borders**.
Carga las bases anuales de docentes (2023 en adelante), las limpia y las organiza en un modelo dimensional para
seguir a cada docente a lo largo del tiempo. Las tablas finales alimentan el tablero publicado en
**<https://tracking-ewb-elt.vercel.app>**.

> 🔒 **Política de datos:** los archivos de origen contienen datos personales y **nunca** se suben al repositorio.
> `data/`, `*.xlsx`, `*.csv` y `.env` están excluidos en `.gitignore` y el hook `pre-commit` los bloquea.
> Las pruebas y la integración continua usan solo datos ficticios.

---

## Contenido

- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Instalación](#instalación)
- [Uso](#uso)
- [Tablero](#tablero)
- [Entornos y despliegue](#entornos-y-despliegue)
- [Pruebas y CI](#pruebas-y-ci)
- [Documentación](#documentación)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

---

## Arquitectura

El proyecto sigue la **arquitectura Medallion**: cada capa tiene un esquema propio en PostgreSQL.

```text
 data/ (Excel y CSV)                                        Tablero (Next.js · Vercel)
        │                                                              ▲
        ▼                                                              │ solo lectura
 ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
 │ Bronze · raw │ ─▶ │ Silver ·     │ ─▶ │ Gold · marts │ ─▶ │ Diamond ·    │
 │ (Python)     │    │ staging (dbt)│    │ (dbt)        │    │ public (dbt) │
 └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

| Capa | Esquema | Herramienta | Contenido |
| :--- | :--- | :--- | :--- |
| 🟤 Bronze | `raw` | Python (Pandas, SQLAlchemy) | Datos de origen sin transformar, con control de cambios por huella SHA-256 |
| ⚪️ Silver | `staging` | dbt (vistas) | Tipos de datos, limpieza y estandarización de texto |
| 🟡 Gold | `marts` | dbt (tablas) | Modelo dimensional: `dim_*` y `fct_*` |
| 💎 Diamond | `public` | dbt (tablas) | `consolidado_historico`, `trazabilidad_historica` y tablas `tab_*` del tablero |

El tablero no hace cálculos: lee las tablas `tab_*` ya calculadas por dbt. El detalle de cada capa, tabla y regla
está en [docs/modelo_datos.md](docs/modelo_datos.md).

---

## Tecnologías

| Área | Herramientas |
| :--- | :--- |
| Carga (EL) | Python 3.11, Pandas, SQLAlchemy, Pydantic |
| Transformación (T) | dbt-core 1.11, dbt-postgres |
| Base de datos | PostgreSQL 17 (Docker en local, Supabase en la nube) |
| Tablero | Next.js 16, React, D3, Auth.js (Vercel) |
| Calidad y despliegue | uv, ruff, pytest, pre-commit, Docker, GitHub Actions, GHCR |

---

## Estructura del repositorio

```text
tracking-ewb-elt/
├── main.py                 # Punto de entrada: `cargar` (EL) y `transformar` (T)
├── config/                 # Fuentes (sources.yaml), mapeo de columnas y configuración (.env)
├── src/                    # Ingestor, transformer, excepciones y estandarizador de columnas
├── infrastructure/         # Conexión a PostgreSQL
├── dbt_project/            # Modelos dbt: staging, marts, diamond y tablero; macros y pruebas
├── tablero/                # Aplicación Next.js (ver tablero/README.md)
├── scripts/                # Carga a producción con confirmación
├── sql/                    # Roles de mínimo privilegio en Supabase
├── tests/                  # Pruebas (pytest) y generador de datos ficticios
├── docs/                   # Documentación interna
├── .github/workflows/      # CI, CD y latido de Supabase
├── data/                   # Archivos de origen locales (no se versiona)
└── .env.example            # Plantilla de variables de entorno
```

---

## Instalación

**Requisitos:** Python 3.11+, [uv](https://docs.astral.sh/uv/), Docker Desktop y Node.js 22 (solo para el tablero).

```bash
git clone https://github.com/jordinola1470/tracking-ewb-elt.git
cd tracking-ewb-elt
cp .env.example .env          # completa TU_USUARIO y TU_CONTRASEÑA; el .env nunca se sube
uv sync                       # dependencias del pipeline y de desarrollo
uv run pre-commit install     # bloquea Excel, CSV y .env antes de cada commit
```

Coloca los archivos de origen en `data/`, con los nombres definidos en `config/sources.yaml`. Las fuentes de
referencia (lista oficial de IED y alertas del helpdesk) se describen en
[docs/modelo_datos.md](docs/modelo_datos.md#fuentes-de-referencia). Todos se obtienen por canal interno.

---

## Uso

### Con Docker (recomendado)

```bash
docker compose up -d db                        # base PostgreSQL 17 local (puerto 5433)
docker compose run --rm pipeline cargar        # carga data/ a raw (montada en solo lectura)
docker compose run --rm pipeline transformar   # dbt build: staging → marts → public
docker compose down                            # apaga todo; los datos quedan en el volumen
```

### Con uv

```bash
uv run python main.py cargar                      # carga los años cuyo archivo cambió
uv run python main.py cargar --anio 2026          # revisa y carga solo ese año
uv run python main.py cargar --anio 2026 --forzar # recarga aunque no haya cambiado
uv run python main.py transformar                 # reconstruye staging, marts y public desde raw
```

- `cargar` es idempotente: compara la huella de cada archivo y solo recarga lo que cambió, en una transacción que
  se deshace si los totales no cuadran.
- `transformar` no necesita los archivos de origen: reconstruye todo desde `raw`.
- Los errores del proyecto se muestran como mensajes cortos, sin datos personales, y terminan con código 1.

---

## Tablero

Aplicación Next.js en [`tablero/`](tablero/README.md), publicada en Vercel con inicio de sesión (Auth.js).

| Pestaña | Contenido |
| :--- | :--- |
| **Analítica · Histórico** | Constancia por año, permanencia, IED atendidas, docentes por cargo y último nivel cursado |
| **Analítica · Por año** | Indicadores del año, nivel de formación, constancia por nivel y cargo, pruebas presentadas |
| **Perfiles** | Búsqueda y filtros de docentes, con la ficha y el historial de cada uno |
| **Reporte** | Fact sheet del programa con descarga en PDF |

Diseño, paleta y guía de archivos en [tablero/README.md](tablero/README.md).

---

## Entornos y despliegue

| Entorno | Base de datos | Datos |
| :--- | :--- | :--- |
| dev | Docker local | Copia local |
| `entorno_staging` | Supabase | Ficticios |
| `entorno_prod` | Supabase | Reales (despliegue con aprobación) |

- **Código:** rama → Pull Request → CI → CD. El CD publica una imagen en GHCR, despliega en staging y espera
  aprobación para producción.
- **Datos:** se cargan a producción con `scripts/cargar_prod.sh`, que pide confirmación.

Entornos, seguridad, reversa de versiones y tareas recurrentes en [docs/operacion.md](docs/operacion.md).

---

## Pruebas y CI

Cada Pull Request y cada cambio en `main` ejecuta el flujo [CI](.github/workflows/ci.yml), **solo con datos
ficticios**:

| Revisión | Qué comprueba |
| :--- | :--- |
| `ruff` | Errores evidentes en el código Python |
| Pruebas unitarias | Cada componente por separado, sin base de datos |
| `dbt parse` | Que los modelos SQL sean válidos |
| Punta a punta | Imagen Docker + PostgreSQL 17 temporal + datos ficticios: carga, transformación y pruebas de datos |
| Tablero | Lint y compilación de la aplicación |

```bash
uv run ruff check .                  # lint
uv run pytest -m "not integracion"   # pruebas unitarias
uv run pytest                        # incluye integración (requiere la base encendida)
```

Las pruebas de datos de dbt reportan solo cantidades, nunca valores.

---

## Documentación

| Documento | Contenido |
| :--- | :--- |
| [docs/modelo_datos.md](docs/modelo_datos.md) | Capas, tablas, reglas de transformación y fuentes de referencia |
| [docs/operacion.md](docs/operacion.md) | Entornos, seguridad, despliegue y operación |
| [docs/supabase_activar_manual.md](docs/supabase_activar_manual.md) | Qué hacer si Supabase avisa de inactividad |
| [docs/INSTRUCCIONES_ANALITICA.md](docs/INSTRUCCIONES_ANALITICA.md) | Manual de consultas analíticas (SQL) |
| [docs/README.md](docs/README.md) | Índice completo de la documentación interna |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |

---

## Contribuir

`main` está protegida: los cambios entran **solo por Pull Request**.

1. Crea una rama desde `main` actualizada: `feat/…`, `fix/…`, `docs/…` o `chore/…`.
2. Haz commits pequeños; el hook `pre-commit` bloquea Excel, CSV y `.env`.
3. Abre un Pull Request y completa la plantilla.
4. Fusiona cuando las verificaciones estén en verde y borra la rama.

Las versiones siguen el [versionado semántico](https://semver.org/lang/es/) y se registran en el
[CHANGELOG](CHANGELOG.md).

---

## Licencia

Distribuido bajo la licencia MIT. Ver [LICENSE](LICENSE).
