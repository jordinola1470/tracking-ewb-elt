"use client";
// Gráficos d3 reutilizables. Solo dibujan: no calculan.
import { useEffect, useRef } from "react";
import * as d3 from "d3";

export const pct = d3.format(".0%");
export const entero = d3.format(",d");
export const COLORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

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
        .style("left", Math.max(0, Math.min(x + 10, ancho - 220)) + "px").style("top", y - 28 + "px");
    },
    ocultar: () => tip.style("display", "none"),
  };
}

const sinDatos = (el: HTMLElement) => { el.textContent = "—"; };

/** Barras horizontales: una barra por categoría. */
export function BarrasHorizontales<T>(props: {
  filas: T[]; categoria: (d: T) => string; valor: (d: T) => number | null;
  formato: (v: number) => string; max?: number; alto?: number; etiqueta: string;
}) {
  const { filas, categoria, valor, formato, max, alto = 240, etiqueta } = props;
  const ref = useDibujo((el) => {
    const datos = filas.filter((d) => valor(d) != null);
    if (!datos.length) return sinDatos(el);
    const W = el.clientWidth || 320, H = alto;
    const svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", etiqueta);
    const tip = crearTooltip(el);
    const med = svg.append("g"); datos.forEach((d) => med.append("text").attr("font-size", 12).text(categoria(d)));
    const lw = d3.max(med.selectAll<SVGTextElement, unknown>("text").nodes(), (n) => n.getComputedTextLength()) || 60; med.remove();
    const L = lw + 14;
    const y = d3.scaleBand(datos.map(categoria), [8, H - 8]).padding(0.25);
    const x = d3.scaleLinear([0, max ?? (d3.max(datos, (d) => valor(d) as number) || 1)], [L, W - 52]);
    svg.append("g").attr("transform", `translate(${L},0)`).call(d3.axisLeft(y).tickSize(0)).call((a) => a.select(".domain").remove());
    svg.selectAll("rect.b").data(datos).join("rect").attr("x", L).attr("y", (d) => y(categoria(d)) ?? 0).attr("height", y.bandwidth())
      .attr("width", (d) => Math.max(0, x(valor(d) as number) - L)).attr("rx", 3).style("fill", COLORES[0])
      .on("pointermove", (ev, d) => tip.mostrar(ev, `${categoria(d)}: ${formato(valor(d) as number)}`)).on("pointerleave", tip.ocultar);
    svg.selectAll("text.v").data(datos).join("text").attr("x", (d) => x(valor(d) as number) + 4).attr("y", (d) => (y(categoria(d)) ?? 0) + y.bandwidth() / 2)
      .attr("dy", ".35em").attr("font-size", 12).style("fill", "var(--color-fg)").text((d) => formato(valor(d) as number));
  }, [filas, max, alto]);
  return <div className="mk-chart" ref={ref} />;
}

/** Barras verticales: una barra por categoría (ej. un año). */
export function BarrasVerticales<T>(props: {
  filas: T[]; categoria: (d: T) => string; valor: (d: T) => number | null;
  formato: (v: number) => string; max?: number; etiqueta: string;
}) {
  const { filas, categoria, valor, formato, max, etiqueta } = props;
  const ref = useDibujo((el) => {
    if (!filas.length) return sinDatos(el);
    const W = el.clientWidth || 320, H = 240, m = { t: 18, r: 12, b: 28, l: 36 };
    const svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", etiqueta);
    const tip = crearTooltip(el);
    const x = d3.scaleBand(filas.map(categoria), [m.l, W - m.r]).padding(0.2);
    const y = d3.scaleLinear().domain([0, max ?? (d3.max(filas, (d) => valor(d) ?? 0) || 1)]).nice().range([H - m.b, m.t]);
    svg.append("g").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickSizeOuter(0));
    svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4, max === 1 ? "%" : undefined).tickSize(-(W - m.l - m.r)))
      .call((a) => { a.select(".domain").remove(); a.selectAll(".tick line").style("stroke", "var(--cds-chart-grid)"); });
    const g = svg.selectAll("g.b").data(filas).join("g");
    g.append("rect").attr("x", (d) => x(categoria(d)) ?? 0).attr("width", x.bandwidth())
      .attr("y", (d) => y(valor(d) ?? 0)).attr("height", (d) => y(0) - y(valor(d) ?? 0)).attr("rx", 2).style("fill", COLORES[0])
      .on("pointermove", (ev, d) => tip.mostrar(ev, `${categoria(d)}: ${valor(d) == null ? "sin dato" : formato(valor(d) as number)}`)).on("pointerleave", tip.ocultar);
    g.append("text").attr("x", (d) => (x(categoria(d)) ?? 0) + x.bandwidth() / 2).attr("y", (d) => y(valor(d) ?? 0) - 4).attr("text-anchor", "middle")
      .attr("font-size", 12).style("fill", "var(--color-fg)").text((d) => (valor(d) == null ? "sin dato" : formato(valor(d) as number)));
  }, [filas, max]);
  return <div className="mk-chart" ref={ref} />;
}

