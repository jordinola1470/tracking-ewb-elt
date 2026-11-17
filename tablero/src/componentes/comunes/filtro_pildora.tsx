"use client";
// Filtro en forma de píldora: icono · etiqueta pequeña · valor elegido · flecha.
// El <select> real cubre toda la píldora (invisible), así cualquier clic abre la lista.
// tamano "grande" = filtro principal (año); "pequeno" = filtros secundarios (Perfiles), para marcar jerarquía.

export type OpcionFiltro = { valor: string; texto: string };

const ICONOS: Record<string, React.ReactNode> = {
  calendario: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  nivel: <path d="M4 20V14M10 20V9M16 20V4M2 20h20" />,
  cargo: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></>,
  ied: <><path d="M3 21h18M5 21V10l7-5 7 5v11" /><path d="M10 21v-5h4v5" /></>,
  permanencia: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

export function FiltroPildora({ etiqueta, icono, valor, opciones, cambiar, tamano = "pequeno", nombre }: {
  etiqueta: string; icono: keyof typeof ICONOS | string; valor: string; opciones: OpcionFiltro[];
  cambiar: (v: string) => void; tamano?: "grande" | "pequeno"; nombre?: string;
}) {
  const texto = opciones.find((o) => o.valor === valor)?.texto ?? "";
  return (
    <label className={`mk-pildora-filtro mk-pildora-${tamano}${valor ? " activo" : ""}`} data-componente={nombre} title={`${etiqueta}: ${texto}`}>
      <span className="mk-pildora-icono" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONOS[icono]}</svg>
      </span>
      <span className="mk-pildora-txt">
        <small>{etiqueta}</small>
        <span className="mk-pildora-valor">{texto}</span>
      </span>
      <svg className="mk-pildora-flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m6 9 6 6 6-6" />
      </svg>
      <select aria-label={etiqueta} value={valor} onChange={(e) => cambiar(e.target.value)}>
        {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
      </select>
    </label>
  );
}
