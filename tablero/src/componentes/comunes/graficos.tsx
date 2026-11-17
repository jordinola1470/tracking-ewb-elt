"use client";
// Gráficos d3 reutilizables. Solo dibujan: no calculan.
import { useEffect, useId, useRef } from "react";
import * as d3 from "d3";

export const pct = d3.format(".0%");
export const entero = d3.format(",d");
export const COLORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
/** Colores en orden para series categóricas (dona y su leyenda) */
export const COLORES_SERIE = [...COLORES, "var(--cds-chart-muted)"];
/** Relleno rayado (patrón) para "sin dato / sin prueba" */
export const rayado = (id: string) => `url(#${id})`;

const RADIO = 6;   // esquinas redondeadas de las barras
const SEP = 3;     // separación entre tramos de una barra apilada

/** Vuelve a dibujar cuando cambian los datos o el ancho de la ventana. */
function useDibujo(dibujar: (el: HTMLDivElement) => void, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pintar = () => { el.replaceChildren(); dibujar(el); };
    pintar();
    const obs = new ResizeObserver(() => pintar());
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function crearTooltip(el: HTMLElement) {
  const tip = d3.select(el).append("div").attr("class", "mk-tip").style("display", "none");
  const ancho = el.clientWidth || 320;
  return {
    mostrar: (ev: PointerEvent, texto: string) => {
      const [x, y] = d3.pointer(ev, el);
      tip.style("display", null).text(texto)
        .style("left", Math.max(0, Math.min(x + 10, ancho - 230)) + "px").style("top", y - 30 + "px");
    },
    ocultar: () => tip.style("display", "none"),
  };
}

/** Rayado con contraste: color de fondo + raya diagonal más oscura. */
export type Rayado = { fondo: string; raya: string };
export const RAYADO_PRINCIPAL: Rayado = { fondo: "var(--principal-claro)", raya: "var(--principal-medio)" };
export const RAYADO_VERDE: Rayado = { fondo: "var(--verde-medio)", raya: "var(--marca-verde)" };

/** Patrón de rayas diagonales (para "sin prueba", "sin constancia" y años sin dato). */
function definirRayado(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, id: string, r: Rayado = RAYADO_PRINCIPAL) {
  const p = svg.append("defs").append("pattern").attr("id", id).attr("width", 7).attr("height", 7)
    .attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)");
  p.append("rect").attr("width", 7).attr("height", 7).style("fill", r.fondo);
  p.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 7).style("stroke", r.raya).style("stroke-width", 3.5);
}

const sinDatos = (el: HTMLElement) => { el.textContent = "—"; };
const limpiarId = (id: string) => "r" + id.replace(/[^a-zA-Z0-9]/g, "");

/** Barras horizontales: una barra por categoría, con pista de fondo cuando hay un máximo (ej. 100 %). */
export function BarrasHorizontales<T>(props: {
  filas: T[]; categoria: (d: T) => string; valor: (d: T) => number | null;
  formato: (v: number) => string; max?: number; alto?: number; etiqueta: string; color?: string;
  /** Opcional: color o rayado propio para cada barra */
  estilo?: (d: T) => { color?: string; rayado?: Rayado };
}) {
  const { filas, categoria, valor, formato, max, alto, etiqueta, color = COLORES[0], estilo } = props;
  const id = limpiarId(useId());
  const ref = useDibujo((el) => {
    const datos = filas.filter((d) => valor(d) != null);
    if (!datos.length) return sinDatos(el);
    const bh = 22, gap = 12, W = el.clientWidth || 320, H = alto ?? datos.length * (bh + gap) + 8;
    const svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", etiqueta);
    datos.forEach((d, i) => { const r = estilo?.(d).rayado; if (r) definirRayado(svg, `${id}b${i}`, r); });
    const relleno = (d: T, i: number) => { const e = estilo?.(d); return e?.rayado ? rayado(`${id}b${i}`) : (e?.color ?? color); };
    const tip = crearTooltip(el);
    const med = svg.append("g"); datos.forEach((d) => med.append("text").attr("font-size", 12).text(categoria(d)));
    const lw = d3.max(med.selectAll<SVGTextElement, unknown>("text").nodes(), (n) => n.getComputedTextLength()) || 60; med.remove();
    const L = lw + 14, R = 52;
    const y = d3.scaleBand(datos.map(categoria), [4, H - 4]).paddingInner(0.35);
    const x = d3.scaleLinear([0, max ?? (d3.max(datos, (d) => valor(d) as number) || 1)], [L, W - R]);
    svg.append("g").selectAll("text").data(datos).join("text").attr("x", L - 8).attr("y", (d) => (y(categoria(d)) ?? 0) + y.bandwidth() / 2)
      .attr("dy", ".35em").attr("text-anchor", "end").attr("font-size", 12).style("fill", "var(--color-fg)").text(categoria);
    if (max != null) svg.selectAll("rect.pista").data(datos).join("rect").attr("x", L).attr("y", (d) => y(categoria(d)) ?? 0)
      .attr("width", W - R - L).attr("height", y.bandwidth()).attr("rx", RADIO).style("fill", "var(--principal-suave)");
    svg.selectAll("rect.b").data(datos).join("rect").attr("x", L).attr("y", (d) => y(categoria(d)) ?? 0).attr("height", y.bandwidth())
      .attr("width", (d) => Math.max(RADIO, x(valor(d) as number) - L)).attr("rx", RADIO).style("fill", (d, i) => relleno(d, i))
      .on("pointermove", (ev, d) => tip.mostrar(ev, `${categoria(d)}: ${formato(valor(d) as number)}`)).on("pointerleave", tip.ocultar);
    svg.selectAll("text.v").data(datos).join("text").attr("x", W - R + 8).attr("y", (d) => (y(categoria(d)) ?? 0) + y.bandwidth() / 2)
      .attr("dy", ".35em").attr("font-size", 12).attr("font-weight", 700).style("fill", "var(--color-fg)").text((d) => formato(valor(d) as number));
  }, [filas, max, alto, color, estilo]);
  return <div className="mk-chart" ref={ref} />;
}