/** Barras apiladas por categoría: un tramo por clave (ej. entrada y salida / solo entrada / sin entrada). */
export function BarrasApiladas<T>(props: {
  filas: T[]; categoria: (d: T) => string; total: (d: T) => number; extra: (d: T) => string;
  tramos: { valor: (d: T) => number; nombre: string; color: string; textoClaro?: boolean }[]; etiqueta: string;
}) {
  const { filas, categoria, total, extra, tramos, etiqueta } = props;
  const ref = useDibujo((el) => {
    if (!filas.length) return sinDatos(el);
    const W = el.clientWidth || 320, bh = 26, gap = 10, H = filas.length * (bh + gap) + 6;
    const svg = d3.select(el).append("svg").attr("width", "100%").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("aria-label", etiqueta);
    const tip = crearTooltip(el);
    const med = svg.append("g"); filas.forEach((d) => med.append("text").attr("font-size", 12).text(categoria(d)));
    const lw = d3.max(med.selectAll<SVGTextElement, unknown>("text").nodes(), (n) => n.getComputedTextLength()) || 80; med.remove();
    const L = lw + 12, R = 96;
    const x = d3.scaleLinear([0, d3.max(filas, total) || 1], [L, Math.max(L + 40, W - R)]);
    filas.forEach((d, i) => {
      const y = i * (bh + gap) + 3; const g = svg.append("g");
      g.append("text").attr("x", L - 8).attr("y", y + bh / 2).attr("dy", ".35em").attr("text-anchor", "end").attr("font-size", 12).style("fill", "var(--color-fg)").text(categoria(d));
      let acc = 0;
      tramos.forEach((t) => {
        const v = t.valor(d); if (!v) return;
        const x0 = x(acc), w = x(acc + v) - x0; acc += v;
        g.append("rect").attr("x", x0).attr("y", y).attr("width", Math.max(0, w - 1)).attr("height", bh).style("fill", t.color)
          .on("pointermove", (ev) => tip.mostrar(ev, `${categoria(d)} · ${t.nombre}: ${entero(v)} de ${entero(total(d))} (${pct(v / total(d))})`))
          .on("pointerleave", tip.ocultar);
        if (w > 22) g.append("text").attr("x", x0 + w / 2).attr("y", y + bh / 2).attr("dy", ".35em").attr("text-anchor", "middle").attr("font-size", 11)
          .style("fill", t.textoClaro ? "var(--color-bg)" : "var(--color-fg)").style("pointer-events", "none").text(entero(v));
      });
      g.append("text").attr("x", x(total(d)) + 6).attr("y", y + bh / 2).attr("dy", ".35em").attr("font-size", 12).style("fill", "var(--color-fg-muted)")
        .text(`${entero(total(d))} · `).append("tspan").style("fill", "var(--color-fg)").style("font-weight", 600).text(extra(d));
    });
  }, [filas]);
  return <div className="mk-chart" ref={ref} />;
}

/** Torta con leyenda. */
export function Torta<T>(props: { filas: T[]; categoria: (d: T) => string; valor: (d: T) => number; etiqueta: string }) {
  const { filas, categoria, valor, etiqueta } = props;
  const colores = [COLORES[0], COLORES[1], COLORES[2], COLORES[3], COLORES[4], "var(--cds-chart-muted)"];
  const ref = useDibujo((el) => {
    if (!filas.length) return sinDatos(el);
    const tot = d3.sum(filas, valor) || 1;
    const S = Math.min(220, Math.max(160, (el.clientWidth || 300) * 0.5)), R = S / 2;
    const caja = d3.select(el).append("div").style("position", "relative");
    const svg = caja.append("svg").attr("width", S).attr("height", S).attr("viewBox", `${-R} ${-R} ${S} ${S}`).attr("role", "img").attr("aria-label", etiqueta);
    const tip = crearTooltip(caja.node() as HTMLElement);
    const arcos = d3.pie<T>().sort(null).value(valor)(filas);
    const arco = d3.arc<d3.PieArcDatum<T>>().innerRadius(0).outerRadius(R - 2);
    svg.selectAll("path").data(arcos).join("path").attr("d", arco).style("fill", (_d, i) => colores[i % colores.length])
      .style("stroke", "var(--color-panel)").style("stroke-width", 2)
      .on("pointermove", (ev, d) => tip.mostrar(ev, `${categoria(d.data)}: ${entero(valor(d.data))} (${pct(valor(d.data) / tot)})`)).on("pointerleave", tip.ocultar);
    const centro = d3.arc<d3.PieArcDatum<T>>().innerRadius(R * 0.55).outerRadius(R * 0.55);
    svg.selectAll("text").data(arcos.filter((d) => d.endAngle - d.startAngle > 0.35)).join("text")
      .attr("transform", (d) => `translate(${centro.centroid(d)})`).attr("text-anchor", "middle").attr("dy", ".35em")
      .attr("font-size", 12).style("fill", "var(--color-bg)").style("font-weight", 600).text((d) => pct(valor(d.data) / tot));
    const ley = d3.select(el).append("div").attr("class", "mk-pie-l");
    filas.forEach((d, i) => { const it = ley.append("div"); it.append("i").style("background", colores[i % colores.length]); it.append("span").text(categoria(d) + ": "); it.append("b").text(entero(valor(d))); });
  }, [filas]);
  return <div className="mk-chart mk-pie" ref={ref} />;
}
