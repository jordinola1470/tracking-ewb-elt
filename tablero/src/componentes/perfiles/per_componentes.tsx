"use client";
// Componentes de la vista Perfiles: per_buscador, per_filtros, per_tabla_docentes, per_panel_ficha, per_ficha_docente, per_tabla_historial
// Fuentes: tab_perfiles (una fila por docente) y tab_historial (una fila por docente y año).
import { useEffect, useMemo, useState } from "react";
import type { Historial, Perfil } from "@/lib/datos";
import { pct } from "../comunes/graficos";
import { FiltroPildora } from "../comunes/filtro_pildora";

/** per_buscador */
export function PerBuscador({ texto, cambiar }: { texto: string; cambiar: (t: string) => void }) {
  return (
    <label className="mk-search-caja" data-componente="per_buscador">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      <input className="mk-search" type="search" placeholder="Buscar docente…" aria-label="Buscar docente"
        value={texto} onChange={(e) => cambiar(e.target.value)} />
    </label>
  );
}

/** Filtros de la lista de docentes ("" = todos) */
export type FiltrosPerfil = { nivel: string; cargo: string; ied: string; permanencia: string };
export const FILTROS_VACIOS: FiltrosPerfil = { nivel: "", cargo: "", ied: "", permanencia: "" };

// Orden de los niveles de formación (los demás valores van al final, en orden alfabético)
const ORDEN_NIVEL = ["PRE_A1", "A1", "A2", "A2+", "B1", "B1+", "B2", "C1"];
const opciones = (valores: (string | null)[], orden?: string[]) => {
  const unicos = [...new Set(valores.map((v) => v ?? "Sin dato"))];
  return unicos.sort((a, b) => {
    const ia = orden?.indexOf(a) ?? -1, ib = orden?.indexOf(b) ?? -1;
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b, "es");
  });
};

/** per_filtros · nivel de formación (último), cargo (último), IED y permanencia — fuente: tab_perfiles */
export function PerFiltros({ perfiles, filtros, cambiar, total }: {
  perfiles: Perfil[]; filtros: FiltrosPerfil; cambiar: (f: FiltrosPerfil) => void; total: number;
}) {
  const campos: { clave: keyof FiltrosPerfil; etiqueta: string; icono: string; valores: string[] }[] = [
    { clave: "nivel", etiqueta: "Nivel de formación", icono: "nivel", valores: opciones(perfiles.map((p) => p.ultimo_nivel_formacion), ORDEN_NIVEL) },
    { clave: "cargo", etiqueta: "Cargo", icono: "cargo", valores: opciones(perfiles.map((p) => p.cargo)) },
    { clave: "ied", etiqueta: "IED", icono: "ied", valores: opciones(perfiles.map((p) => p.colegio)) },
    { clave: "permanencia", etiqueta: "Permanencia", icono: "permanencia", valores: opciones(perfiles.map((p) => p.permanencia)) },
  ];
  const activos = Object.values(filtros).some(Boolean);
  return (
    <div className="mk-filtros-perfil" data-componente="per_filtros">
      {/* Filtros secundarios (pequeños): misma forma que el filtro de año, un poco menores */}
      {campos.map((c) => (
        <FiltroPildora key={c.clave} tamano="pequeno" etiqueta={c.etiqueta} icono={c.icono} valor={filtros[c.clave]}
          opciones={[{ valor: "", texto: "Todos" }, ...c.valores.map((v) => ({ valor: v, texto: v }))]}
          cambiar={(v) => cambiar({ ...filtros, [c.clave]: v })} />
      ))}
      <div className="mk-filtros-pie">
        <span>{total.toLocaleString("es-CO")} {total === 1 ? "docente" : "docentes"}</span>
        {activos && <button type="button" className="mk-btn" onClick={() => cambiar(FILTROS_VACIOS)}>Quitar filtros</button>}
      </div>
    </div>
  );
}

