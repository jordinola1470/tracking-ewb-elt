# Operación y despliegue

Entornos, seguridad, despliegue y tareas recurrentes. Para la visión general, ver el [README](../README.md).

---

## Entornos

El mismo código corre en tres entornos; solo cambian las variables `DB_*`.

| Entorno | Dónde | Datos | Credenciales |
| :--- | :--- | :--- | :--- |
| dev | Docker en el equipo local (`docker compose`) | Reales (copia local) | `.env` |
| `entorno_staging` | Supabase `ewb-entorno-staging` | **Ficticios** | `.env.entorno_staging` · GitHub Environment `entorno_staging` |
| `entorno_prod` | Supabase `ewb-entorno-prod` | Reales | `.env.entorno_prod` · GitHub Environment `entorno_prod` (requiere aprobación) |

> `entorno_staging` es un **entorno** completo (raw, staging, marts y public); `staging` es el **esquema** de la capa
> Silver. No confundirlos.

Ejecutar contra un entorno desde el equipo local (en staging, solo con Excel ficticios):

```bash
docker run --rm --env-file .env.entorno_staging -v <carpeta_excel>:/app/data:ro tracking-ewb-elt:local cargar
docker run --rm --env-file .env.entorno_staging tracking-ewb-elt:local transformar
```

---

## Seguridad en Supabase

- **Data API desactivada:** las tablas no se publican en internet. RLS automático en `public`.
- **Pipeline:** conexión por *Session pooler* (IPv4, puerto 5432) con `DB_SSLMODE=require`.
- **Tablero:** *Transaction pooler* (puerto 6543), con las consultas una por una.
- **Roles de mínimo privilegio** ([`sql/roles_supabase.sql`](../sql/roles_supabase.sql)); las contraseñas se fijan
  con `\password` en `psql`, nunca en archivos:
  - `ewb_pipeline`: dueño de `raw`, `staging` y `marts`; construye `public`.
  - `ewb_tablero`: solo lectura de `public` (política RLS creada por la macro `permitir_lectura_tablero` en cada
    `transformar`).
- Las credenciales viven solo en variables de entorno, secretos de GitHub y variables de Vercel.

---

## Despliegue (CD)

El flujo [CD](../.github/workflows/cd.yml) se activa cuando **CI termina en verde sobre `main`**, con cualquier
cambio:

1. Publica **una** imagen en GHCR: `ghcr.io/jordinola1470/tracking-ewb-elt:<commit de 7 caracteres>`.
2. **`entorno_staging`** (automático): `cargar` con Excel **ficticios** y `transformar`.
3. **`entorno_prod`** (espera aprobación en GitHub): `transformar` con **la misma imagen**. Si `raw` está vacío,
   lo salta con un aviso.

Durante el despliegue la aplicación no se detiene: Vercel publica la versión nueva al terminar y dbt reemplaza
cada tabla de una sola vez.

**Datos vs. código**
- **Datos** (Excel o CSV nuevos o corregidos): no pasan por CD. Se cargan con `scripts/cargar_prod.sh`.
- **Código** (YAML, SQL de dbt, Python, Dockerfile, tablero): rama → PR → CI → CD.

**Volver a una versión anterior:** *Actions → CD → Run workflow*, elige el entorno y la etiqueta de una imagen
anterior. Ejecuta `transformar` con esa imagen; `raw` no se modifica.

---

## Actualizar datos en producción

Con los archivos nuevos o corregidos en `data/` (Excel, `referencia_ied/` y `helpdesk_data/`):

```bash
scripts/cargar_prod.sh                      # carga los años cuyo Excel cambió y transforma
scripts/cargar_prod.sh --anio 2026          # solo ese año
scripts/cargar_prod.sh --anio 2026 --forzar # recarga aunque el archivo no haya cambiado
```

- Pide escribir `SI` para confirmar.
- Usa la imagen de GHCR del último commit de `main` (el mismo código que ya pasó CI y staging).
- Requiere Docker encendido y `.env.entorno_prod`.
- Monta `data/` completa: también recarga la lista oficial de IED y las alertas del helpdesk.
- Si cambia la forma de leer los Excel, usa `--forzar` para releerlos todos.

El tablero guarda los datos en memoria hasta 10 minutos: los cambios pueden tardar ese tiempo en verse.

---

## Mantener Supabase activo

El plan gratuito de Supabase pausa los proyectos con poca actividad en 7 días. El flujo
[Mantener Supabase activo](../.github/workflows/mantener_activo.yml):

- Corre **dos veces al día** (11:17 y 23:17 UTC; 6:17 a. m. y 6:17 p. m. en Colombia) en staging y producción.
- Hace una consulta mínima de solo lectura con `ewb_tablero` y reintenta hasta 3 veces si falla la red.
- Usa los secretos `TABLERO_STAGING_USER/PASS` y `TABLERO_PROD_USER/PASS`.
- En repositorios públicos, GitHub desactiva los flujos programados tras 60 días sin actividad. Se reactiva en
  *Actions → Mantener Supabase activo → Enable workflow*.

Si el flujo falla o llega un aviso de inactividad: [supabase_activar_manual.md](supabase_activar_manual.md).

---

## Acceso al tablero

- Inicio de sesión con Auth.js (Google y Microsoft).
- La app de Google solo pide nombre, correo y foto, por lo que **cualquier cuenta de Google** con el enlace puede
  entrar; la lista de usuarios de prueba de Google no restringe el acceso.
- Restringir el acceso requiere una lista de correos o dominios permitidos configurada en Vercel.

---

## Alertas

GitHub envía un correo cuando falla cualquier flujo (CI, CD o el latido de Supabase).
