"use client";
// Componentes: ana_kpi_participaciones, ana_kpi_docentes_unicos, ana_kpi_entrada_salida,
//              ana_kpi_constancia, ana_kpi_asistencia (fuente: tab_kpis_anio)
import type { KpiAnio } from "@/lib/datos";
import { entero, pct } from "../comunes/graficos";

const valor = (v: number | null | undefined, f: (n: number) => string) => (v == null ? "—" : f(v));

function Kpi({ nombre, titulo, texto, pie }: { nombre: string; titulo: string; texto: string; pie?: React.ReactNode }) {
  return (
    <div className="mk-card" data-componente={nombre}>
      <div className="mk-kpi-l">{titulo}</div>
      <div className="mk-kpi-v">{texto}</div>
      {pie}
    </div>
  );
}

export function AnaKpis({ kpi }: { kpi?: KpiAnio }) {
  return (
    <div className="mk-kpis">
      <Kpi nombre="ana_kpi_participaciones" titulo="Participaciones del año" texto={valor(kpi?.participaciones, entero)} />
      <Kpi nombre="ana_kpi_docentes_unicos" titulo="Docentes únicos del año" texto={valor(kpi?.docentes_unicos, entero)} />
      <Kpi nombre="ana_kpi_entrada_salida" titulo="Con prueba de entrada y salida" texto={valor(kpi?.con_entrada_salida, entero)} />
      <Kpi nombre="ana_kpi_constancia" titulo="Con constancia en el año" texto={valor(kpi?.pct_constancia, pct)} />
      <Kpi nombre="ana_kpi_asistencia" titulo="Asistencia promedio del año" texto={valor(kpi?.asistencia_promedio, pct)}
        pie={<div className="mk-kpi-l">Sin contar {valor(kpi?.retirados, entero)} retirados</div>} />
    </div>
  );
}