/** Columnas de la tabla de docentes y cómo se ordena cada una */
type ColDocente = "docente_id" | "docente_nombre" | "cargo" | "colegio" | "niveles_por_anio" | "permanencia";
const COLUMNAS: { clave: ColDocente; titulo: string }[] = [
  { clave: "docente_id", titulo: "Código" }, { clave: "docente_nombre", titulo: "Nombre" }, { clave: "cargo", titulo: "Cargo" },
  { clave: "colegio", titulo: "Colegio" }, { clave: "niveles_por_anio", titulo: "Nivel de formación por año" }, { clave: "permanencia", titulo: "Permanencia" },
];
const POR_PAGINA = 50;

/** per_tabla_docentes · ordenar por columna, páginas de 50 y mensaje cuando no hay resultados */
export function PerTablaDocentes({ filas, seleccionado, elegir, limpiar }: {
  filas: Perfil[]; seleccionado?: string; elegir: (id: string) => void; limpiar: () => void;
}) {
  const [orden, setOrden] = useState<{ col: ColDocente; asc: boolean }>({ col: "docente_nombre", asc: true });
  const [pagina, setPagina] = useState(0);
  // Al cambiar la búsqueda o los filtros, volver a la primera página
  const [filasPrevias, setFilasPrevias] = useState(filas);
  if (filasPrevias !== filas) { setFilasPrevias(filas); setPagina(0); }

  const ordenadas = useMemo(() => {
    const f = (r: Perfil) => String(r[orden.col] ?? "");
    return [...filas].sort((a, b) => f(a).localeCompare(f(b), "es", { numeric: true }) * (orden.asc ? 1 : -1));
  }, [filas, orden]);
  const paginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas - 1);
  const visibles = ordenadas.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA);
  const ordenar = (col: ColDocente) => setOrden((o) => ({ col, asc: o.col === col ? !o.asc : true }));

  if (!filas.length) {
    return (
      <div className="mk-vacio" data-componente="per_tabla_docentes">
        <span className="mk-vacio-icono" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8.5 11h5" /></svg>
        </span>
        <b>No hay docentes con esa búsqueda o filtros</b>
        <span>Prueba con otro nombre o quita alguno de los filtros.</span>
        <button type="button" className="mk-btn" onClick={limpiar}>Quitar búsqueda y filtros</button>
      </div>
    );
  }

  return (
    <div data-componente="per_tabla_docentes">
      <div className="mk-tw mk-tw-marco" style={{ marginTop: "var(--cds-gap-md)" }}>
        <table className="mk-table">
          <caption className="mk-sr">{filas.length} docentes</caption>
          <thead>
            <tr>{COLUMNAS.map((c) => (
              <th key={c.clave} aria-sort={orden.col === c.clave ? (orden.asc ? "ascending" : "descending") : "none"}>
                <button type="button" className="mk-th-orden" onClick={() => ordenar(c.clave)}>
                  {c.titulo}
                  <span className="mk-th-flecha" aria-hidden>{orden.col === c.clave ? (orden.asc ? "▲" : "▼") : "↕"}</span>
                </button>
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {visibles.map((r) => (
              <tr key={r.docente_id} className={r.docente_id === seleccionado ? "sel" : undefined} onClick={() => elegir(r.docente_id)}
                tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(r.docente_id); } }}>
                <td className="mk-td-codigo">{r.docente_id}</td><td className="mk-td-nombre">{r.docente_nombre}</td><td>{r.cargo}</td><td>{r.colegio}</td>
                <td>{r.niveles_por_anio}</td><td><span className="mk-pill mk-pill-verde">{r.permanencia}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mk-paginas">
        <span>{(actual * POR_PAGINA + 1).toLocaleString("es-CO")}–{Math.min((actual + 1) * POR_PAGINA, filas.length).toLocaleString("es-CO")} de {filas.length.toLocaleString("es-CO")}</span>
        <div>
          <button type="button" className="mk-btn" disabled={actual === 0} onClick={() => setPagina(actual - 1)} aria-label="Página anterior">‹ Anterior</button>
          <span className="mk-paginas-n">Página {actual + 1} de {paginas}</span>
          <button type="button" className="mk-btn" disabled={actual >= paginas - 1} onClick={() => setPagina(actual + 1)} aria-label="Página siguiente">Siguiente ›</button>
        </div>
      </div>
    </div>
  );
}

/** per_panel_ficha · la ficha del docente en un panel lateral (se cierra con ×, clic fuera o Esc) */
export function PerPanelFicha({ abierto, cerrar, children }: { abierto: boolean; cerrar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!abierto) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [abierto, cerrar]);
  if (!abierto) return null;
  return (
    <div className="mk-panel-lateral-fondo" onClick={cerrar} data-componente="per_panel_ficha">
      <aside className="mk-panel-lateral" role="dialog" aria-modal="true" aria-label="Ficha del docente" onClick={(e) => e.stopPropagation()}>
        <div className="mk-panel-lateral-cab">
          <h2>Ficha del docente</h2>
          <button type="button" className="mk-icono-btn" onClick={cerrar} aria-label="Cerrar ficha" title="Cerrar (Esc)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

/** per_ficha_docente */
export function PerFichaDocente({ perfil, historial }: { perfil?: Perfil; historial: Historial[] }) {
  if (!perfil) return <div data-componente="per_ficha_docente">—</div>;
  const datos: [string, string][] = [
    ["Código", perfil.docente_id],
    ["Género", perfil.genero ?? "—"],
    ["Colegio", perfil.colegio ?? "—"],
    ["Años cursados", perfil.anios],
    ["Último nivel de formación", perfil.ultimo_nivel_formacion ?? "—"],
    ["Asistencia", perfil.asistencia == null ? "—" : pct(perfil.asistencia)],
  ];
  return (
    <div className="mk-ficha" data-componente="per_ficha_docente">
      {/* Encabezado de la ficha: iniciales, nombre y etiquetas */}
      <div className="mk-ficha-cab">
        <span className="mk-ficha-avatar" aria-hidden>{iniciales(perfil.docente_nombre)}</span>
        <div>
          <div className="mk-fname">{perfil.docente_nombre}</div>
          <div className="mk-ficha-pills">
            <span className="mk-pill mk-pill-principal">{perfil.cargo ?? "—"}</span>
            <span className="mk-pill mk-pill-verde">{perfil.permanencia}</span>
          </div>
        </div>
      </div>
      <h3 className="mk-ficha-titulo">Datos generales</h3>
      <dl className="mk-dl">
        {datos.map(([etiqueta, v]) => (<div key={etiqueta} className="mk-dato"><dt>{etiqueta}</dt><dd>{v}</dd></div>))}
      </dl>
      <h3 className="mk-ficha-titulo">Historial por año</h3>
      <PerTablaHistorial filas={historial} />
    </div>
  );
}

/** Iniciales del nombre (máx. 2) para el círculo de la ficha */
function iniciales(nombre?: string | null) {
  const partes = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "")).toUpperCase();
}

/** Etiqueta tipo píldora para Sí / No / Sin dato */
function Estado({ v }: { v: string }) {
  const tipo = v === "Sí" ? "si" : v === "No" ? "no" : "nd";
  return <span className={`mk-estado mk-estado-${tipo}`}>{v}</span>;
}

/** per_tabla_historial */
export function PerTablaHistorial({ filas }: { filas: Historial[] }) {
  return (
    <div data-componente="per_tabla_historial">
      <div className="mk-note">Grupo y nivel de formación en cada año</div>
      <div className="mk-tw mk-tw-marco">
        <table className="mk-table">
          <thead>
            <tr><th>Año</th><th>Grupo</th><th>Nivel de formación</th><th>Entrada</th><th>Salida</th><th>Constancia</th></tr>
          </thead>
          <tbody>
            {filas.map((x, i) => (
              <tr key={`${x.anio_lectivo}-${i}`} style={{ cursor: "default" }}>
                <td>{x.anio_lectivo}</td><td style={{ whiteSpace: "nowrap" }}>{x.grupo}</td>
                <td style={{ fontWeight: 600 }}>{x.nivel_formacion}</td>
                <td><Estado v={x.prueba_entrada} /></td><td><Estado v={x.prueba_salida} /></td><td><Estado v={x.constancia} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
