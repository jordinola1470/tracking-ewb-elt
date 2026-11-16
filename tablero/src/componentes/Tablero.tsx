"use client";
// Tablero completo: pestañas Analítica y Perfiles. Solo filtra filas ya calculadas por dbt y dibuja.
import { useMemo, useState } from "react";
import type { DatosTablero } from "@/lib/datos";
import { AnaFiltroAnio, AnaTextoResumen } from "./analitica/ana_encabezado";
import { AnaKpis } from "./analitica/ana_kpis";
import {
  AnaGrafConstanciaAnio, AnaGrafConstanciaCargo, AnaGrafConstanciaNivel,
  AnaGrafNivelFormacion, AnaGrafPermanencia, AnaGrafPruebasNivel,
} from "./analitica/ana_graficos";
import { PerBuscador, PerFichaDocente, PerTablaDocentes } from "./perfiles/per_componentes";

type Pestana = "analitica" | "perfiles";

export default function Tablero({ datos, usuario, salir }: { datos: DatosTablero; usuario: string; salir: () => Promise<void> }) {
  const anios = useMemo(() => datos.kpis.map((k) => k.anio_lectivo), [datos.kpis]);
  const [pestana, setPestana] = useState<Pestana>("analitica");
  const [anio, setAnio] = useState<number>(anios[anios.length - 1]);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<string | undefined>(datos.perfiles[0]?.docente_id);

  // Filtrar por año (sin cálculos)
  const kpi = datos.kpis.find((k) => k.anio_lectivo === anio);
  const nivelesAnio = useMemo(() => datos.niveles.filter((n) => n.anio_lectivo === anio), [datos.niveles, anio]);
  const cargosAnio = useMemo(() => datos.cargos.filter((c) => c.anio_lectivo === anio), [datos.cargos, anio]);

  // Buscar docentes (sin cálculos)
  const perfilesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return datos.perfiles;
    return datos.perfiles.filter((p) => `${p.docente_nombre ?? ""} ${p.colegio ?? ""} ${p.docente_id}`.toLowerCase().includes(q));
  }, [datos.perfiles, busqueda]);
  const perfil = datos.perfiles.find((p) => p.docente_id === seleccionado);
  const historial = useMemo(() => datos.historial.filter((h) => h.docente_id === seleccionado), [datos.historial, seleccionado]);

  return (
    <div className="mk">
      <div className="mk-head">
        <div>
          <h1>Formación docente en inglés</h1>
        </div>
        <form action={salir} className="mk-user">
          <span>{usuario}</span>
          <button className="mk-btn" type="submit">Cerrar sesión</button>
        </form>
      </div>

      <div className="mk-tabs" role="tablist">
        {(["analitica", "perfiles"] as Pestana[]).map((p) => (
          <button key={p} className="mk-tab" role="tab" aria-selected={pestana === p} onClick={() => setPestana(p)}>
            {p === "analitica" ? "Analítica" : "Perfiles de docentes"}
          </button>
        ))}
      </div>

      {pestana === "analitica" && (
        <>
          {/* 1. Histórico: no usa filtros (todos los años) */}
          <section className="mk-seccion" data-seccion="historico">
            <h2 className="mk-seccion-titulo">Histórico · todos los años</h2>
            <div className="mk-grid">
              <AnaGrafConstanciaAnio kpis={datos.kpis} />
              <AnaGrafPermanencia permanencia={datos.permanencia} />
            </div>
          </section>

          {/* 2. Por año: todo lo de esta sección responde al filtro */}
          <section className="mk-seccion" data-seccion="por_anio">
            <h2 className="mk-seccion-titulo">Por año</h2>
            <AnaFiltroAnio anios={anios} valor={anio} cambiar={setAnio} />
            <AnaTextoResumen kpi={kpi} />
            <AnaKpis kpi={kpi} />
            <div className="mk-grid">
              <AnaGrafPruebasNivel niveles={nivelesAnio} />
              <AnaGrafConstanciaNivel niveles={nivelesAnio} />
              <AnaGrafConstanciaCargo cargos={cargosAnio} />
              <AnaGrafNivelFormacion niveles={nivelesAnio} />
            </div>
          </section>
        </>
      )}

      {pestana === "perfiles" && (
        <section>
          <div className="mk-perf">
            <div className="mk-card">
              <h2>Docentes</h2>
              <p className="mk-note">Busca por nombre, colegio o código y selecciona una fila para ver su ficha.</p>
              <PerBuscador texto={busqueda} cambiar={setBusqueda} />
              <PerTablaDocentes filas={perfilesFiltrados} seleccionado={seleccionado} elegir={setSeleccionado} />
            </div>
            <div className="mk-card">
              <h2>Ficha del docente</h2>
              <PerFichaDocente perfil={perfil} historial={historial} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