/** Barras verticales: una barra por categoría (ej. un año), con pista de fondo. */
export function BarrasVerticales<T>(props: {
  filas: T[]; categoria: (d: T) => string; valor: (d: T) => number | null;
  formato: (v: number) => string; max?: number; etiqueta: string;
}) {
  const { filas, categoria, valor, formato, max, etiqueta } = props;
  const id = limpiarId(useId());
  const ref = useDibujo((el) => {
    if (!filas.length) return sinDatos(el);
    const W = el.clientWidth || 320, H = 260, m = { t: 22, r: 8, b: 28, l: 36 };
    const svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", etiqueta);
    definirRayado(svg, id);
    const tip = crearTooltip(el);
    const x = d3.scaleBand(filas.map(categoria), [m.l, W - m.r]).padding(0.35);
    const top = max ?? (d3.max(filas, (d) => valor(d) ?? 0) || 1);
    const y = d3.scaleLinear().domain([0, top]).nice().range([H - m.b, m.t]);
    svg.append("g").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickSize(0).tickPadding(8)).call((a) => a.select(".domain").remove());
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4, max === 1 ? "%" : undefined).tickSize(-(W - m.l - m.r)))
      .call((a) => { a.select(".domain").remove(); a.selectAll(".tick line").style("stroke", "var(--cds-chart-grid)"); });
    const g = svg.selectAll("g.b").data(filas).join("g");
    // Pista: la barra completa de fondo (rayada si el año no tiene dato)
    g.append("rect").attr("x", (d) => x(categoria(d)) ?? 0).attr("width", x.bandwidth()).attr("y", y(top)).attr("height", y(0) - y(top))
      .attr("rx", RADIO).style("fill", (d) => (valor(d) == null ? rayado(id) : "var(--principal-suave)"));
    g.append("rect").attr("x", (d) => x(categoria(d)) ?? 0).attr("width", x.bandwidth())
      .attr("y", (d) => y(valor(d) ?? 0)).attr("height", (d) => y(0) - y(valor(d) ?? 0)).attr("rx", RADIO).style("fill", COLORES[0])
      .on("pointermove", (ev, d) => tip.mostrar(ev, `${categoria(d)}: ${valor(d) == null ? "sin dato" : formato(valor(d) as number)}`)).on("pointerleave", tip.ocultar);
    g.append("text").attr("x", (d) => (x(categoria(d)) ?? 0) + x.bandwidth() / 2).attr("y", (d) => (valor(d) == null ? y(top) : y(valor(d) as number)) - 6)
      .attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).style("fill", "var(--color-fg)")
      .text((d) => (valor(d) == null ? "sin dato" : formato(valor(d) as number)));
  }, [filas, max]);
  return <div className="mk-chart" ref={ref} />;
}

