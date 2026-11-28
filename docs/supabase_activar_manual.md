# Mantener Supabase activo a mano (si falla el latido)

Supabase **pausa los proyectos gratuitos** que muestran poca actividad durante 7 días. Según su documentación,
bastan «unas pocas peticiones a la base cada día». El flujo automático **Mantener Supabase activo** de GitHub
hace eso dos veces al día (6:17 a. m. y 6:17 p. m., hora de Colombia). Usa esta guía si ese flujo falla o si
llega el correo de Supabase avisando de inactividad.

Proyectos del programa:

| Proyecto | Para qué sirve |
| :--- | :--- |
| `ewb-entorno-prod` | Producción: la base que usa el tablero publicado |
| `ewb-entorno-staging` | Pruebas: datos ficticios del CD |

> Haz los pasos en **los dos proyectos**.

---

## ¿Cómo sé que algo anda mal?

- Te llega un correo de GitHub diciendo que falló **Mantener Supabase activo**.
- Te llega un correo de Supabase avisando de inactividad. Es una advertencia: Supabase pausa **aproximadamente
  una semana después** de ese aviso.
- El tablero no carga datos y en Supabase el proyecto aparece como **pausado** (en ese caso, ve a la opción C).

---

## Opción A: relanzar el latido desde GitHub (la más rápida)

1. Entra al repositorio en GitHub y abre la pestaña **Actions**.
2. En la lista de la izquierda elige **Mantener Supabase activo** (no «CI» ni «CD»).
3. Haz clic en **Run workflow** y luego otra vez en **Run workflow**.
4. Espera 1 minuto y abre la ejecución. Debe tener dos trabajos con ✅:
   - **Latido ewb-entorno-staging**
   - **Latido ewb-entorno-prod**
5. En cada uno, la nota debe decir algo como: `ewb-entorno-prod activo (tablas visibles en public: 16, intento 1)`.

Si sale ❌ con «la consulta falló 3 veces», usa la opción B.

---

## Opción B: generar actividad desde el panel de Supabase

1. Entra a <https://supabase.com/dashboard> con la cuenta dueña de los proyectos.
2. Abre el proyecto (empieza por `ewb-entorno-prod`). **Solo entrar al proyecto ya cuenta como actividad**,
   según Supabase.
3. Para reforzar, en el menú de la izquierda abre **SQL Editor**.
4. Crea una consulta nueva y pega esta línea. Es **de solo lectura**: no cambia nada y no muestra datos de docentes:

   ```sql
   select count(*) from information_schema.tables where table_schema = 'public';
   ```

5. Ejecútala con el botón **Run** (o con **Ctrl + Enter** / **⌘ + Enter**). Debe mostrar un número (hoy, 16).
6. Repite los pasos 2 a 5 en `ewb-entorno-staging`.
7. Si el latido sigue fallando, haz esto **una vez al día** hasta corregirlo.

> ⚠️ En el SQL Editor ejecuta **solo** esa consulta. No pegues otras instrucciones (`delete`, `drop`, `update`…):
> el editor tiene permisos totales sobre la base.

---

## Opción C: el proyecto ya está pausado

1. Entra a <https://supabase.com/dashboard> y abre el proyecto pausado.
2. Haz clic en **Resume project** (Reanudar proyecto) y confirma.
3. Espera a que el estado deje de decir pausado. Supabase no indica cuánto tarda; normalmente son unos minutos.
4. **Los datos se conservan**: el proyecto vuelve a su estado anterior, con datos y configuración.
5. Después:
   - Relanza el latido (opción A) para confirmar que responde.
   - Abre el tablero y recarga con **⌘ + Shift + R**. El tablero guarda datos hasta 10 minutos.

> Plazo: el proyecto pausado se puede reanudar con un clic durante un tiempo limitado. La documentación habla de
> 1 año, pero el aviso en pantalla puede mostrar otro plazo: **revisa la fecha límite que indica el banner** del
> proyecto pausado y no lo dejes para después.

---

## Si nada de lo anterior funciona

- Revisa en GitHub → **Actions** si el flujo **Mantener Supabase activo** está desactivado. GitHub apaga los
  flujos programados de repositorios públicos tras **60 días sin cambios**. Para activarlo: **Actions →
  Mantener Supabase activo → Enable workflow**.
- Revisa en GitHub → **Settings → Secrets and variables → Actions** que existan los secretos
  `TABLERO_STAGING_USER`, `TABLERO_STAGING_PASS`, `TABLERO_PROD_USER` y `TABLERO_PROD_PASS`. **Nunca** copies sus
  valores en un chat, correo o archivo.

---

Fuente: documentación oficial de Supabase, «Project pausing» (<https://supabase.com/docs/guides/platform/project-pausing>)
y «Upgrading» (<https://supabase.com/docs/guides/platform/upgrading>), consultadas el 2026-11-23.
