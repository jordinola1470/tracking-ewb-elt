// Arma un archivo Excel (.xlsx) en el servidor. Los textos se guardan como texto (N° Documento y DANE
// conservan los ceros a la izquierda); los porcentajes, como número con formato 0.00 %.
import "server-only";
import ExcelJS from "exceljs";

export type Columna = { titulo: string; clave: string; porcentaje?: boolean };
export type Hoja = { nombre: string; columnas: Columna[]; filas: Record<string, unknown>[] };

export async function crearExcel(hojas: Hoja[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.created = new Date();
  for (const h of hojas) {
    const hoja = libro.addWorksheet(h.nombre.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    hoja.columns = h.columnas.map((c) => ({
      header: c.titulo, key: c.clave, width: Math.min(45, Math.max(12, c.titulo.length + 4)),
      style: c.porcentaje ? { numFmt: "0.00%" } : undefined,
    }));
    for (const f of h.filas) {
      hoja.addRow(Object.fromEntries(h.columnas.map((c) => [c.clave, normalizar(f[c.clave])])));
    }
    hoja.getRow(1).font = { bold: true };
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: h.columnas.length } };
  }
  return Buffer.from(await libro.xlsx.writeBuffer());
}

/** Fechas a texto ISO; null y undefined, a celda vacía; el resto tal cual */
function normalizar(v: unknown): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v;
}