/** Barras apiladas por categoría: tramos redondeados y separados; un tramo puede ir rayado. */
export function BarrasApiladas<T>(props: {
  filas: T[]; categoria: (d: T) => string; total: (d: T) => number; extra: (d: T) => string;
  tramos: { valor: (d: T) => number; nombre: string; color?: string; rayado?: Rayado; textoClaro?: boolean }[]; etiqueta: string;
}) {
  const { filas, categoria, total, extra, tramos, etiqueta } = props;
  const id = limpiarId(useId());
  const ref = useDibujo((el) => {
    if (!filas.length) return sinDatos(el);
    const W = el.clientWidth || 320, bh = 26, gap = 12, H = filas.length * (bh + gap) + 6;
    const svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", etiqueta);
    tramos.forEach((t, k) => { if (t.rayado) definirRayado(svg, `${id}t${k}`, t.rayado); });
    const tip = crearTooltip(el);
    const med = svg.append("g"); filas.forEach((d) => med.append("text").attr("font-size", 12).text(categoria(d)));
    const lw = d3.max(med.selectAll<SVGTextElement, unknown>("text").nodes(), (n) => n.getComputedTextLength()) || 80; med.remove();
    const L = lw + 12, R = 92;
    const x = d3.scaleLinear([0, d3.max(filas, total) || 1], [L, Math.max(L + 40, W - R)]);
    filas.forEach((d, i) => {
      const y = i * (bh + gap) + 3; const g = svg.append("g");
      g.append("text").attr("x", L - 8).attr("y", y + bh / 2).attr("dy", ".35em").attr("text-anchor", "end").attr("font-size", 12).style("fill", "var(--color-fg)").text(categoria(d));
      let acc = 0;
      tramos.forEach((t, k) => {
        const v = t.valor(d); if (!v) return;
        const x0 = x(acc), w = x(acc + v) - x0; acc += v;
        g.append("rect").attr("x", x0).attr("y", y).attr("width", Math.max(2, w - SEP)).attr("height", bh).attr("rx", RADIO)
          .style("fill", t.rayado ? rayado(`${id}t${k}`) : (t.color ?? COLORES[0]))
          .on("pointermove", (ev) => tip.mostrar(ev, `${categoria(d)} · ${t.nombre}: ${entero(v)} de ${entero(total(d))} (${pct(v / total(d))})`))
          .on("pointerleave", tip.ocultar);
        if (w > 24) g.append("text").attr("x", x0 + (w - SEP) / 2).attr("y", y + bh / 2).attr("dy", ".35em").attr("text-anchor", "middle").attr("font-size", 11)
          .attr("font-weight", 700).style("fill", t.textoClaro ? "#fff" : "var(--color-fg)").style("pointer-events", "none").text(entero(v));
      });
      g.append("text").attr("x", x(total(d)) + 6).attr("y", y + bh / 2).attr("dy", ".35em").attr("font-size", 12).style("fill", "var(--color-fg-muted)")
        .text(`${entero(total(d))} · `).append("tspan").style("fill", "var(--color-fg)").style("font-weight", 700).text(extra(d));
    });
  }, [filas]);
  return <div className="mk-chart" ref={ref} />;
}

/** Dona con el total al centro. La leyenda se dibuja aparte (en HTML) con COLORES_SERIE. */
export function Dona<T>(props: { filas: T[]; categoria: (d: T) => string; valor: (d: T) => number; centro: string; subcentro: string; etiqueta: string }) {
  const { filas, categoria, valor, centro, subcentro, etiqueta } = props;
  const ref = useDibujo((el) => {
    if (!filas.length) return sinDatos(el);
    const tot = d3.sum(filas, valor) || 1, S = 190, R = S / 2;
    const svg = d3.select(el).append("svg").attr("width", S).attr("height", S).attr("viewBox", `${-R} ${-R} ${S} ${S}`).attr("role", "img").attr("aria-label", etiqueta);
    const tip = crearTooltip(el);
    const arcos = d3.pie<T>().sort(null).padAngle(0.025).value(valor)(filas);
    const arco = d3.arc<d3.PieArcDatum<T>>().innerRadius(R * 0.64).outerRadius(R - 2).cornerRadius(5);
    svg.selectAll("path").data(arcos).join("path").attr("d", arco).style("fill", (_d, i) => COLORES_SERIE[i % COLORES_SERIE.length])
      .on("pointermove", (ev, d) => tip.mostrar(ev, `${categoria(d.data)}: ${entero(valor(d.data))} (${pct(valor(d.data) / tot)})`)).on("pointerleave", tip.ocultar);
    svg.append("text").attr("text-anchor", "middle").attr("dy", "-.05em").attr("font-size", 30).attr("font-weight", 800).style("fill", "var(--marca-principal)").text(centro);
    svg.append("text").attr("text-anchor", "middle").attr("dy", "1.6em").attr("font-size", 12).style("fill", "var(--color-fg-muted)").text(subcentro);
  }, [filas, centro, subcentro]);
  return <div className="mk-dona" ref={ref} />;
}

