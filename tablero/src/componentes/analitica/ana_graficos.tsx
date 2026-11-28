"use client";
// Componentes de gráficos de la vista Analítica. Cada uno indica su fuente (tabla dbt).
import { useState } from "react";
import { Kpi, type Tono } from "./ana_kpis";
import type { CargoAnio, CargoDocentes, KpiAnio, NivelAnio, NivelCargo, NivelUltimo, Permanencia, Totales } from "@/lib/datos";
import { pctEje, BarrasHorizontales, BarrasVerticales, BarrasVerticalesApiladas, COLORES, COLORES_SERIE, Dona, RAYADO_PRINCIPAL, RAYADO_VERDE, entero, pct } from "../comunes/graficos";

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
  ana_graf_nivel_cargo_tabla: "Docentes de 2023 a 2026; cada uno cuenta una vez, con su último cargo (CARGO_ROL) y su último nivel cursado (nivel cursado, no certificado). B1 o más = B1, B1+, B2 y C1. Haz clic en una etiqueta para ver solo ese nivel.",
  ana_graf_nivel_ultimo: "Docentes según el último nivel que cursaron, del más bajo (PRE A1) al más alto (C1); los retirados cuentan con el nivel del curso del que se retiraron.",
};

/** Tema de cada gráfico: color de acento e ícono del título, agrupados por significado (el fondo sigue neutro) */
type Tema = "constancia" | "niveles" | "docentes" | "ied";
const TEMA: Record<string, Tema> = {
  ana_graf_constancia_anio: "constancia", ana_graf_constancia_nivel: "constancia", ana_graf_constancia_cargo: "constancia",
  ana_graf_pruebas_presentadas: "niveles", ana_graf_nivel_formacion: "niveles", ana_graf_nivel_ultimo: "niveles",
  ana_graf_nivel_cargo_tabla: "niveles",
  ana_graf_permanencia: "docentes", ana_graf_cargo_docentes: "docentes",
  ana_graf_ied_atendidas: "ied",
};
/** Ícono propio de cada gráfico (en el círculo del color de su tema); ninguno repite el de Perfiles (personas) */
const ICONO: Record<string, React.ReactNode> = {
  // Constancia año por año: calendario con visto bueno
  ana_graf_constancia_anio: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4" /></>,
  // Constancia por nivel: medalla
  ana_graf_constancia_nivel: <><circle cx="12" cy="9" r="5" /><path d="m9 13.5-1.5 7.5 4.5-2.5 4.5 2.5-1.5-7.5" /></>,
  // Constancia por cargo: diploma con sello
  ana_graf_constancia_cargo: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M7 8h6M7 11h4" /><circle cx="16" cy="15" r="3" /><path d="m14.5 17.5-.5 3.5 2-1 2 1-.5-3.5" /></>,
  // Pruebas presentadas: portapapeles con lista
  ana_graf_pruebas_presentadas: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10l1.5 1.5L13 9M9 16h6" /></>,
  // Nivel de formación: escalones
  ana_graf_nivel_formacion: <path d="M4 20V15h5v-5h5V5h6v15H4z" />,
  // Nivel actual: bandera de meta
  ana_graf_nivel_ultimo: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  // Nivel por cargo: tabla
  ana_graf_nivel_cargo_tabla: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 14.5h18M9 4v16M15 4v16" /></>,
  // Permanencia: reloj
  ana_graf_permanencia: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  // Docentes por cargo: maletín
  ana_graf_cargo_docentes: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></>,
  // IED atendidas: edificio
  ana_graf_ied_atendidas: <><path d="M3 21h18M5 21V10l7-5 7 5v11" /><path d="M10 21v-5h4v5" /></>,
};

