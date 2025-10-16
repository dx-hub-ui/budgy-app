"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PiggyBank,
  Receipt,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  LogOut
} from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/components/auth/AuthGate";
import IconButton from "@/components/ui/IconButton";
import Tooltip from "@/components/ui/Tooltip";
import Avatar from "@/components/ui/Avatar";
import { mesAtual } from "@/domain/budgeting";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Props = { collapsed: boolean; onToggle: () => void };

type SidebarItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive?: (pathname: string) => boolean;
};

type UserMenuProps = {
  user: User;
  signingOut: boolean;
  onSignOut: () => Promise<void>;
};

function UserMenu({ user, signingOut, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const email = user.email ?? "usuário";
  const initial = email.charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleToggle = () => {
    setOpen((value) => !value);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await onSignOut();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)]"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menu do usuário"
      >
        <Avatar label={initial} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border bg-[var(--cc-surface)] text-[var(--cc-text)] shadow-lg"
          style={{ borderColor: "var(--cc-border)" }}
        >
          <div
            className="border-b px-3 py-2 text-sm"
            style={{ borderColor: "var(--cc-border)" }}
          >
            <p className="font-semibold">{email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--cc-bg)] disabled:opacity-60"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut size={16} />
            {signingOut ? "Saindo..." : "Sair"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const currentMonth = mesAtual();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, signingOut } = useAuth();

  const items: SidebarItem[] = [
    { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
    {
      href: `/budgets/${currentMonth}`,
      label: "Orçamento",
      icon: PiggyBank,
      isActive: (path) => path.startsWith("/budgets")
    },
    { href: "/new", label: "Nova despesa", icon: Receipt },
    { href: "/export", label: "Exportar dados", icon: FileDown }
  ];

  const headerClass = cn(
    "border-b px-3 py-4",
    collapsed ? "flex flex-col items-center gap-3" : "flex items-center justify-between gap-2"
  );
  const controlClass = cn("flex items-center gap-2", collapsed && "flex-col");

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
          <div className={controlClass}>
            <IconButton
              type="button"
              className="text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)]"
              aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
              onClick={toggleTheme}
              title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </IconButton>
            <UserMenu user={user} signingOut={signingOut} onSignOut={signOut} />
          </div>
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
