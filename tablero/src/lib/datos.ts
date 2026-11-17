// Lectura de las tablas finales del tablero (dbt: models/tablero/, prefijo tab_).
// El tablero NO calcula: aquí solo se leen filas ya calculadas por dbt.
import "server-only";
import { db, reiniciarDb } from "./db";

export type KpiAnio = {
  anio_lectivo: number; participaciones: number; docentes_unicos: number; ied_unicas: number; con_entrada_salida: number;
  con_entrada: number; con_salida: number; sin_entrada: number; sin_salida: number;
  con_constancia: number | null; con_dato_constancia: number; sin_constancia: number; pct_constancia: number | null;
  asistencia_promedio: number | null; retirados: number;
};
export type NivelAnio = {
  anio_lectivo: number; nivel_formacion: string; orden_nivel: number; matriculados: number;
  con_entrada_salida: number; solo_entrada: number; sin_entrada: number;
  pct_entrada_salida: number; pct_constancia: number | null;
};
export type CargoAnio = {
  anio_lectivo: number; cargo: string; participaciones: number; con_dato_constancia: number; pct_constancia: number | null;
};
export type Permanencia = { permanencia: string; anios_participados: number; es_continuo: boolean; docentes: number };
export type Perfil = {
  docente_id: string; docente_nombre: string | null; genero: string | null; cargo: string | null; colegio: string | null;
  ultimo_nivel_formacion: string | null; anios: string; niveles_por_anio: string; permanencia: string;
  es_continuo: boolean; asistencia: number | null;
};
export type Historial = {
  docente_id: string; anio_lectivo: number; grupo: string | null; nivel_formacion: string; orden_nivel: number;
  prueba_entrada: string; prueba_salida: string; constancia: string; asistencia: number | null; es_retirado: boolean;
};
export type Totales = { ied_total: number; docentes_total: number; participaciones_total: number };
export type CargoDocentes = { cargo: string; docentes: number };
export type DatosTablero = {
  kpis: KpiAnio[]; niveles: NivelAnio[]; cargos: CargoAnio[]; permanencia: Permanencia[];
  perfiles: Perfil[]; historial: Historial[]; totales: Totales | null; cargoDocentes: CargoDocentes[];
};

// Los datos cambian pocas veces al año: se guardan en memoria 10 minutos por servidor.
const DURACION_MS = 10 * 60 * 1000;
let cache: { cuando: number; datos: DatosTablero } | null = null;

// Límite propio: si la base no responde a tiempo, se corta con un error claro (no "cargando" eterno).
const LIMITE_MS = 20 * 1000;

export async function cargarDatosTablero(): Promise<DatosTablero> {
  if (cache && Date.now() - cache.cuando < DURACION_MS) return cache.datos;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error(`La base de datos no respondió en ${LIMITE_MS / 1000} s`)), LIMITE_MS);
  });
  try {
    return await Promise.race([leerTablas(), limite]);
  } catch (error) {
    reiniciarDb();
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
}

async function leerTablas(): Promise<DatosTablero> {
  const sql = db();

  // Las consultas van UNA POR UNA (no con Promise.all): el puerto 6543 de Supabase (transaction pooler)
  // se cuelga si se envían varias a la vez por la misma conexión. Una por una soporta 100 usuarios simultáneos.
  // Conteos a int y porcentajes a float8 para que lleguen como números (no como texto).
  const kpis = await sql<KpiAnio[]>`
      select anio_lectivo, participaciones::int, docentes_unicos::int, ied_unicas::int, con_entrada_salida::int,
             con_entrada::int, con_salida::int, sin_entrada::int, sin_salida::int,
             con_constancia::int, con_dato_constancia::int, sin_constancia::int, pct_constancia::float8,
             asistencia_promedio::float8, retirados::int
      from public.tab_kpis_anio order by anio_lectivo`;
  const niveles = await sql<NivelAnio[]>`
      select anio_lectivo, nivel_formacion, orden_nivel, matriculados::int, con_entrada_salida::int,
             solo_entrada::int, sin_entrada::int, pct_entrada_salida::float8, pct_constancia::float8
      from public.tab_pruebas_nivel_anio order by anio_lectivo, orden_nivel, nivel_formacion`;
  const cargos = await sql<CargoAnio[]>`
      select anio_lectivo, cargo, participaciones::int, con_dato_constancia::int, pct_constancia::float8
      from public.tab_constancia_cargo_anio order by anio_lectivo, pct_constancia desc nulls last`;
  const permanencia = await sql<Permanencia[]>`
      select permanencia, anios_participados::int, es_continuo, docentes::int
      from public.tab_permanencia order by anios_participados desc, es_continuo desc`;
  const totales = await sql<Totales[]>`
      select ied_total::int, docentes_total::int, participaciones_total::int from public.tab_totales`;
  const cargoDocentes = await sql<CargoDocentes[]>`
      select cargo, docentes::int from public.tab_cargo_docentes order by docentes desc, cargo`;
  const perfiles = await sql<Perfil[]>`
      select docente_id, docente_nombre, genero, cargo, colegio, ultimo_nivel_formacion, anios,
             niveles_por_anio, permanencia, es_continuo, asistencia::float8
      from public.tab_perfiles order by docente_nombre nulls last`;
  const historial = await sql<Historial[]>`
      select docente_id, anio_lectivo, grupo, nivel_formacion, orden_nivel, prueba_entrada,
             prueba_salida, constancia, asistencia::float8, es_retirado
      from public.tab_historial order by docente_id, anio_lectivo`;

  const datos: DatosTablero = {
    kpis: [...kpis], niveles: [...niveles], cargos: [...cargos],
    permanencia: [...permanencia], perfiles: [...perfiles], historial: [...historial],
    totales: totales[0] ?? null, cargoDocentes: [...cargoDocentes],
  };
  cache = { cuando: Date.now(), datos };
  return datos;
}
