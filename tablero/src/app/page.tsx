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

  const datos = await cargarDatosTablero();

  const salir = async () => { "use server"; await signOut({ redirectTo: "/login" }); };

  return (
    <main className="tablero">
      <Tablero datos={datos} usuario={sesion.user?.email ?? sesion.user?.name ?? ""} salir={salir} />
    </main>
  );
}
