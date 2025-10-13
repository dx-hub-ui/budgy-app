"use client";

import IconButton from "@/components/ui/IconButton";
import Tooltip from "@/components/ui/Tooltip";
import {
  Activity,
  AlignLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FolderKanban,
  LifeBuoy,
  PieChart,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, type ReactNode, type SVGProps } from "react";

type Props = { collapsed: boolean; onToggle: () => void };

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description?: string;
};

const primaryItems: NavItem[] = [
  { href: "/", label: "Visão geral", icon: BarChart3 },
  { href: "/transacoes", label: "Transações", icon: AlignLeft },
  { href: "/planejamento", label: "Planejamento", icon: FolderKanban },
  { href: "/investimentos", label: "Investimentos", icon: PieChart },
];

const secondaryItems: NavItem[] = [
  { href: "/relatorios", label: "Relatórios", icon: FileSpreadsheet },
  { href: "/saude-financeira", label: "Saúde financeira", icon: Activity },
];

const supportItems: NavItem[] = [
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/ajuda", label: "Central de ajuda", icon: LifeBuoy },
];

export default function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();

  return (
    <nav
      id="sidebar"
      className="cc-sidebar cc-transition-width"
      aria-label="Menu principal"
      style={{ width: "var(--dynamic-sidebar-w)" }}
    >
      <div className="flex h-full flex-col">
        <div className="px-4 pb-2 pt-4">
          <p className={`text-xs uppercase tracking-[0.24em] text-[var(--cc-text-muted)] transition-opacity ${collapsed ? "opacity-0" : "opacity-80"}`}>
            ContaCerta
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <SidebarSection title="Painel" collapsed={collapsed}>
            {primaryItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={pathname === item.href}
              />
            ))}
          </SidebarSection>
          <SidebarSection title="Insights" collapsed={collapsed}>
            {secondaryItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={pathname === item.href}
              />
            ))}
          </SidebarSection>
          <SidebarSection title="Suporte" collapsed={collapsed}>
            {supportItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={pathname === item.href}
              />
            ))}
          </SidebarSection>
        </div>
        <div className="border-t border-[var(--cc-border)] p-3">
          <Tooltip content={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}>
            <IconButton
              aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
              aria-controls="sidebar"
              aria-expanded={!collapsed}
              aria-pressed={!collapsed}
              onClick={onToggle}
              className="w-full justify-center"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </nav>
  );
}

function SidebarSection({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <section className="mb-5 last:mb-0" aria-label={title}>
      <h2
        className={`px-3 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--cc-text-muted)] transition-opacity ${collapsed ? "sr-only" : "block opacity-70"}`}
      >
        {title}
      </h2>
      <ul className="space-y-1" role="list">
        {children}
      </ul>
    </section>
  );
}

function SidebarLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;
  const linkContent = (
    <Link
      href={item.href}
      className={`group flex items-center gap-3 rounded-[var(--cc-radius-1)] px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cc-bg)] ${
        active
          ? "border-l-2 border-[var(--cc-accent)] bg-[var(--cc-bg-elev)] text-[var(--cc-text)] shadow-sm"
          : "text-[var(--cc-text-muted)] hover:bg-[var(--cc-bg-elev)] hover:text-[var(--cc-text)]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className={`${collapsed ? "sr-only" : "block"}`}>{item.label}</span>
    </Link>
  );

  if (collapsed) {
    return (
      <li>
        <Tooltip content={item.label}>
          {linkContent}
        </Tooltip>
      </li>
    );
  }

  return <li>{linkContent}</li>;
}
