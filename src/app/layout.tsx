import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ContaCerta",
  description: "Controle de gastos simples"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
