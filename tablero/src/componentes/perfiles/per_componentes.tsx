"use client";
// Componentes de la vista Perfiles: per_buscador, per_tabla_docentes, per_ficha_docente, per_tabla_historial
// Fuentes: tab_perfiles (una fila por docente) y tab_historial (una fila por docente y año).
import type { Historial, Perfil } from "@/lib/datos";
import { pct } from "../comunes/graficos";

/** per_buscador */
export function PerBuscador({ texto, cambiar }: { texto: string; cambiar: (t: string) => void }) {
  return (
    <input className="mk-search" type="search" placeholder="Buscar docente…" aria-label="Buscar docente"
      data-componente="per_buscador" value={texto} onChange={(e) => cambiar(e.target.value)} />
  );
}

/** per_tabla_docentes */
export function PerTablaDocentes({ filas, seleccionado, elegir }: { filas: Perfil[]; seleccionado?: string; elegir: (id: string) => void }) {
  return (
    <div className="mk-tw" style={{ marginTop: "var(--cds-gap-sm)" }} data-componente="per_tabla_docentes">
      <table className="mk-table">
        <thead>
          <tr><th>Código</th><th>Nombre</th><th>Cargo</th><th>Colegio</th><th>Nivel de formación por año</th><th>Permanencia</th></tr>
        </thead>
        <tbody>
          {filas.map((r) => (
            <tr key={r.docente_id} className={r.docente_id === seleccionado ? "sel" : undefined} onClick={() => elegir(r.docente_id)}>
              <td>{r.docente_id}</td><td>{r.docente_nombre}</td><td>{r.cargo}</td><td>{r.colegio}</td>
              <td>{r.niveles_por_anio}</td><td>{r.permanencia}</td>
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
    ["Nivel de formación actual", perfil.nivel_formacion_actual ?? "—"],
    ["Asistencia promedio", perfil.asistencia_promedio == null ? "—" : pct(perfil.asistencia_promedio)],
  ];
  return (
    <div data-componente="per_ficha_docente">
      <div className="mk-fname">{perfil.docente_nombre}</div>
      <div style={{ marginTop: 6 }}>
        <span className="mk-pill">{perfil.cargo ?? "—"}</span> <span className="mk-pill">{perfil.permanencia}</span>
      </div>
      <dl className="mk-dl">
        {datos.map(([etiqueta, v]) => (<div key={etiqueta} style={{ display: "contents" }}><dt>{etiqueta}</dt><dd>{v}</dd></div>))}
      </dl>
      <PerTablaHistorial filas={historial} />
    </div>
  );
}

/** per_tabla_historial */
export function PerTablaHistorial({ filas }: { filas: Historial[] }) {
  return (
    <div data-componente="per_tabla_historial">
      <div className="mk-note">Grupo y nivel de formación en cada año</div>
      <div className="mk-tw">
        <table className="mk-table">
          <thead>
            <tr><th>Año</th><th>Grupo</th><th>Nivel de formación</th><th>Entrada</th><th>Salida</th><th>Constancia</th></tr>
          </thead>
          <tbody>
            {filas.map((x, i) => (
              <tr key={`${x.anio_lectivo}-${i}`} style={{ cursor: "default" }}>
                <td>{x.anio_lectivo}</td><td style={{ whiteSpace: "nowrap" }}>{x.grupo}</td>
                <td style={{ fontWeight: 600 }}>{x.nivel_formacion}</td>
                <td>{x.prueba_entrada}</td><td>{x.prueba_salida}</td><td>{x.constancia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
