"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatMonthLabel } from "@/domain/budgeting";
import { useTheme } from "@/components/theme/ThemeProvider";
import { TopbarUserMenu } from "./UserMenu";

export default function Topbar() {
  const { theme } = useTheme();
  const brandLogoSrc = theme === "dark" ? "/brand/budgy_logo_escuro.png" : "/brand/budgy_logo_claro.png";
  const pathname = usePathname();

  const pageTitle = useMemo(() => {
    if (!pathname) return "Budgy";
    if (pathname === "/" || pathname.startsWith("/dashboard")) {
      return "Visão geral";
    }
    if (pathname.startsWith("/budgets/report")) {
      return "Relatório de orçamento";
    }
    if (pathname.startsWith("/budgets/")) {
      const [, , slug] = pathname.split("/");
      if (slug && slug !== "report") {
        const normalized = slug.slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(normalized)) {
          try {
            return `Orçamento de ${formatMonthLabel(normalized)}`;
          } catch {
            return "Orçamento mensal";
          }
        }
      }
      return "Orçamento mensal";
    }
    if (pathname.startsWith("/budgets")) {
      return "Orçamentos";
    }
    if (pathname.startsWith("/new")) {
      return "Nova despesa";
    }
    if (pathname.startsWith("/categories")) {
      return "Categorias";
    }
    if (pathname.startsWith("/export")) {
      return "Exportar CSV";
    }
    return "Budgy";
  }, [pathname]);

  return (
    <header id="topbar" className="cc-topbar">
      <div className="cc-topbar-inner mx-auto flex h-full w-full max-w-[calc(var(--cc-content-maxw)+var(--dynamic-sidebar-w))] items-center gap-4 px-3 md:px-6">
        <div
          className="flex h-full flex-none items-center"
          style={{ flexBasis: "var(--dynamic-sidebar-w)", minWidth: "140px" }}
        >
          <Link
            href="/"
            className="flex items-center"
            aria-label="Ir para a página inicial"
          >
            <Image
              src={brandLogoSrc}
              alt="Budgy"
              width={200}
              height={70}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>

        <div className="flex h-full flex-1 items-center">
          <h1 className="truncate text-base font-semibold leading-tight text-[var(--cc-text)] sm:text-lg">
            {pageTitle}
          </h1>
        </div>

        <TopbarUserMenu />
      </div>
    </header>
  );
}
