// Página principal. Se ejecuta en el servidor: sin sesión → /login; con sesión → lee los datos y dibuja.
import { redirect } from "next/navigation";
import { obtenerSesion, signOut } from "@/auth";
import { cargarDatosTablero } from "@/lib/datos";
import Tablero from "@/componentes/Tablero";

// Lee la sesión en cada visita: la página espera en el servidor (nada se muestra sin login).
export const instant = false;

export default async function Inicio() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const salir = async () => { "use server"; await signOut({ redirectTo: "/login" }); };

  let datos;
  try {
    datos = await cargarDatosTablero();
  } catch (error) {
    // El detalle va al registro del servidor (Vercel → Logs); al usuario, un mensaje simple.
    console.error("[tablero] error al cargar datos:", error);
    return (
      <main className="tablero">
        <div className="mk-card" data-componente="error_datos">
          <h2>No se pudieron cargar los datos</h2>
          <p className="mk-note">Intenta de nuevo en unos minutos. Si continúa, revisa Vercel → Logs.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="tablero">
      <Tablero datos={datos} usuario={sesion.user?.email ?? sesion.user?.name ?? ""} salir={salir} />
    </main>
  );
}
