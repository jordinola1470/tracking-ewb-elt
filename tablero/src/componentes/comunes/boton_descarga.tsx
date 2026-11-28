"use client";
// Botón que pide un Excel a /api/descarga (POST) y lo guarda en el equipo. Muestra "Preparando…" mientras tanto.
import { useState } from "react";

export function BotonDescarga({ texto, cuerpo, nombre }: { texto: string; cuerpo: () => object; nombre: string }) {
  const [estado, setEstado] = useState<"listo" | "cargando" | "error">("listo");
  const [mensaje, setMensaje] = useState("");

  const descargar = async () => {
    setEstado("cargando"); setMensaje("");
    try {
      const r = await fetch("/api/descarga", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo()) });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "No se pudo descargar.");
      }
      const archivo = /filename="([^"]+)"/.exec(r.headers.get("content-disposition") ?? "")?.[1] ?? "descarga.xlsx";
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url; a.download = archivo; a.click();
      URL.revokeObjectURL(url);
      setEstado("listo");
    } catch (e) {
      setEstado("error"); setMensaje(e instanceof Error ? e.message : "No se pudo descargar.");
    }
  };

  return (
    <span className="mk-descarga" data-componente={nombre}>
      <button type="button" className="mk-btn mk-btn-descarga" onClick={descargar} disabled={estado === "cargando"}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
        </svg>
        {estado === "cargando" ? "Preparando…" : texto}
      </button>
      {estado === "error" && <small className="mk-descarga-error" role="alert">{mensaje}</small>}
    </span>
  );
}
