"use client";
// Componentes: ana_filtro_anio, ana_texto_resumen (fuente: tab_kpis_anio)
import type { KpiAnio } from "@/lib/datos";
import { entero, pct } from "../comunes/graficos";

export function AnaFiltroAnio({ anios, valor, cambiar }: { anios: number[]; valor: number; cambiar: (a: number) => void }) {
  return (
    // Una sola píldora: icono de calendario · "Año lectivo" + año elegido · flecha pegada al texto
    <label className="mk-filtro-anio" data-componente="ana_filtro_anio">
      <span className="mk-filtro-anio-icono" aria-hidden>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </span>
      <span className="mk-filtro-anio-txt">
        <small>Año lectivo</small>
        <span className="mk-filtro-anio-campo">
          <select aria-label="Año lectivo" value={valor} onChange={(e) => cambiar(Number(e.target.value))}>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <svg className="mk-filtro-anio-flecha" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </span>
    </label>
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
