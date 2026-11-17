"use client";
// Tablero completo: pestañas Analítica (subcategorías Histórico y Por año) y Perfiles.
// Solo filtra filas ya calculadas por dbt y dibuja.
import { useEffect, useMemo, useRef, useState } from "react";
import type { DatosTablero } from "@/lib/datos";
import { AnaFiltroAnio, AnaTextoResumen } from "./analitica/ana_encabezado";
import { AnaKpis } from "./analitica/ana_kpis";
import {
  AnaGrafConstanciaAnio, AnaGrafConstanciaCargo, AnaGrafConstanciaNivel,
  AnaGrafCargoDocentes, AnaGrafIedAtendidas, AnaGrafNivelFormacion, AnaGrafNivelUltimo, AnaGrafPermanencia, AnaGrafPruebasPresentadas,
} from "./analitica/ana_graficos";
import { RepFactSheet } from "./reporte/rep_fact_sheet";
import { BarraAvisos } from "./comunes/barra_avisos";
import { FILTROS_VACIOS, PerBuscador, PerFichaDocente, PerFiltros, PerPanelFicha, PerTablaDocentes, type FiltrosPerfil } from "./perfiles/per_componentes";

type Pestana = "analitica" | "perfiles" | "reporte";
type VistaAnalitica = "historico" | "por_anio";

