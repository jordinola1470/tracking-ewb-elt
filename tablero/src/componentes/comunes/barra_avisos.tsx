"use client";
// Componente: barra_avisos (arriba a la derecha).
// Avisos (campana): "Actualizado el …" de producción y un resumen de lo que muestra el tablero.
// Información (i): datos básicos del tablero. Fuente: tab_actualizacion.
import { useEffect, useRef, useState } from "react";
import type { Actualizacion } from "@/lib/datos";

type Panel = "avisos" | "info" | null;

/** "2026-11-17T09:41" (hora de Colombia) -> "17 de noviembre de 2026, 9:41 a. m." */
function fecha(iso: string | null | undefined) {
  if (!iso) return "sin registro";
  const [d, h] = iso.split("T");
  const [a, m, dia] = d.split("-").map(Number);
  const [hh, mm] = (h ?? "00:00").split(":").map(Number);
  return new Date(a, m - 1, dia, hh, mm).toLocaleString("es-CO", {
    day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function BarraAvisos({ act }: { act: Actualizacion | null }) {
  const [abierto, setAbierto] = useState<Panel>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera o con Esc
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(null); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", esc); };
  }, [abierto]);

  const alternar = (p: Panel) => setAbierto((a) => (a === p ? null : p));

  return (
    <div className="mk-iconos" ref={ref} data-componente="barra_avisos">
      <button type="button" className="mk-icono-sup" aria-label="Avisos" aria-expanded={abierto === "avisos"} title="Avisos" onClick={() => alternar("avisos")}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        <span className="mk-punto" aria-hidden />
      </button>
      <button type="button" className="mk-icono-sup" aria-label="Información" aria-expanded={abierto === "info"} title="Información" onClick={() => alternar("info")}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
      </button>

      {abierto === "avisos" && (
        <div className="mk-popover mk-popover-avisos" role="dialog" aria-label="Avisos">
          <p className="mk-popover-eyebrow">Avisos</p>
          <div className="mk-popover-dato">
            <span className="mk-popover-icono" aria-hidden>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
            </span>
            <div>
              <b>Actualizado el {fecha(act?.transformado_en)}</b>
              <small>Última carga de datos: {fecha(act?.cargado_en)}</small>
            </div>
          </div>
          <p className="mk-popover-titulo">Qué muestra el tablero</p>
          <ul className="mk-popover-lista">
            <li><b>Analítica · Histórico:</b> constancia año a año, permanencia, IED atendidas, docentes por cargo y nivel actual.</li>
            <li><b>Analítica · Por año:</b> indicadores del año, nivel de formación, constancia por nivel y cargo, y pruebas presentadas.</li>
            <li><b>Perfiles:</b> lista de docentes con filtros y la ficha de cada uno.</li>
            <li><b>Reporte:</b> fact sheet del programa para descargar en PDF.</li>
          </ul>
          {act && <p className="mk-popover-pie">{act.registros.toLocaleString("es-CO")} registros hasta {act.ultimo_anio}.</p>}
        </div>
      )}

      {abierto === "info" && (
        <div className="mk-popover mk-popover-info" role="dialog" aria-label="Información">
          <p className="mk-popover-eyebrow">Información</p>
          <p className="mk-popover-texto">
            Tablero de seguimiento de la formación docente en inglés del programa <b>English Without Borders</b>.
          </p>
          <ul className="mk-popover-lista">
            <li>Los datos vienen de las bases anuales del programa y se actualizan cuando llega una base nueva.</li>
            <li>Solo pueden entrar las cuentas de Gmail u Outlook autorizadas.</li>
            <li>Pasa el cursor por el ícono ⓘ de cada gráfico para ver qué mide.</li>
          </ul>
          <p className="mk-popover-pie">Desarrollado por TeseoDev · Medellín ©</p>
        </div>
      )}
    </div>
  );
}
