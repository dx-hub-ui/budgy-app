"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PiggyBank, Wallet2, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";

import IconButton from "@/components/ui/IconButton";
import Tooltip from "@/components/ui/Tooltip";
import { SidebarUserMenu } from "./UserMenu";
import { mesAtual } from "@/domain/budgeting";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Props = { collapsed: boolean; onToggle: () => void };

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive?: (pathname: string) => boolean;
};

function resolveStoredAccountHref(accountId: string | null | undefined) {
  if (!accountId || accountId.trim().length === 0) {
    return "/contas";
  }
  return `/contas/${accountId}`;
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const currentMonth = mesAtual();
  const [accountsHref, setAccountsHref] = useState<string>("/contas");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyStoredAccount = () => {
      const stored = window.localStorage.getItem("cc_last_account");
      setAccountsHref(resolveStoredAccountHref(stored));
    };

    applyStoredAccount();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "cc_last_account") {
        setAccountsHref(resolveStoredAccountHref(event.newValue));
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) {
      return;
    }

    if (pathname.startsWith("/contas/")) {
      const [, , accountId] = pathname.split("/");
      if (accountId && accountId !== "nova") {
        window.localStorage.setItem("cc_last_account", accountId);
        setAccountsHref(`/contas/${accountId}`);
        return;
      }

      if (accountId === "nova") {
        const stored = window.localStorage.getItem("cc_last_account");
        setAccountsHref(resolveStoredAccountHref(stored));
        return;
      }
    }

    if (pathname === "/contas") {
      const stored = window.localStorage.getItem("cc_last_account");
      setAccountsHref(resolveStoredAccountHref(stored));
    }
  }, [pathname]);

  const items: SidebarItem[] = useMemo(
    () => [
      {
        href: `/budgets/${currentMonth}`,
        label: "Orçamento",
        icon: PiggyBank,
        isActive: (path) => path.startsWith("/budgets")
      },
      {
        href: accountsHref,
        label: "Contas",
        icon: Wallet2,
        isActive: (path) => path.startsWith("/contas")
      }
    ],
    [accountsHref, currentMonth]
  );

  const headerClass = cn(
    "border-b px-3 py-4",
    collapsed ? "flex flex-col items-center gap-3" : "flex flex-col gap-3"
  );

  return (
    <nav id="sidebar" className="cc-sidebar cc-sidebar--light" aria-label="Menu principal">
      <div className="flex h-full flex-col">
        <div className={headerClass} style={{ borderColor: "var(--sidebar-border)" }}>
          <Link
            href="/"
            className={cn(
              "flex items-center justify-center rounded-2xl bg-white/10",
              collapsed ? "h-11 w-11" : "h-10 w-10"
            )}
            aria-label="Ir para a página inicial"
          >
            <Image src="/brand/favicon.png" alt="Budgy" width={24} height={24} className="h-6 w-6" priority />
          </Link>
          <SidebarUserMenu collapsed={collapsed} />
        </div>

        <ul className="flex-1 overflow-y-auto py-2">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = it.isActive ? it.isActive(pathname ?? "") : pathname?.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "cc-nav-item group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)]",
                    isActive
                      ? "text-[var(--sidebar-foreground)]"
                      : "text-[var(--sidebar-muted)] hover:text-[var(--sidebar-foreground)]"
                  )}
                >
                  <Icon
                    size={18}
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "text-[var(--sidebar-foreground)]"
                        : "text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-foreground)]"
                    )}
                  />
                  {!collapsed && <span>{it.label}</span>}
                  {collapsed && (
                    <Tooltip content={it.label}>
                      <span className="sr-only">{it.label}</span>
                    </Tooltip>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t px-2 py-2" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex justify-end">
            <IconButton
              className="text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)]"
              style={{
                borderColor: "var(--sidebar-border)",
                color: "var(--sidebar-foreground)",
              }}
              aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
              aria-pressed={collapsed}
              onClick={onToggle}
              title={collapsed ? "Expandir" : "Recolher"}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </IconButton>
          </div>
        </div>
      </div>
    </nav>
  );
}