/** Barras verticales apiladas: un tramo sólido abajo y otro (rayado) arriba; etiqueta (ej. %) sobre la barra. */
export function BarrasVerticalesApiladas<T>(props: {
  filas: T[]; categoria: (d: T) => string; etiquetaArriba: (d: T) => string; etiqueta: string;
  tramos: { valor: (d: T) => number; nombre: string; color?: string; rayado?: Rayado }[];
}) {
  const { filas, categoria, etiquetaArriba, etiqueta, tramos } = props;
  const id = limpiarId(useId());
  const ref = useDibujo((el) => {
    const datos = filas.filter((d) => tramos.some((t) => t.valor(d) > 0));
    if (!datos.length) return sinDatos(el);
    const W = el.clientWidth || 320, H = 270, m = { t: 26, r: 8, b: 28, l: 40 };
    const svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", etiqueta);
    tramos.forEach((t, k) => { if (t.rayado) definirRayado(svg, `${id}t${k}`, t.rayado); });
    const tip = crearTooltip(el);
    const total = (d: T) => tramos.reduce((s, t) => s + t.valor(d), 0);
    const x = d3.scaleBand(datos.map(categoria), [m.l, W - m.r]).padding(0.38);
    const y = d3.scaleLinear().domain([0, d3.max(datos, total) || 1]).nice().range([H - m.b, m.t]);
    // Cuadrícula punteada y ejes X e Y visibles (línea sólida)
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(W - m.l - m.r)))
      .call((a) => { a.select(".domain").remove(); a.selectAll(".tick line").style("stroke", "var(--cds-chart-grid)").style("stroke-dasharray", "3 4"); });
    svg.append("g").attr("class", "eje").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(4).tickFormat(() => ""));
    svg.append("g").attr("class", "eje").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickSize(4).tickPadding(8));
    svg.selectAll(".eje .domain, .eje .tick line").style("stroke", "var(--principal-medio)").style("stroke-width", 1.5);
    datos.forEach((d) => {
      let acc = 0; const x0 = x(categoria(d)) ?? 0;
      tramos.forEach((t, k) => {
        const v = t.valor(d); if (!v) return;
        const yTop = y(acc + v), h = y(acc) - yTop; acc += v;
        svg.append("rect").attr("x", x0).attr("width", x.bandwidth()).attr("y", yTop).attr("height", Math.max(2, h - SEP)).attr("rx", RADIO)
          .style("fill", t.rayado ? rayado(`${id}t${k}`) : (t.color ?? COLORES[0]))
          .on("pointermove", (ev) => tip.mostrar(ev, `${categoria(d)} · ${t.nombre}: ${entero(v)} de ${entero(total(d))}`)).on("pointerleave", tip.ocultar);
        // Etiqueta con el valor encima del tramo (píldora blanca con sombra)
        if (h > 22) {
          const cx = x0 + x.bandwidth() / 2, cy = yTop + (h - SEP) / 2, txt = entero(v), ancho = txt.length * 7.5 + 16;
          const et = svg.append("g").style("pointer-events", "none");
          et.append("rect").attr("x", cx - ancho / 2).attr("y", cy - 10).attr("width", ancho).attr("height", 20).attr("rx", 10)
            .style("fill", "#fff").style("filter", "drop-shadow(0 1px 2px rgba(12,52,61,.25))");
          et.append("text").attr("x", cx).attr("y", cy).attr("dy", ".35em").attr("text-anchor", "middle").attr("font-size", 12)
            .attr("font-weight", 700).style("fill", "var(--marca-principal)").text(txt);
        }
      });
      svg.append("text").attr("x", x0 + x.bandwidth() / 2).attr("y", y(total(d)) - 8).attr("text-anchor", "middle")
        .attr("font-size", 13).attr("font-weight", 800).style("fill", "var(--color-fg)").text(etiquetaArriba(d));
    });
  }, [filas]);
  return <div className="mk-chart" ref={ref} />;
}
