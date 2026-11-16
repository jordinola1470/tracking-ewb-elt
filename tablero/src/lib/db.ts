// Conexión de SOLO LECTURA a Supabase con el rol ewb_tablero (solo puede leer `public`).
// Solo se usa en el servidor: el navegador nunca ve estas credenciales.
//   TABLERO_DB_HOST, TABLERO_DB_PORT, TABLERO_DB_USER, TABLERO_DB_PASS, TABLERO_DB_NAME, TABLERO_DB_SSLMODE
import "server-only";
import postgres from "postgres";

const leer = (nombre: string): string => {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
};

let cliente: postgres.Sql | null = null;

export function db(): postgres.Sql {
  if (!cliente) {
    cliente = postgres({
      host: leer("TABLERO_DB_HOST"),
      port: Number(leer("TABLERO_DB_PORT")),
      username: leer("TABLERO_DB_USER"),
      password: leer("TABLERO_DB_PASS"),
      database: leer("TABLERO_DB_NAME"),
      ssl: (process.env.TABLERO_DB_SSLMODE?.trim() || "require") === "disable" ? false : "require",
      // Puerto 6543 (transaction pooler de Supabase): admite muchos usuarios a la vez (el 5432 solo 15).
      // Requiere prepare:false y consultas una por una (ver datos.ts).
      prepare: false,
      max: 1,
      idle_timeout: 20,
      // Nunca esperar sin fin: si la base no responde, error claro en vez de "cargando" eterno
      connect_timeout: 10,
      connection: { statement_timeout: 15000 },
    });
  }
  return cliente;
}

/** Descarta la conexión actual (por ejemplo, tras un límite de tiempo) para que el siguiente intento empiece de cero. */
export function reiniciarDb(): void {
  const anterior = cliente;
  cliente = null;
  anterior?.end({ timeout: 0 }).catch(() => {});
}
