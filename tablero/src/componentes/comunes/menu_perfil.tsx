"use client";
// Componente: menu_perfil (arriba a la derecha). La píldora del usuario abre un menú con su correo y "Cerrar sesión".
import { useEffect, useRef, useState } from "react";

export function MenuPerfil({ usuario, salir }: { usuario: string; salir: () => Promise<void> }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inicial = (usuario || "?").charAt(0).toUpperCase();

  // Cerrar al hacer clic fuera o con Esc
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", esc); };
  }, [abierto]);

  return (
    <div className="mk-menu-perfil" ref={ref} data-componente="menu_perfil">
      <button type="button" className="mk-perfil-usuario" aria-haspopup="menu" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        <span className="mk-avatar" aria-hidden>{inicial}</span>
        <span className="mk-user-txt">
          <b title={usuario}>{(usuario || "").split("@")[0]}</b>
          <small title={usuario}>{usuario}</small>
        </span>
        <svg className={`mk-flecha${abierto ? " abierta" : ""}`} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {abierto && (
        <div className="mk-popover mk-popover-perfil" role="menu" aria-label="Opciones de la cuenta">
          <div className="mk-perfil-cab">
            <span className="mk-avatar" aria-hidden>{inicial}</span>
            <div>
              <b>{(usuario || "").split("@")[0]}</b>
              <small>{usuario}</small>
            </div>
          </div>
          <form action={salir}>
            <button type="submit" className="mk-menu-item" role="menuitem">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
              </svg>
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
