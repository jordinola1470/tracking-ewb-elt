"use client";
// Componentes de la vista Perfiles: per_buscador, per_tabla_docentes, per_ficha_docente, per_tabla_historial
// Fuentes: tab_perfiles (una fila por docente) y tab_historial (una fila por docente y año).
import { useState } from "react";
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

/** Filas por página de la tabla de docentes */
const POR_PAGINA = 6;

/** per_tabla_docentes · 8 docentes por página, con flechas abajo a la derecha */
export function PerTablaDocentes({ filas, seleccionado, elegir }: { filas: Perfil[]; seleccionado?: string; elegir: (id: string) => void }) {
  const [pagina, setPagina] = useState(0);
  // Si cambian la búsqueda o los filtros, se vuelve a la primera página
  const [filasPrevias, setFilasPrevias] = useState(filas);
  if (filasPrevias !== filas) { setFilasPrevias(filas); setPagina(0); }

  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas - 1);
  const desde = actual * POR_PAGINA;
  const visibles = filas.slice(desde, desde + POR_PAGINA);
  const n = (x: number) => x.toLocaleString("es-CO");

  return (
    <div data-componente="per_tabla_docentes">
      <div className="mk-tw mk-tw-marco mk-tw-paginada" style={{ marginTop: "var(--cds-gap-md)" }}>
        <table className="mk-table mk-table-fija">
          <caption className="mk-sr">{filas.length} docentes</caption>
          <colgroup>
            <col style={{ width: "10%" }} /><col style={{ width: "19%" }} /><col style={{ width: "12%" }} />
            <col style={{ width: "19%" }} /><col style={{ width: "14%" }} /><col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} /><col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr><th>Código</th><th>Nombre</th><th>Cargo</th><th>Colegio</th><th>Nivel de formación por año</th><th>MCER entrada</th><th>MCER salida</th><th>Permanencia</th></tr>
          </thead>
          <tbody>
            {visibles.map((r) => (
              <tr key={r.docente_id} className={r.docente_id === seleccionado ? "sel" : undefined} onClick={() => elegir(r.docente_id)}>
                <td className="mk-td-codigo" title={r.docente_id}>{r.docente_id}</td><td className="mk-td-nombre" title={r.docente_nombre ?? undefined}>{r.docente_nombre}</td>
                <td title={r.cargo ?? undefined}>{r.cargo}</td><td title={r.colegio ?? undefined}>{r.colegio}</td>
                <td title={r.niveles_por_anio ?? undefined}>{r.niveles_por_anio}</td>
                <td className="mk-td-mcer">{r.mcer_entrada ?? "-"}</td><td className="mk-td-mcer">{r.mcer_salida ?? "-"}</td>
                <td title={r.permanencia ?? undefined}><span className="mk-pill mk-pill-verde">{r.permanencia}</span></td>
              </tr>
            ))}
            {/* Filas vacías para que la última página mida lo mismo que las demás */}
            {Array.from({ length: filas.length > 0 ? POR_PAGINA - visibles.length : 0 }, (_, i) => (
              <tr key={`vacia-${i}`} className="mk-fila-vacia" aria-hidden><td colSpan={8} /></tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Paginación abajo a la derecha */}
      {filas.length > 0 && (
        <nav className="mk-paginador" aria-label="Páginas de la tabla de docentes">
          <span className="mk-paginador-txt">{n(desde + 1)}–{n(desde + visibles.length)} de {n(filas.length)}</span>
          <button type="button" className="mk-paginador-btn" onClick={() => setPagina(actual - 1)} disabled={actual === 0} aria-label="Página anterior" title="Anterior">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <span className="mk-paginador-pag" aria-live="polite">{actual + 1} / {paginas}</span>
          <button type="button" className="mk-paginador-btn" onClick={() => setPagina(actual + 1)} disabled={actual >= paginas - 1} aria-label="Página siguiente" title="Siguiente">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </nav>
      )}
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
            <tr><th>Año</th><th>Grupo</th><th>Nivel de formación</th><th>Entrada</th><th>MCER entrada</th><th>Salida</th><th>MCER salida</th><th>Constancia</th></tr>
          </thead>
          <tbody>
            {filas.map((x, i) => (
              <tr key={`${x.anio_lectivo}-${i}`} style={{ cursor: "default" }}>
                <td>{x.anio_lectivo}</td><td style={{ whiteSpace: "nowrap" }}>{x.grupo}</td>
                <td style={{ fontWeight: 600 }}>{x.nivel_formacion}</td>
                <td><Estado v={x.prueba_entrada} /></td><td className="mk-td-mcer">{x.mcer_entrada ?? "-"}</td>
                <td><Estado v={x.prueba_salida} /></td><td className="mk-td-mcer">{x.mcer_salida ?? "-"}</td>
                <td><Estado v={x.constancia} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
