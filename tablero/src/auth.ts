// Inicio de sesión con Auth.js: Google (Gmail) y Microsoft (Outlook).
// Las credenciales se leen solas de las variables de entorno:
//   AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET,
//   AUTH_MICROSOFT_ENTRA_ID_ID, AUTH_MICROSOFT_ENTRA_ID_SECRET, AUTH_MICROSOFT_ENTRA_ID_ISSUER
import { connection } from "next/server";
import NextAuth, { type Session } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, MicrosoftEntraID],
  pages: { signIn: "/login" },
  // Sesión en una cookie cifrada: no se necesita base de datos para el login
  session: { strategy: "jwt" },
});

/**
 * Sesión actual. Solo en desarrollo local, con TABLERO_SIN_LOGIN=1, devuelve una sesión
 * de prueba para revisar el tablero sin credenciales de Google/Microsoft.
 * En Vercel (NODE_ENV=production) esa variable se ignora siempre.
 */
export async function obtenerSesion(): Promise<Session | null> {
  // Next.js 16: esperar la visita real antes de leer la sesión (Auth.js genera valores aleatorios)
  await connection();
  if (process.env.NODE_ENV === "development" && process.env.TABLERO_SIN_LOGIN === "1") {
    return { user: { name: "Prueba local", email: "prueba@ejemplo.com" }, expires: "2099-01-01" };
  }
  return auth();
}
