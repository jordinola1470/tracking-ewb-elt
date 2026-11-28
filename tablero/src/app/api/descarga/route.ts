// Descargas en Excel, solo para correos autorizados (TABLERO_DESCARGA_CORREOS, ver lib/permisos.ts).
// Se pide por POST con un cuerpo JSON: los datos que identifican qué descargar nunca van en la URL.
//   { tipo: "perfiles", ids: string[] }   → docentes filtrados en Perfiles + su historial por año
//   { tipo: "ficha", id: string }         → ficha de un docente + su historial por año
//   { tipo: "sed" }                       → entregable SED (formatos ancho y largo, tablas de Diamond)
// Cada descarga queda registrada en el log del servidor (quién, qué y cuántas filas; nunca el contenido).
import { obtenerSesion } from "@/auth";
import { db } from "@/lib/db";
import { crearExcel, type Columna, type Hoja } from "@/lib/excel";
import { puedeDescargar } from "@/lib/permisos";

const MAX_IDS = 5000;

const COLUMNAS_PERFIL: Columna[] = [
  { titulo: "N° Documento", clave: "docente_id" }, { titulo: "Nombre", clave: "docente_nombre" },
  { titulo: "Género", clave: "genero" }, { titulo: "Cargo", clave: "cargo" }, { titulo: "IED", clave: "colegio" },
  { titulo: "Último nivel de formación", clave: "ultimo_nivel_formacion" },
  { titulo: "MCER Entrada", clave: "mcer_entrada" }, { titulo: "MCER Salida", clave: "mcer_salida" },
  { titulo: "Constancia", clave: "constancia" }, { titulo: "Años cursados", clave: "anios" },
  { titulo: "Nivel de formación por año", clave: "niveles_por_anio" }, { titulo: "Permanencia", clave: "permanencia" },
  { titulo: "Asistencia", clave: "asistencia", porcentaje: true },
];
const COLUMNAS_HISTORIAL: Columna[] = [
  { titulo: "N° Documento", clave: "docente_id" }, { titulo: "Nombre", clave: "docente_nombre" },
  { titulo: "Año", clave: "anio_lectivo" }, { titulo: "Grupo", clave: "grupo" },
  { titulo: "Nivel de formación", clave: "nivel_formacion" },
  { titulo: "MCER Entrada", clave: "mcer_entrada" }, { titulo: "MCER Salida", clave: "mcer_salida" },
  { titulo: "Constancia", clave: "constancia" }, { titulo: "Asistencia", clave: "asistencia", porcentaje: true },
];

export async function POST(req: Request) {
  const sesion = await obtenerSesion();
  if (!sesion) return Response.json({ error: "Inicia sesión para descargar." }, { status: 401 });
  const correo = sesion.user?.email ?? "";
  if (!puedeDescargar(correo)) return Response.json({ error: "Tu cuenta no tiene permiso para descargar." }, { status: 403 });

  let cuerpo: { tipo?: unknown; ids?: unknown; id?: unknown };
  try { cuerpo = await req.json(); } catch { return Response.json({ error: "Solicitud no válida." }, { status: 400 }); }

  const sql = db();
  const hoy = new Date().toISOString().slice(0, 10);
  let hojas: Hoja[];
  let archivo: string;

  if (cuerpo.tipo === "perfiles" || cuerpo.tipo === "ficha") {
    const ids = cuerpo.tipo === "ficha" ? [cuerpo.id] : cuerpo.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS || !ids.every((x) => typeof x === "string" && x.length <= 40)) {
      return Response.json({ error: "Solicitud no válida." }, { status: 400 });
    }
    // Consultas una por una (el pooler de Supabase no admite varias a la vez por la misma conexión)
    const perfiles = await sql`
      select docente_id, docente_nombre, genero, cargo, colegio, ultimo_nivel_formacion, mcer_entrada, mcer_salida,
             constancia, anios, niveles_por_anio, permanencia, asistencia::float8
      from public.tab_perfiles where docente_id in ${sql(ids as string[])} order by docente_nombre nulls last`;
    const historial = await sql`
      select h.docente_id, p.docente_nombre, h.anio_lectivo, h.grupo, h.nivel_formacion, h.mcer_entrada, h.mcer_salida,
             h.constancia, h.asistencia::float8
      from public.tab_historial h join public.tab_perfiles p using (docente_id)
      where h.docente_id in ${sql(ids as string[])} order by p.docente_nombre nulls last, h.anio_lectivo`;
    hojas = [
      { nombre: cuerpo.tipo === "ficha" ? "Ficha" : "Docentes", columnas: COLUMNAS_PERFIL, filas: [...perfiles] },
      { nombre: "Historial por año", columnas: COLUMNAS_HISTORIAL, filas: [...historial] },
    ];
    archivo = cuerpo.tipo === "ficha" ? `EwB_ficha_docente_${hoy}.xlsx` : `EwB_perfiles_${hoy}.xlsx`;
  } else if (cuerpo.tipo === "sed") {
    // Las columnas del entregable van con sus nombres de la base, tal cual
    const ancho = await sql`select * from public.sed_entregable_ancho`;
    const largo = await sql`select * from public.sed_entregable_largo`;
    const columnas = (r: typeof ancho): Columna[] => r.columns.map((c) => ({ titulo: c.name, clave: c.name }));
    hojas = [
      { nombre: "Formato ancho", columnas: columnas(ancho), filas: [...ancho] },
      { nombre: "Formato largo", columnas: columnas(largo), filas: [...largo] },
    ];
    archivo = `EwB_entregable_SED_${hoy}.xlsx`;
  } else {
    return Response.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const contenido = await crearExcel(hojas);
  console.info(JSON.stringify({
    evento: "descarga", correo, tipo: cuerpo.tipo, filas: hojas.map((h) => `${h.nombre}: ${h.filas.length}`), fecha: new Date().toISOString(),
  }));
  return new Response(new Uint8Array(contenido), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${archivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
