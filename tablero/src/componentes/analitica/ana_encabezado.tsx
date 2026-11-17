"use client";
// Componentes: ana_filtro_anio, ana_texto_resumen (fuente: tab_kpis_anio)
import type { KpiAnio } from "@/lib/datos";
import { entero, pct } from "../comunes/graficos";
import { FiltroPildora } from "../comunes/filtro_pildora";

export function AnaFiltroAnio({ anios, valor, cambiar }: { anios: number[]; valor: number; cambiar: (a: number) => void }) {
  // Filtro principal (grande): toda la píldora abre la lista de años
  return (
    <FiltroPildora nombre="ana_filtro_anio" tamano="grande" etiqueta="Año lectivo" icono="calendario" valor={String(valor)}
      opciones={anios.map((a) => ({ valor: String(a), texto: String(a) }))} cambiar={(v) => cambiar(Number(v))} />
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
