"use client";

import IconButton from "@/components/ui/IconButton";
import Tooltip from "@/components/ui/Tooltip";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Link from "next/link";

type Props = { collapsed: boolean; onToggle: () => void };

const items = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/budgets", label: "Orçamentos", icon: Wallet },
  { href: "/expenses", label: "Despesas", icon: Receipt },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings }
];

export default function Sidebar({ collapsed, onToggle }: Props) {
  return (
    <nav id="sidebar" className="cc-sidebar" aria-label="Menu principal">
      <ul className="flex h-full flex-col">
        <li className="flex-1 overflow-y-auto">
          <ul className="py-2">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-dark)] hover:bg-white/10 focus:bg-white/10"
                  >
                    <Icon size={18} className="text-[var(--brand)]" />
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

        <li className="border-t" style={{ borderColor: "var(--cc-border)" }}>
          <div className="p-2 flex justify-end">
            <IconButton
              className="border-white/10 text-white hover:bg-white/10 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-dark)]"
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
