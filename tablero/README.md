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
│   │   └── globals.css                 Diseño: variables de color/tipografía y clases
│   ├── lib/
│   │   ├── db.ts                       Conexión de solo lectura (servidor)
│   │   └── datos.ts                    Lectura de las tablas tab_* (servidor)
│   └── componentes/
│       ├── Tablero.tsx                 Pestañas, filtro de año, búsqueda y selección
│       ├── analitica/                  Componentes ana_*
│       ├── perfiles/                   Componentes per_*
│       └── comunes/graficos.tsx        Gráficos d3 reutilizables
├── .env.example                        Plantilla de variables (sin valores reales)
└── package.json                        Dependencias y comandos (dev, build)
```

## Cómo editar

| Quiero cambiar… | Archivo |
| :--- | :--- |
| Un indicador, gráfico o tabla de **Analítica** | `src/componentes/analitica/` (busca el nombre `ana_*`) |
| La lista, ficha o historial de **Perfiles** | `src/componentes/perfiles/per_componentes.tsx` |
| Cómo se dibuja un tipo de gráfico (barras, torta) | `src/componentes/comunes/graficos.tsx` |
| Colores, tipografía o espacios | `src/app/globals.css` |
| Qué columnas se leen de cada tabla | `src/lib/datos.ts` |
| **Los datos o cálculos** | dbt: `dbt_project/models/tablero/` (no en el tablero) |

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

## Paleta de colores

Mezcla de los dos colores institucionales sobre **fondo gris claro** con **tarjetas blancas** (sin modo oscuro).
Color principal azul petróleo `#0C343D` y verde institucional `#40984C`. Las variables viven en `src/app/globals.css`.

| Variable | Color | Uso |
| :--- | :--- | :--- |
| `--marca-principal` | `#0C343D` | Color principal: títulos, KPIs, pestaña activa, primera serie de los gráficos |
| `--marca-verde` | `#40984C` | Color secundario: borde superior de las tarjetas, segunda serie de los gráficos |
| `--marca-texto` | `#141C28` | Texto general |
| `--principal-medio` | `#617B81` | Tercera serie de los gráficos (principal con blanco) |
| `--verde-medio` | `#8CC194` | Cuarta serie de los gráficos (verde con blanco) |
| `--mezcla` | `#266644` | Quinta serie (mitad principal, mitad verde) |
| `--principal-claro` | `#DBE1E2` | Bordes, ejes y "sin prueba" en barras apiladas |
| `--principal-suave` | `#F3F5F5` | Líneas de cuadrícula y fila seleccionada |
| `--verde-claro` | `#D9EBDB` | Reservado para fondos suaves de estado "bien" |
| `--color-fondo` | `#EEF1F2` | Fondo gris claro de la página (las tarjetas son blancas `#FFFFFF`) |

Orden de uso en gráficos: `--chart-1` (principal) → `--chart-2` (verde) → `--chart-3` → `--chart-4` → `--chart-5`.
Para cambiar un color en todo el tablero, se edita solo la variable en `globals.css`.

**Reglas de estilo**
- **Título:** siempre en MAYÚSCULAS, **Arial Bold** (también los títulos de sección).
- **Bordes:** todos de **3 px** (variable `--borde`); las esquinas redondeadas usan `--cds-radius`.

**Orden de la vista Analítica**
1. **Histórico · todos los años** (arriba, no usa filtros): `ana_graf_constancia_anio`, `ana_graf_permanencia`.
2. **Por año** (abajo, todo responde al filtro): `ana_filtro_anio`, `ana_texto_resumen`, `ana_kpi_*`, `ana_graf_pruebas_nivel`, `ana_graf_constancia_nivel`, `ana_graf_constancia_cargo`, `ana_graf_nivel_formacion`.

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
