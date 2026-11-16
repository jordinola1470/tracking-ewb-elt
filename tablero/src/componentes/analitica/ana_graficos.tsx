"use client";
// Componentes de gráficos de la vista Analítica. Cada uno indica su fuente (tabla dbt).
import type { CargoAnio, KpiAnio, NivelAnio, Permanencia } from "@/lib/datos";
import { BarrasApiladas, BarrasHorizontales, BarrasVerticalesApiladas, COLORES, COLORES_SERIE, Dona, RAYADO_PRINCIPAL, RAYADO_VERDE, entero, pct } from "../comunes/graficos";

function Tarjeta({ nombre, titulo, nota, ancho, children }: { nombre: string; titulo: string; nota: React.ReactNode; ancho?: boolean; children: React.ReactNode }) {
  return (
    <div className="mk-card" data-componente={nombre} style={ancho ? { gridColumn: "1/-1" } : undefined}>
      <h2>{titulo}</h2>
      <p className="mk-note">{nota}</p>
      {children}
    </div>
  );
}

/** ana_graf_pruebas_nivel · fuente: tab_pruebas_nivel_anio (del año) */
export function AnaGrafPruebasNivel({ niveles }: { niveles: NivelAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_pruebas_nivel" ancho titulo="Pruebas presentadas por nivel de formación"
      nota="Cada barra es el total de matriculados en el nivel; a la derecha, el % que completó entrada y salida.">
      <div className="mk-legend">
        <span><i style={{ background: COLORES[0] }} />Entrada y salida</span>
        <span><i style={{ background: COLORES[1] }} />Solo entrada</span>
        <span><i className="mk-rayado" />Sin prueba de entrada</span>
      </div>
      <BarrasApiladas filas={niveles} categoria={(d) => d.nivel_formacion} total={(d) => d.matriculados} extra={(d) => pct(d.pct_entrada_salida)}
        etiqueta="Matriculados por nivel de formación divididos según las pruebas presentadas"
        tramos={[
          { valor: (d) => d.con_entrada_salida, nombre: "Entrada y salida", color: COLORES[0], textoClaro: true },
          { valor: (d) => d.solo_entrada, nombre: "Solo entrada", color: COLORES[1], textoClaro: true },
          { valor: (d) => d.sin_entrada, nombre: "Sin prueba de entrada", rayado: RAYADO_PRINCIPAL },
        ]} />
    </Tarjeta>
  );
}

/** ana_graf_constancia_anio · fuente: tab_kpis_anio (todos los años) */
export function AnaGrafConstanciaAnio({ kpis }: { kpis: KpiAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_constancia_anio" titulo="Constancia, año por año" nota="Cada año se mide por separado; no se acumula. Arriba, el % con constancia.">
      <div className="mk-legend">
        <span><i style={{ background: COLORES[0] }} />Con constancia</span>
        <span><i className="mk-rayado-verde" />Sin constancia</span>
      </div>
      <BarrasVerticalesApiladas filas={kpis} categoria={(d) => String(d.anio_lectivo)}
        etiquetaArriba={(d) => (d.pct_constancia == null ? "sin dato" : pct(d.pct_constancia))}
        etiqueta="Docentes con y sin constancia en cada año"
        tramos={[
          { valor: (d) => d.con_constancia ?? 0, nombre: "Con constancia", color: COLORES[0] },
          { valor: (d) => d.sin_constancia ?? 0, nombre: "Sin constancia", rayado: RAYADO_VERDE },
        ]} />
    </Tarjeta>
  );
}

/** ana_graf_permanencia · fuente: tab_permanencia (todos los años) */
export function AnaGrafPermanencia({ permanencia }: { permanencia: Permanencia[] }) {
  const total = permanencia.reduce((s, d) => s + d.docentes, 0);
  const continuos = permanencia.filter((d) => d.es_continuo).reduce((s, d) => s + d.docentes, 0);
  const anios = permanencia.length ? Math.max(...permanencia.map((d) => d.anios_participados)) : 0;
  return (
    <Tarjeta nombre="ana_graf_permanencia" titulo="Permanencia de los docentes"
      nota={`Todos los años${anios ? ` (hasta ${anios})` : ""}. Continua = 2 o más años seguidos.`}>
      <div className="mk-progreso" role="img" aria-label={`${continuos} de ${total} docentes en forma continua`}>
        <div className="mk-progreso-relleno" style={{ width: total ? `${(continuos / total) * 100}%` : 0 }} />
      </div>
      <div className="mk-progreso-l">
        <span><b>{entero(continuos)}</b> en forma continua</span>
        <span>de <b>{entero(total)}</b> docentes</span>
      </div>
      <div className="mk-dona-fila">
        <Dona filas={permanencia} categoria={(d) => d.permanencia} valor={(d) => d.docentes}
          centro={entero(total)} subcentro="docentes" etiqueta="Docentes según los años en que participaron" />
        <ul className="mk-lista">
          {permanencia.map((d, i) => (
            <li key={d.permanencia}>
              <i style={{ background: COLORES_SERIE[i % COLORES_SERIE.length] }} />
              <span className="mk-lista-nombre">{d.permanencia}<small>{entero(d.docentes)} docentes</small></span>
              <b>{total ? pct(d.docentes / total) : "—"}</b>
            </li>
          ))}
        </ul>
      </div>
    </Tarjeta>
  );
}

/** ana_graf_constancia_nivel · fuente: tab_pruebas_nivel_anio (del año) */
export function AnaGrafConstanciaNivel({ niveles }: { niveles: NivelAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_constancia_nivel" titulo="% con constancia por nivel de formación" nota="Del año elegido.">
      <BarrasHorizontales filas={niveles} categoria={(d) => d.nivel_formacion} valor={(d) => d.pct_constancia} formato={pct} max={1}
        etiqueta="Porcentaje con constancia por nivel de formación" />
    </Tarjeta>
  );
}

/** ana_graf_constancia_cargo · fuente: tab_constancia_cargo_anio (del año) */
export function AnaGrafConstanciaCargo({ cargos }: { cargos: CargoAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_constancia_cargo" titulo="% con constancia por cargo" nota="Del año elegido.">
      <BarrasHorizontales filas={cargos} categoria={(d) => d.cargo} valor={(d) => d.pct_constancia} formato={pct} max={1} color={COLORES[1]}
        etiqueta="Porcentaje con constancia por cargo" />
    </Tarjeta>
  );
}

/** ana_graf_nivel_formacion · fuente: tab_pruebas_nivel_anio (del año) */
export function AnaGrafNivelFormacion({ niveles }: { niveles: NivelAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_nivel_formacion" titulo="Nivel de formación de los docentes" nota="Participaciones del año por nivel del grupo asignado.">
      <BarrasHorizontales filas={niveles} categoria={(d) => d.nivel_formacion} valor={(d) => d.matriculados} formato={entero}
        etiqueta="Participaciones por nivel de formación" />
    </Tarjeta>
  );
}
