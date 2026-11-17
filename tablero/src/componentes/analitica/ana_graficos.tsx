"use client";
// Componentes de gráficos de la vista Analítica. Cada uno indica su fuente (tabla dbt).
import type { CargoAnio, CargoDocentes, KpiAnio, NivelAnio, NivelUltimo, Permanencia, Totales } from "@/lib/datos";
import { BarrasHorizontales, BarrasVerticales, BarrasVerticalesApiladas, COLORES, COLORES_SERIE, Dona, RAYADO_PRINCIPAL, RAYADO_VERDE, entero, pct } from "../comunes/graficos";

/** Qué mide cada gráfico (ícono ⓘ junto al título). Un solo lugar para editar los textos. */
const INFO: Record<string, string> = {
  ana_graf_pruebas_presentadas: "Participaciones del año con prueba de entrada, con prueba de salida y sin cada una. Una participación es un docente en un año.",
  ana_graf_constancia_anio: "Docentes con y sin constancia en cada año. El % se calcula sobre quienes tienen el dato; un año sin ese campo muestra «sin dato».",
  ana_graf_permanencia: "Años distintos en que participó cada docente. «Consecutivos» = sin interrumpir; «continua» = 2 años o más consecutivos.",
  ana_graf_constancia_nivel: "% de participaciones con constancia, por nivel de formación (nivel del grupo asignado), en el año elegido.",
  ana_graf_constancia_cargo: "% de participaciones con constancia, por cargo, en el año elegido.",
  ana_graf_nivel_formacion: "Participaciones del año según el nivel del grupo al que se asignó a cada docente.",
  ana_graf_ied_atendidas: "Instituciones distintas (por código DANE) con al menos un docente: total de todos los años y por año.",
  ana_graf_cargo_docentes: "Docentes de todos los años; cada uno cuenta una vez, con el último cargo registrado.",
  ana_graf_nivel_ultimo: "Toda la población de docentes según el último nivel que cursó sin retirarse. «Sin nivel registrado» = sin un nivel cursado válido.",
};

function Tarjeta({ nombre, titulo, nota, ancho, children }: { nombre: string; titulo: string; nota: React.ReactNode; ancho?: boolean; children: React.ReactNode }) {
  return (
    <div className="mk-card" data-componente={nombre} style={ancho ? { gridColumn: "1/-1" } : undefined}>
      <h2 className="mk-titulo-info">
        {titulo}
        {INFO[nombre] && (
          <span className="mk-info" tabIndex={0} role="note" aria-label={`Qué mide: ${INFO[nombre]}`}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
            <span className="mk-info-texto" aria-hidden>{INFO[nombre]}</span>
          </span>
        )}
      </h2>
      <p className="mk-note">{nota}</p>
      {children}
    </div>
  );
}

/** Categorías del gráfico de pruebas: solo reacomoda los conteos que ya calculó dbt (sin cálculos) */
type FilaPrueba = { categoria: string; valor: number; sin: boolean };
const ESTILO_PRUEBA = (d: FilaPrueba) => (d.sin ? { rayado: RAYADO_PRINCIPAL } : { color: d.categoria === "Salida" ? COLORES[1] : COLORES[0] });

