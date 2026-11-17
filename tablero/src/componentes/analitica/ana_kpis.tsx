"use client";
// Componentes: ana_kpi_participaciones, ana_kpi_docentes_unicos, ana_kpi_ied_unicas,
//              ana_kpi_constancia, ana_kpi_asistencia (fuente: tab_kpis_anio)
import type { KpiAnio } from "@/lib/datos";
import { entero, pct } from "../comunes/graficos";

const valor = (v: number | null | undefined, f: (n: number) => string) => (v == null ? "—" : f(v));

// Iconos simples (trazo) para cada indicador
const ICONOS: Record<string, React.ReactNode> = {
  participaciones: <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />,
  docentes: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 5.5a3 3 0 0 1 0 5.6M18 14c2 .6 3 2.4 3 5" /></>,
  ied: <><path d="M3 21h18M5 21V10l7-5 7 5v11" /><path d="M10 21v-5h4v5M9 12h.01M15 12h.01" /></>,
  constancia: <><circle cx="12" cy="9" r="5" /><path d="M9 13.5 8 21l4-2 4 2-1-7.5" /></>,
  asistencia: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4" /></>,
};

/** Color de la tarjeta (todos de la paleta institucional; ver globals.css "mk-kpi-tono-*") */
type Tono = "principal" | "verde" | "mezcla" | "medio" | "verde-oscuro";

function Kpi({ nombre, icono, titulo, texto, pie, tono }: {
  nombre: string; icono: string; titulo: string; texto: string; pie?: React.ReactNode; tono: Tono;
}) {
  return (
    <div className={`mk-card mk-kpi mk-kpi-tono mk-kpi-tono-${tono}`} data-componente={nombre}>
      <div className="mk-kpi-top">
        <div className="mk-kpi-l">{titulo}</div>
        <span className="mk-kpi-icono" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONOS[icono]}</svg>
        </span>
      </div>
      <div className="mk-kpi-v">{texto}</div>
      {pie}
    </div>
  );
}

export function AnaKpis({ kpi }: { kpi?: KpiAnio }) {
  return (
    <div className="mk-kpis">
      <Kpi tono="principal" nombre="ana_kpi_participaciones" icono="participaciones" titulo="Participaciones del año" texto={valor(kpi?.participaciones, entero)} />
      <Kpi tono="verde" nombre="ana_kpi_docentes_unicos" icono="docentes" titulo="Docentes únicos del año" texto={valor(kpi?.docentes_unicos, entero)} />
      <Kpi tono="mezcla" nombre="ana_kpi_ied_unicas" icono="ied" titulo="IED únicas del año" texto={valor(kpi?.ied_unicas, entero)} />
      <Kpi tono="medio" nombre="ana_kpi_constancia" icono="constancia" titulo="Con constancia en el año" texto={valor(kpi?.pct_constancia, pct)} />
      <Kpi tono="verde-oscuro" nombre="ana_kpi_asistencia" icono="asistencia" titulo="Asistencia promedio del año" texto={valor(kpi?.asistencia_promedio, pct)}
        pie={<span className="mk-chip">Sin contar {valor(kpi?.retirados, entero)} retirados</span>} />
    </div>
  );
}
