"use client";
// Componentes de la vista Perfiles: per_buscador, per_tabla_docentes, per_ficha_docente, per_tabla_historial
// Fuentes: tab_perfiles (una fila por docente) y tab_historial (una fila por docente y año).
import type { Historial, Perfil } from "@/lib/datos";
import { pct } from "../comunes/graficos";

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

/** per_tabla_docentes */
export function PerTablaDocentes({ filas, seleccionado, elegir }: { filas: Perfil[]; seleccionado?: string; elegir: (id: string) => void }) {
  return (
    <div className="mk-tw mk-tw-marco" style={{ marginTop: "var(--cds-gap-md)" }} data-componente="per_tabla_docentes">
      <table className="mk-table">
        <caption className="mk-sr">{filas.length} docentes</caption>
        <thead>
          <tr><th>Código</th><th>Nombre</th><th>Cargo</th><th>Colegio</th><th>Nivel de formación por año</th><th>Permanencia</th></tr>
        </thead>
        <tbody>
          {filas.map((r) => (
            <tr key={r.docente_id} className={r.docente_id === seleccionado ? "sel" : undefined} onClick={() => elegir(r.docente_id)}>
              <td className="mk-td-codigo">{r.docente_id}</td><td className="mk-td-nombre">{r.docente_nombre}</td><td>{r.cargo}</td><td>{r.colegio}</td>
              <td>{r.niveles_por_anio}</td><td><span className="mk-pill mk-pill-verde">{r.permanencia}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
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
