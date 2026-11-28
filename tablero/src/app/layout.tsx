import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";

// Fuente de todo el tablero (texto y títulos)
const cuerpo = Quicksand({ subsets: ["latin"], variable: "--font-cuerpo", display: "swap" });

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