function Tarjeta({ nombre, titulo, nota, ancho, children }: { nombre: string; titulo: string; nota: React.ReactNode; ancho?: boolean; children: React.ReactNode }) {
  const tema = TEMA[nombre];
  return (
    <div className="mk-card" data-componente={nombre} data-tema={tema} style={ancho ? { gridColumn: "1/-1" } : undefined}>
      <h2 className="mk-titulo-info">
        {tema && ICONO[nombre] && (
          <span className="mk-titulo-icono" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONO[nombre]}</svg>
          </span>
        )}
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
  // Mismo diseño que «Nivel actual»: PRE A1 arriba, color incremental, % junto a la barra y total a la derecha.
  // Solo se dibujan los niveles válidos (PRE A1 a C1); el % es sobre TODAS las participaciones del año
  const total = niveles.reduce((s, d) => s + d.matriculados, 0);
  const filas = niveles.filter((d) => d.orden_nivel <= 8)
    .map((d) => ({ nivel: d.nivel_formacion, n: d.matriculados, pct: total ? d.matriculados / total : 0 }));
  return (
    <Tarjeta nombre="ana_graf_nivel_formacion" ancho titulo="Nivel de formación de los docentes"
      nota="Participaciones del año por nivel del grupo asignado, de arriba (más bajo) hacia abajo (más alto). Junto a cada barra, el % del año; a la derecha, el total.">
      <BarrasHorizontales filas={filas} categoria={(d) => d.nivel.replace("_", " ")} valor={(d) => d.pct} formato={pct} formatoEje={pctEje}
        estilo={(d) => ({ color: NIVELES_CARGO.find((n) => n.nivel === d.nivel)?.color ?? COLORES[0] })}
        etiquetaBarra={(d) => pct(d.pct)} etiquetaValor={(d) => entero(d.n)} ejes encabezadoValor="Total"
        etiqueta="Participaciones por nivel de formación, de PRE A1 a C1" />
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

/** Color incremental por nivel: más intenso cuanto más alto (C1 el más oscuro) */
const ESTILO_NIVEL_ULTIMO = (d: NivelUltimo) => ({ color: NIVELES_CARGO.find((n) => n.nivel === d.nivel)?.color ?? COLORES[0] });
const PCT_NIVEL_ULTIMO = (d: NivelUltimo) => pct(d.pct_docentes);
const CANTIDAD_NIVEL_ULTIMO = (d: NivelUltimo) => entero(d.docentes);

/** ana_graf_nivel_ultimo · fuente: tab_nivel_ultimo (último nivel cursado de cada docente, corte actual) */
export function AnaGrafNivelUltimo({ niveles }: { niveles: NivelUltimo[] }) {
  const total = niveles.reduce((s, d) => s + d.docentes, 0);
  // PRE A1 arriba y C1 abajo (dbt los entrega de menor a mayor). Se dibujan solo los niveles válidos, pero el total
  // y los % incluyen a todos los docentes (también los que no tienen nivel registrado)
  const filas = niveles.filter((d) => d.orden_nivel <= 8);
  return (
    <Tarjeta nombre="ana_graf_nivel_ultimo" ancho titulo="Nivel actual de los docentes"
      nota={`Cada docente con su último nivel cursado, de arriba (más bajo) hacia abajo (más alto); el color se intensifica con el nivel. Junto a cada barra, el % del total; a la derecha, el total de docentes.`}>
      <div className="mk-total-grande"><b>{entero(total)}</b><span>docentes en total</span></div>
      <BarrasHorizontales filas={filas} categoria={(d) => d.nivel.replace("_", " ")} valor={(d) => d.pct_docentes} formato={pct} formatoEje={pctEje}
        estilo={ESTILO_NIVEL_ULTIMO} etiquetaBarra={PCT_NIVEL_ULTIMO} etiquetaValor={CANTIDAD_NIVEL_ULTIMO} ejes encabezadoValor="Total"
        etiqueta="Docentes según su último nivel cursado, de PRE A1 a C1" />
    </Tarjeta>
  );
}

/** Niveles en orden, de claro a oscuro (escala secuencial de la marca); los oscuros llevan el número en blanco */
const NIVELES_CARGO: { nivel: string; color: string; claro?: boolean }[] = [
  { nivel: "PRE_A1", color: "#A9D3AF" }, { nivel: "A1", color: "#8DC495" }, { nivel: "A2", color: "#70B47A" },
  { nivel: "A2+", color: "#56A562", claro: true }, { nivel: "B1", color: "#40984C", claro: true }, { nivel: "B1+", color: "#2C7A44", claro: true },
  { nivel: "B2", color: "#1B5745", claro: true }, { nivel: "C1", color: "#0C343D", claro: true },
];
/** B1 o más: orden_nivel 5 (B1) a 8 (C1) */
const ES_B1_O_MAS = (orden: number) => orden >= 5 && orden <= 8;
type FilaCargo = { cargo: string; total: number; b1: number; niveles: Record<string, number> };

/** Reagrupa por cargo las filas ya calculadas por dbt para el último año de corte (todo el programa) */
function agruparPorCargo(filas: NivelCargo[]) {
  const corte = Math.max(...filas.map((d) => d.anio_corte));
  const porCargo = new Map<string, FilaCargo>();
  filas.filter((d) => d.anio_corte === corte).forEach((d) => {
    const f = porCargo.get(d.cargo) ?? { cargo: d.cargo, total: 0, b1: 0, niveles: {} };
    f.total += d.docentes; f.niveles[d.nivel] = (f.niveles[d.nivel] ?? 0) + d.docentes;
    if (ES_B1_O_MAS(d.orden_nivel)) f.b1 += d.docentes;
    porCargo.set(d.cargo, f);
  });
  return { cargos: [...porCargo.values()].sort((a, b) => b.total - a.total) };
}
const nombreNivel = (n: string) => n.replace("_", " ");
const NIVELES_TODOS = NIVELES_CARGO.map((n) => n.nivel);

/** Etiquetas por nivel (mismo formato que las de «Por año»): PRE A1, A1, A2, A2+ y B1 o más */
const ETIQUETAS_NIVEL: { titulo: string; niveles: string[]; tono: Tono }[] = [
  { titulo: "PRE A1", niveles: ["PRE_A1"], tono: "medio" },
  { titulo: "A1", niveles: ["A1"], tono: "principal" },
  { titulo: "A2", niveles: ["A2"], tono: "mezcla" },
  { titulo: "A2+", niveles: ["A2+"], tono: "verde-oscuro" },
  { titulo: "B1 o más", niveles: ["B1", "B1+", "B2", "C1"], tono: "verde" },
];

/** ana_kpis_nivel · etiquetas por nivel que funcionan como filtro del mapa de calor (fuente: tab_nivel_cargo) */
function AnaKpisNivel({ cargos, elegido, elegir }: { cargos: FilaCargo[]; elegido: string | null; elegir: (t: string | null) => void }) {
  const suma = (niveles: string[]) => cargos.reduce((s, c) => s + niveles.reduce((t, n) => t + (c.niveles[n] ?? 0), 0), 0);
  // % sobre TODOS los docentes (incluidos los que no tienen nivel registrado, aunque no tengan etiqueta propia)
  const todos = cargos.reduce((s, c) => s + c.total, 0);
  return (
    <div className="mk-kpis mk-kpis-nivel" data-componente="ana_kpis_nivel">
      {ETIQUETAS_NIVEL.map((e) => {
        const n = suma(e.niveles), activo = elegido === e.titulo;
        return (
          <button key={e.titulo} type="button" className={`mk-kpi-boton${activo ? " activo" : ""}${elegido && !activo ? " apagado" : ""}`}
            aria-pressed={activo} title={activo ? "Ver todos los niveles" : `Ver solo ${e.titulo}`} onClick={() => elegir(activo ? null : e.titulo)}>
            <Kpi tono={e.tono} nombre={`ana_kpi_nivel_${e.titulo}`} icono="nivel" titulo={e.titulo} texto={entero(n)}
              pie={<span className="mk-chip">{todos ? pct(n / todos) : "—"} del total</span>} />
          </button>
        );
      })}
    </div>
  );
}

/** Celda del mapa de calor: verde más intenso cuanto mayor es el % de la fila */
const fondoCalor = (p: number) => `rgba(64, 152, 76, ${Math.min(0.9, 0.08 + p * 1.6).toFixed(2)})`;
function CeldaCalor({ n, t }: { n: number; t: number }) {
  const p = t ? n / t : 0;
  return (
    <td style={{ textAlign: "center", background: n ? fondoCalor(p) : undefined, color: p > 0.35 ? "#fff" : "var(--color-fg)", padding: "8px 6px" }}>
      {n ? <><b>{entero(n)}</b><br /><small>{pct(p)}</small></> : "—"}
    </td>
  );
}

/** ana_graf_nivel_cargo_tabla · etiquetas por nivel + mapa de calor por cargo; al elegir una etiqueta, la tabla muestra solo ese nivel */
export function AnaGrafNivelCargoTabla({ filas }: { filas: NivelCargo[] }) {
  const { cargos } = agruparPorCargo(filas);
  const [elegido, setElegido] = useState<string | null>(null);
  const etiqueta = ETIQUETAS_NIVEL.find((e) => e.titulo === elegido);
  const enNivel = (c: FilaCargo) => (etiqueta ? etiqueta.niveles.reduce((t, n) => t + (c.niveles[n] ?? 0), 0) : 0);
  const columnas = (etiqueta ? etiqueta.niveles : NIVELES_TODOS).filter((n) => cargos.some((c) => c.niveles[n]));
  // Con un nivel elegido, los cargos se ordenan por su % en ese nivel (de mayor a menor)
  const filasTabla = etiqueta ? [...cargos].sort((a, b) => enNivel(b) / b.total - enNivel(a) / a.total) : cargos;
  const resumen = etiqueta && etiqueta.niveles.length > 1;
  return (
    <Tarjeta nombre="ana_graf_nivel_cargo_tabla" ancho titulo="Nivel por cargo"
      nota={etiqueta
        ? <>Mostrando <b>{etiqueta.titulo}</b>: cargos ordenados por su % en ese nivel. Vuelve a hacer clic en la etiqueta para ver todos.</>
        : "Haz clic en una etiqueta para ver solo ese nivel. En la tabla, cantidad y % de cada cargo por nivel; el verde más intenso marca dónde se concentran los docentes."}>
      <AnaKpisNivel cargos={cargos} elegido={elegido} elegir={setElegido} />
      <div style={{ overflowX: "auto" }}>
        <table className="mk-table" style={{ minWidth: etiqueta ? 0 : 820 }}>
          <thead><tr>
            <th style={{ textAlign: "left" }}>Cargo</th>
            {columnas.map((n) => <th key={n} style={{ textAlign: "center" }}>{nombreNivel(n)}</th>)}
            {resumen && <th style={{ textAlign: "center", color: "var(--marca-verde)" }}>{etiqueta.titulo}</th>}
            <th style={{ textAlign: "center" }}>Total</th>
            {!etiqueta && <th style={{ textAlign: "center", color: "var(--marca-verde)" }}>B1 o más</th>}
          </tr></thead>
          <tbody>
            {filasTabla.map((c) => (
              <tr key={c.cargo}>
                <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{c.cargo}</td>
                {columnas.map((n) => <CeldaCalor key={n} n={c.niveles[n] ?? 0} t={c.total} />)}
                {resumen && <CeldaCalor n={enNivel(c)} t={c.total} />}
                <td style={{ textAlign: "center", fontWeight: 700 }}>{entero(c.total)}</td>
                {!etiqueta && <td style={{ textAlign: "center", fontWeight: 800, color: "var(--marca-verde)" }}>{entero(c.b1)}<br /><small>{pct(c.b1 / c.total)}</small></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
