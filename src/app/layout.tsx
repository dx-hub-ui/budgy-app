import "./globals.css";
import type { Metadata } from "next";
import Shell from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: "ContaCerta",
  description: "Controle de gastos simples"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
