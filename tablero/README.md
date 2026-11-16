# Tablero · Formación docente en inglés

Aplicación **Next.js** con inicio de sesión (**Auth.js**: Google y Microsoft), publicada en **Vercel**.
Lee las tablas finales `tab_*` de Supabase con el rol de **solo lectura** `ewb_tablero`.
**El tablero no calcula:** todos los cálculos están en dbt (`dbt_project/models/tablero/`); aquí solo se filtra por año y se dibuja.

## Estructura

```
tablero/
├── src/
│   ├── auth.ts                         Login con Google y Microsoft (Auth.js)
│   ├── app/
│   │   ├── page.tsx                    Página principal: sin sesión → /login; con sesión → datos + tablero
│   │   ├── login/page.tsx              Botones "Iniciar sesión con Google / Microsoft"
│   │   ├── api/auth/[...nextauth]/     Rutas internas del login
│   │   └── globals.css                 Diseño (tokens y clases del mock)
│   ├── lib/
│   │   ├── db.ts                       Conexión de solo lectura (servidor)
│   │   └── datos.ts                    Lectura de las tablas tab_* (servidor)
│   └── componentes/
│       ├── Tablero.tsx                 Pestañas, filtro de año, búsqueda y selección
│       ├── analitica/                  Componentes ana_*
│       ├── perfiles/                   Componentes per_*
│       └── comunes/graficos.tsx        Gráficos d3 reutilizables
└── mock/                               Mock original (referencia de diseño; no se publica)
```

## Componentes y su fuente

Cada componente tiene el atributo `data-componente="<nombre>"` para ubicarlo en la página.

| Componente | Tabla dbt |
| :--- | :--- |
| `ana_filtro_anio`, `ana_texto_resumen`, `ana_kpi_*`, `ana_graf_constancia_anio` | `tab_kpis_anio` |
| `ana_graf_pruebas_nivel`, `ana_graf_constancia_nivel`, `ana_graf_nivel_formacion` | `tab_pruebas_nivel_anio` |
| `ana_graf_constancia_cargo` | `tab_constancia_cargo_anio` |
| `ana_graf_permanencia` | `tab_permanencia` |
| `per_buscador`, `per_tabla_docentes`, `per_ficha_docente` | `tab_perfiles` |
| `per_tabla_historial` | `tab_historial` |

## Desarrollo local

```bash
cd tablero
npm install
cp .env.example .env.local      # completar con valores reales (nunca se sube)
npm run dev                     # http://localhost:3000
```

Para revisar el diseño sin credenciales de Google/Microsoft, en `.env.local` agrega `TABLERO_SIN_LOGIN=1`
(solo funciona con `npm run dev`; en producción se ignora). Apunta los `TABLERO_DB_*` a **staging** (datos ficticios).

## Seguridad

- Sin sesión, la página solo responde con la redirección a `/login`: ningún dato sale del servidor.
- Las credenciales de la base solo existen en el servidor (Vercel); el navegador nunca las ve.
- `ewb_tablero` solo puede leer `public` y sus transacciones son de solo lectura.
