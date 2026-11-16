import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Fuente del texto general (el título principal usa Arial Bold, ver globals.css)
const cuerpo = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-cuerpo", display: "swap" });

export const metadata: Metadata = {
  title: "Formación docente en inglés",
  description: "Tablero de seguimiento de la formación docente en inglés.",
  robots: { index: false, follow: false }, // no aparecer en buscadores
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={cuerpo.variable}>
      <body>{children}</body>
    </html>
  );
}
