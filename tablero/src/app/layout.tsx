import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Formación docente en inglés",
  description: "Tablero de seguimiento de la formación docente en inglés.",
  robots: { index: false, follow: false }, // no aparecer en buscadores
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
