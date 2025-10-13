"use client";

import IconButton from "@/components/ui/IconButton";
import Tooltip from "@/components/ui/Tooltip";
import { Home, FolderKanban, FileText, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = { collapsed: boolean; onToggle: () => void };

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/categories", label: "Categorias", icon: FolderKanban },
  { href: "/export", label: "Exportar", icon: FileText },
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
                    className="group flex items-center gap-3 px-3 py-2 hover:bg-[var(--cc-bg-elev)] focus:bg-[var(--cc-bg-elev)]"
                  >
                    <Icon size={18} className="opacity-80" />
                    {!collapsed && <span className="text-sm">{it.label}</span>}
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