export default function Tablero({ datos, usuario, salir }: { datos: DatosTablero; usuario: string; salir: () => Promise<void> }) {
  const anios = useMemo(() => datos.kpis.map((k) => k.anio_lectivo), [datos.kpis]);
  const [pestana, setPestana] = useState<Pestana>("analitica");
  const [vista, setVista] = useState<VistaAnalitica>("historico");
  const [anio, setAnio] = useState<number>(anios[anios.length - 1]);
  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<FiltrosPerfil>(FILTROS_VACIOS);
  const [seleccionado, setSeleccionado] = useState<string | undefined>(undefined);

  // ── Estado en el enlace (URL): pestaña, vista, año y filtros de Perfiles ──────────
  // Así se puede compartir lo que se ve y recargar sin perderlo; "atrás" vuelve a la vista anterior.
  // No se guardan el docente elegido ni la búsqueda (pueden contener datos personales).
  const navegacion = useRef<string | null>(null);
  const [enlaceLeido, setEnlaceLeido] = useState(false);
  useEffect(() => {
    const aplicar = () => {
      const q = new URLSearchParams(window.location.search);
      const pe = q.get("pestana"), vi = q.get("vista"), an = Number(q.get("anio"));
      const p: Pestana = pe === "perfiles" || pe === "reporte" ? pe : "analitica";
      const v: VistaAnalitica = vi === "por_anio" ? "por_anio" : "historico";
      navegacion.current = `${p}|${v}`;
      setPestana(p);
      setVista(v);
      if (anios.includes(an)) setAnio(an);
      setFiltros({ nivel: q.get("nivel") ?? "", cargo: q.get("cargo") ?? "", ied: q.get("ied") ?? "", permanencia: q.get("permanencia") ?? "" });
      setEnlaceLeido(true);
    };
    aplicar();
    window.addEventListener("popstate", aplicar);
    return () => window.removeEventListener("popstate", aplicar);
  }, [anios]);
  useEffect(() => {
    if (!enlaceLeido) return; // primero se aplica lo que dice el enlace; recién entonces se escribe
    const q = new URLSearchParams();
    if (pestana !== "analitica") q.set("pestana", pestana);
    if (pestana === "analitica" && vista === "por_anio") { q.set("vista", vista); q.set("anio", String(anio)); }
    if (pestana === "perfiles") (Object.entries(filtros) as [string, string][]).forEach(([k, v]) => { if (v) q.set(k, v); });
    const url = `${window.location.pathname}${q.toString() ? `?${q}` : ""}`;
    const nav = `${pestana}|${vista}`;
    if (nav !== navegacion.current) { window.history.pushState(null, "", url); navegacion.current = nav; }
    else window.history.replaceState(null, "", url);
  }, [enlaceLeido, pestana, vista, anio, filtros]);

  // Filtrar por año (sin cálculos)
  const kpi = datos.kpis.find((k) => k.anio_lectivo === anio);
  const nivelesAnio = useMemo(() => datos.niveles.filter((n) => n.anio_lectivo === anio), [datos.niveles, anio]);
  const cargosAnio = useMemo(() => datos.cargos.filter((c) => c.anio_lectivo === anio), [datos.cargos, anio]);

  // Buscar y filtrar docentes (sin cálculos: solo se comparan los valores que ya trae tab_perfiles)
  const perfilesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return datos.perfiles.filter((p) =>
      (!q || `${p.docente_nombre ?? ""} ${p.colegio ?? ""} ${p.docente_id}`.toLowerCase().includes(q)) &&
      (!filtros.nivel || (p.ultimo_nivel_formacion ?? "Sin dato") === filtros.nivel) &&
      (!filtros.cargo || (p.cargo ?? "Sin dato") === filtros.cargo) &&
      (!filtros.ied || (p.colegio ?? "Sin dato") === filtros.ied) &&
      (!filtros.permanencia || p.permanencia === filtros.permanencia));
  }, [datos.perfiles, busqueda, filtros]);
  const perfil = datos.perfiles.find((p) => p.docente_id === seleccionado);
  const historial = useMemo(() => datos.historial.filter((h) => h.docente_id === seleccionado), [datos.historial, seleccionado]);

  return (
    <div className="mk">
      {/* Contenedor superior, aparte: solo el título y el perfil del usuario.
          Debajo empiezan, a la misma altura, el botón EwB y la hoja elegida */}
      <header className="mk-cabecera mk-bloque">
      <div className="mk-head">
        <h1>English Without Borders</h1>
        {/* Menú secundario arriba a la derecha: perfil del usuario (sin cerrar sesión) */}
        <div className="mk-acciones">
        {/* Avisos (actualizado el + resumen) e información básica */}
        <BarraAvisos act={datos.actualizacion} />
        <div className="mk-perfil-usuario" data-componente="perfil_usuario">
          <span className="mk-avatar" aria-hidden>{(usuario || "?").charAt(0).toUpperCase()}</span>
          <span className="mk-user-txt">
            <b title={usuario}>{(usuario || "").split("@")[0]}</b>
            <small title={usuario}>{usuario}</small>
          </span>
          {/* Flecha: aquí se abrirá el menú secundario del perfil */}
          <svg className="mk-flecha" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
        </div>
        </div>
      </div>
      </header>

      <div className="mk-app">
      {/* Barra lateral vertical: marca · navegación · usuario abajo */}
      <aside className="mk-lateral">
        <div className="mk-marca mk-bloque"><span className="mk-logo" aria-hidden>EwB</span></div>
        <nav className="mk-tabs mk-bloque" role="tablist" aria-orientation="vertical">
          {(["analitica", "perfiles", "reporte"] as Pestana[]).map((p) => (
            <button key={p} className="mk-tab" role="tab" aria-selected={pestana === p} onClick={() => setPestana(p)}>
              {p === "analitica" && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
              )}
              {p === "perfiles" && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a6 6 0 0 0-4-5.6" /></svg>
              )}
              {p === "reporte" && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></svg>
              )}
              <span>{p === "analitica" ? "Analítica" : p === "perfiles" ? "Perfiles" : "Reporte"}</span>
            </button>
          ))}
        </nav>
        {/* Abajo: solo el círculo del usuario y el botón de salir */}
        <form action={salir} className="mk-user mk-bloque mk-user-mini">
          <span className="mk-avatar" aria-hidden title={usuario}>{(usuario || "?").charAt(0).toUpperCase()}</span>
          <button className="mk-icono-btn" type="submit" title="Cerrar sesión" aria-label="Cerrar sesión">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
            </svg>
          </button>
        </form>
        {/* Sello al pie de la barra vertical */}
        <small className="mk-sello">Desarrollado por TeseoDev · Medellín ©</small>
      </aside>

      <div className="mk-contenido">
      {pestana === "analitica" && (
        <>
          {/* Arriba de la hoja Analítica: resumen del año y subcategorías Histórico / Por año */}
          <div className="mk-hoja-cab mk-bloque">
            <div className="mk-subbarra">
              <nav className="mk-subtabs" role="tablist" aria-label="Vista de analítica">
                {(["historico", "por_anio"] as VistaAnalitica[]).map((v) => (
                  <button key={v} className="mk-subtab" role="tab" aria-selected={vista === v} onClick={() => setVista(v)}>
                    {v === "historico" ? "Histórico" : "Por año"}
                  </button>
                ))}
              </nav>
              {vista === "por_anio" && <AnaFiltroAnio anios={anios} valor={anio} cambiar={setAnio} />}
            </div>
            {/* El resumen es del año elegido: solo en "Por año", debajo de los botones y en letra pequeña */}
            {vista === "por_anio" && <AnaTextoResumen kpi={kpi} />}
          </div>
          {vista === "historico" && (
            <section className="mk-panel" data-seccion="historico">
              <div className="mk-grid mk-grid-2">
                <AnaGrafConstanciaAnio kpis={datos.kpis} />
                <AnaGrafPermanencia permanencia={datos.permanencia} />
                <AnaGrafIedAtendidas totales={datos.totales} kpis={datos.kpis} />
                <AnaGrafCargoDocentes cargos={datos.cargoDocentes} />
                <AnaGrafNivelUltimo niveles={datos.nivelUltimo} />
              </div>
            </section>
          )}

          {vista === "por_anio" && (
            <>
              <section className="mk-panel" data-seccion="por_anio_kpis">
                <AnaKpis kpi={kpi} />
              </section>
              {/* Intercambio: nivel de formación arriba (ancho) y pruebas presentadas abajo */}
              <section className="mk-panel" data-seccion="por_anio_nivel">
                <AnaGrafNivelFormacion niveles={nivelesAnio} />
              </section>
              <section className="mk-panel" data-seccion="por_anio_graficos">
                <div className="mk-grid mk-grid-3">
                  <AnaGrafConstanciaNivel niveles={nivelesAnio} />
                  <AnaGrafConstanciaCargo cargos={cargosAnio} />
                  <AnaGrafPruebasPresentadas kpi={kpi} />
                </div>
              </section>
            </>
          )}
        </>
      )}

      {pestana === "reporte" && <RepFactSheet fs={datos.factSheet} />}

      {pestana === "perfiles" && (
        <section className="mk-panel">
          <div className="mk-card">
            <h2>Docentes</h2>
            <p className="mk-note">Busca por nombre, colegio o código, filtra y haz clic en una fila para abrir la ficha.</p>
            <PerBuscador texto={busqueda} cambiar={setBusqueda} />
            <PerFiltros perfiles={datos.perfiles} filtros={filtros} cambiar={setFiltros} total={perfilesFiltrados.length} />
            <PerTablaDocentes filas={perfilesFiltrados} seleccionado={seleccionado} elegir={setSeleccionado}
              limpiar={() => { setFiltros(FILTROS_VACIOS); setBusqueda(""); }} />
          </div>
          {/* Ficha en panel lateral: se abre al elegir un docente */}
          <PerPanelFicha abierto={!!perfil} cerrar={() => setSeleccionado(undefined)}>
            <PerFichaDocente perfil={perfil} historial={historial} />
          </PerPanelFicha>
        </section>
      )}
      </div>
      </div>
    </div>
  );
}
