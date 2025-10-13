import "./globals.css";
import type { Metadata } from "next";
import Shell from "@/components/layout/Shell";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ContaCerta",
  description: "Controle de gastos simples"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased cc--sidebar-expanded theme-dark">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
