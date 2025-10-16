"use client";

import IconButton from "@/components/ui/IconButton";
import Tooltip from "@/components/ui/Tooltip";
import { LayoutDashboard, PiggyBank, Receipt, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const currentMonth = mesAtual();

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

  return (
    <nav id="sidebar" className="cc-sidebar cc-sidebar--light" aria-label="Menu principal">
      <ul className="flex h-full flex-col">
        <li className="flex-1 overflow-y-auto">
          <ul className="py-2">
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
        </li>

        <li className="border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex justify-end p-2">
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
        </li>
      </ul>
    </nav>
  );
}
