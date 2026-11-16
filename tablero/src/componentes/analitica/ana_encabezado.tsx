"use client";
// Componentes: ana_filtro_anio, ana_texto_resumen (fuente: tab_kpis_anio)
import type { KpiAnio } from "@/lib/datos";
import { entero, pct } from "../comunes/graficos";

export function AnaFiltroAnio({ anios, valor, cambiar }: { anios: number[]; valor: number; cambiar: (a: number) => void }) {
  return (
    <div className="mk-filters" data-componente="ana_filtro_anio">
      <label>
        Año lectivo{" "}
        <select className="dash-select" aria-label="Año lectivo" value={valor} onChange={(e) => cambiar(Number(e.target.value))}>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <span>Todo lo de esta sección usa este filtro.</span>
    </div>
  );
}

export function AnaTextoResumen({ kpi }: { kpi?: KpiAnio }) {
  return (
    <p className="mk-sub" data-componente="ana_texto_resumen">
      En <b>{kpi?.anio_lectivo ?? "—"}</b>, <b>{kpi ? entero(kpi.con_entrada_salida) : "—"}</b> participaciones tuvieron prueba de
      entrada y de salida, y <b>{kpi?.pct_constancia != null ? pct(kpi.pct_constancia) : "—"}</b> obtuvieron constancia.
    </p>
  );
}
