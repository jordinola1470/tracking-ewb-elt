"use client";
// Pestaña Reporte (mientras el fact sheet está desactivado): descarga del entregable SED (formatos ancho y largo).
// Fuente: public.sed_entregable_ancho y public.sed_entregable_largo (Diamond). Solo para correos autorizados.
import { BotonDescarga } from "../comunes/boton_descarga";

export function RepDescargas() {
  return (
    <section className="mk-panel" data-seccion="reporte_descargas">
      <div className="mk-card" data-componente="rep_descarga_sed">
        <h2>Entregable SED</h2>
        <BotonDescarga nombre="rep_boton_sed" texto="Descargar Excel (formato ancho y largo)" cuerpo={() => ({ tipo: "sed" })} />
      </div>
    </section>
  );
}
