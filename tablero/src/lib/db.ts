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
      // Compatible con el "transaction pooler" de Supabase (recomendado para funciones serverless)
      prepare: false,
      max: 1,
      idle_timeout: 20,
    });
  }
  return cliente;
}
