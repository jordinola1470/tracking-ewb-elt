// Quién puede descargar archivos con datos personales (Perfiles y entregable SED).
// Lista blanca en la variable de entorno TABLERO_DESCARGA_CORREOS, separada por comas:
//   - un correo completo:  persona@ejemplo.org
//   - un dominio completo: @ejemplo.org   (cualquier correo de ese dominio)
// Si la variable no existe o está vacía, NADIE puede descargar (seguro por defecto).
import "server-only";

export function puedeDescargar(correo?: string | null): boolean {
  const c = correo?.trim().toLowerCase();
  if (!c) return false;
  const lista = (process.env.TABLERO_DESCARGA_CORREOS ?? "")
    .split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return lista.some((x) => (x.startsWith("@") ? c.endsWith(x) : c === x));
}
