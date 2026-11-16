// Página de inicio de sesión: Google (Gmail) o Microsoft (Outlook).
import { redirect } from "next/navigation";
import { obtenerSesion, signIn } from "@/auth";

// Lee la sesión en cada visita (si ya hay sesión, va directo al tablero).
export const instant = false;

export default async function Login() {
  if (await obtenerSesion()) redirect("/");

  return (
    <main className="tablero login">
      <div className="mk-card login-card" data-componente="login">
        <h1>Formación docente en inglés</h1>
        <p className="mk-note">Inicia sesión para ver el tablero.</p>
        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
          <button className="login-btn" type="submit">Iniciar sesión con Google (Gmail)</button>
        </form>
        <form action={async () => { "use server"; await signIn("microsoft-entra-id", { redirectTo: "/" }); }}>
          <button className="login-btn" type="submit">Iniciar sesión con Microsoft (Outlook)</button>
        </form>
      </div>
    </main>
  );
}