/** ana_graf_pruebas_presentadas · fuente: tab_kpis_anio (del año) */
export function AnaGrafPruebasPresentadas({ kpi }: { kpi?: KpiAnio }) {
  const filas: FilaPrueba[] = kpi ? [
    { categoria: "Entrada", valor: kpi.con_entrada, sin: false },
    { categoria: "Salida", valor: kpi.con_salida, sin: false },
    { categoria: "Sin prueba de entrada", valor: kpi.sin_entrada, sin: true },
    { categoria: "Sin prueba de salida", valor: kpi.sin_salida, sin: true },
  ] : [];
  return (
    <Tarjeta nombre="ana_graf_pruebas_presentadas" titulo="Pruebas presentadas" nota="Participaciones del año según la prueba presentada.">
      <BarrasHorizontales filas={filas} categoria={(d) => d.categoria} valor={(d) => d.valor} formato={entero} estilo={ESTILO_PRUEBA}
        etiqueta="Participaciones del año con y sin prueba de entrada y de salida" />
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
  return (
    <Tarjeta nombre="ana_graf_permanencia" titulo="Permanencia de los docentes"
      nota="Cuántos años ha participado cada docente. «Continua»: dos años o más sin interrupción.">
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
        <ul className="mk-lista mk-lista-tabla">
          <li className="mk-lista-cab" aria-hidden><i /><span>Permanencia</span><span>Docentes</span><span>%</span></li>
          {permanencia.map((d, i) => (
            <li key={d.permanencia}>
              <i style={{ background: COLORES_SERIE[i % COLORES_SERIE.length] }} />
              <span className="mk-lista-nombre">{d.permanencia}</span>
              <span className="mk-lista-num">{entero(d.docentes)}</span>
              <b className="mk-lista-num">{total ? pct(d.docentes / total) : "—"}</b>
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
    <Tarjeta nombre="ana_graf_nivel_formacion" ancho titulo="Nivel de formación de los docentes" nota="Participaciones del año por nivel del grupo asignado.">
      <BarrasHorizontales filas={niveles} categoria={(d) => d.nivel_formacion} valor={(d) => d.matriculados} formato={entero}
        etiqueta="Participaciones por nivel de formación" />
    </Tarjeta>
  );
}

/** ana_graf_ied_atendidas · fuente: tab_totales (total) y tab_kpis_anio (por año) */
export function AnaGrafIedAtendidas({ totales, kpis }: { totales: Totales | null; kpis: KpiAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_ied_atendidas" titulo="IED atendidas" nota="Instituciones distintas con docentes en el programa: total de todos los años y cada año.">
      <div className="mk-total-grande"><b>{totales ? entero(totales.ied_total) : "—"}</b><span>IED en total</span></div>
      <BarrasVerticales filas={kpis} categoria={(d) => String(d.anio_lectivo)} valor={(d) => d.ied_unicas} formato={entero}
        etiqueta="IED atendidas en cada año" />
    </Tarjeta>
  );
}

/** ana_graf_cargo_docentes · fuente: tab_cargo_docentes (último cargo registrado de cada docente) */
export function AnaGrafCargoDocentes({ cargos }: { cargos: CargoDocentes[] }) {
  const total = cargos.reduce((s, d) => s + d.docentes, 0);
  return (
    <Tarjeta nombre="ana_graf_cargo_docentes" titulo="Docentes por cargo" nota="Todos los años. Cada docente cuenta una vez, con su último cargo registrado.">
      <div className="mk-total-grande"><b>{entero(total)}</b><span>docentes</span></div>
      <BarrasHorizontales filas={cargos} categoria={(d) => d.cargo} valor={(d) => d.docentes} formato={entero} color={COLORES[1]}
        etiqueta="Docentes por cargo (último cargo registrado)" />
    </Tarjeta>
  );
}

/** Estilo: niveles en color principal; "Sin nivel registrado" rayado */
const ESTILO_NIVEL_ULTIMO = (d: NivelUltimo) => (d.orden_nivel >= 98 ? { rayado: RAYADO_PRINCIPAL } : { color: COLORES[0] });
const ETIQUETA_NIVEL_ULTIMO = (d: NivelUltimo) => `${entero(d.docentes)} · ${pct(d.pct_docentes)}`;

/** ana_graf_nivel_ultimo · fuente: tab_nivel_ultimo (último nivel cursado de cada docente, corte actual) */
export function AnaGrafNivelUltimo({ niveles }: { niveles: NivelUltimo[] }) {
  const total = niveles.reduce((s, d) => s + d.docentes, 0);
  return (
    <Tarjeta nombre="ana_graf_nivel_ultimo" ancho titulo="Nivel actual de los docentes"
      nota="Toda la población, cada docente con su último nivel cursado (sin contar años en que se retiró). A la derecha, cantidad y % del total.">
      <div className="mk-total-grande"><b>{entero(total)}</b><span>docentes en total</span></div>
      <BarrasHorizontales filas={niveles} categoria={(d) => d.nivel} valor={(d) => d.docentes} formato={entero}
        estilo={ESTILO_NIVEL_ULTIMO} etiquetaValor={ETIQUETA_NIVEL_ULTIMO} etiqueta="Docentes según su último nivel cursado" />
    </Tarjeta>
  );
}
