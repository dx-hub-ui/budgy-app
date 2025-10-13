"use client";

import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import Tooltip from "@/components/ui/Tooltip";
import { Bell, ChevronDown, MoonStar, PanelsTopLeft, Search, Sun, X } from "lucide-react";
import useHotkeys from "@/hooks/useHotkeys";
import Link from "next/link";
import {
  type ComponentType,
  type SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type TopbarProps = {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
};

export default function Topbar({
  onToggleSidebar,
  sidebarCollapsed,
  theme,
  onThemeChange,
}: TopbarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const focusSearch = useCallback(() => {
    const field = searchRef.current;
    if (field) {
      field.focus();
      field.select();
    }
  }, []);

  const hotkeys = useMemo(
    () => [
      {
        key: "/",
        handler: (event: KeyboardEvent) => {
          if ((event.target as HTMLElement | null)?.tagName === "INPUT") return;
          event.preventDefault();
          focusSearch();
        },
      },
      {
        key: "k",
        ctrlOrMeta: true,
        handler: (event: KeyboardEvent) => {
          event.preventDefault();
          focusSearch();
        },
        allowWhileTyping: true,
      },
    ],
    [focusSearch]
  );

  useHotkeys(hotkeys);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!menuOpen) return;
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && menuButtonRef.current && !menuButtonRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen((open) => !open);

  const selectTheme = (value: "light" | "dark") => {
    onThemeChange(value);
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <header id="topbar" className="cc-topbar" role="banner">
      <div className="mx-auto flex h-full w-full max-w-[calc(var(--cc-content-maxw)+var(--dynamic-sidebar-w))] items-center px-3 md:px-6">
        <div className="grid h-full w-full grid-cols-[minmax(0,var(--dynamic-sidebar-w))_1fr_auto] items-center gap-2 md:gap-4">
          <div
            className="flex h-full items-center gap-3 border-r border-transparent pr-3"
            style={{ width: "var(--dynamic-sidebar-w)" }}
          >
            <IconButton
              aria-label="Alternar barra lateral"
              aria-controls="sidebar"
              aria-expanded={!sidebarCollapsed}
              aria-pressed={!sidebarCollapsed}
              onClick={onToggleSidebar}
            >
              <PanelsTopLeft size={20} aria-hidden />
            </IconButton>
            <Link
              href="/"
              className="hidden truncate text-sm font-semibold uppercase tracking-[0.14em] text-[var(--cc-text-muted)] md:inline-flex"
            >
              ContaCerta
            </Link>
          </div>

          <div className="flex h-full w-full flex-col justify-center gap-1">
            <nav aria-label="Trilha de navegação" className="hidden text-xs md:block">
              <ol className="flex items-center gap-2 text-[var(--cc-text-muted)]">
                <li>
                  <Link href="/" className="transition-colors hover:text-[var(--cc-text)]">
                    Início
                  </Link>
                </li>
                <li aria-hidden className="select-none">
                  /
                </li>
                <li className="font-medium text-[var(--cc-text)]" id="page-title">
                  Painel financeiro
                </li>
              </ol>
            </nav>
            <form
              role="search"
              className="flex items-center gap-2 rounded-[var(--cc-radius-1)] bg-[var(--cc-bg-elev)] px-3 py-1.5 text-sm shadow-sm ring-1 ring-transparent focus-within:ring-[var(--cc-border)]"
              aria-label="Busca global"
              onSubmit={(event) => event.preventDefault()}
            >
              <Search className="h-4 w-4 text-[var(--cc-text-muted)]" aria-hidden />
              <Input
                ref={searchRef}
                type="search"
                placeholder="Buscar transações"
                aria-label="Buscar transações"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {search.length > 0 ? (
                <IconButton
                  onClick={() => {
                    setSearch("");
                    focusSearch();
                  }}
                  aria-label="Limpar busca"
                  className="h-7 w-7 rounded-[var(--cc-radius-1)] border-0 bg-transparent text-[var(--cc-text-muted)] hover:bg-transparent hover:text-[var(--cc-text)]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </IconButton>
              ) : (
                <span className="hidden text-xs text-[var(--cc-text-muted)] md:inline" aria-hidden>
                  / ou Ctrl/⌘+K
                </span>
              )}
            </form>
          </div>

          <div className="flex h-full items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              className="hidden items-center gap-2 rounded-[var(--cc-radius-1)] bg-[var(--cc-accent)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cc-bg)] sm:inline-flex"
            >
              Instalar app
            </button>
            <Tooltip content="Notificações">
              <IconButton aria-label="Abrir notificações">
                <Bell className="h-4 w-4" aria-hidden />
              </IconButton>
            </Tooltip>
            <div className="relative" ref={menuRef}>
              <button
                ref={menuButtonRef}
                type="button"
                className="flex items-center gap-2 rounded-full px-1.5 py-1 text-left text-sm font-medium text-[var(--cc-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cc-bg)]"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={toggleMenu}
              >
                <Avatar name="Mariana Alves" size={32} />
                <span className="hidden text-xs leading-none sm:flex sm:flex-col sm:items-start">
                  <span className="font-semibold">Mariana Alves</span>
                  <span className="text-[var(--cc-text-muted)]">Administradora</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-[var(--cc-text-muted)] sm:block" aria-hidden />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Menu do usuário"
                  className="absolute right-0 mt-2 w-52 rounded-[var(--cc-radius-2)] border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] p-1.5 shadow-xl z-[var(--cc-z-overlay)]"
                >
                  <MenuItem
                    icon={Sun}
                    label="Tema claro"
                    description="Melhor para ambientes iluminados"
                    active={theme === "light"}
                    role="menuitemradio"
                    ariaChecked={theme === "light"}
                    onSelect={() => selectTheme("light")}
                  />
                  <MenuItem
                    icon={MoonStar}
                    label="Tema escuro"
                    description="Ideal para luz baixa"
                    active={theme === "dark"}
                    role="menuitemradio"
                    ariaChecked={theme === "dark"}
                    onSelect={() => selectTheme("dark")}
                  />
                  <div className="my-1 border-t border-[var(--cc-border)]" role="separator" />
                  <MenuItem
                    icon={Bell}
                    label="Preferências de alertas"
                    description="Gerencie e-mails e push"
                    onSelect={() => setMenuOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

type MenuItemProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  description?: string;
  active?: boolean;
  onSelect: () => void;
  role?: "menuitem" | "menuitemradio";
  ariaChecked?: boolean;
};

function MenuItem({
  icon: Icon,
  label,
  description,
  active = false,
  onSelect,
  role = "menuitem",
  ariaChecked,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "menuitemradio" ? ariaChecked : undefined}
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-[var(--cc-radius-1)] px-2 py-2 text-left transition-colors hover:bg-[var(--cc-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)] ${active ? "bg-[var(--cc-bg)]" : ""}`.trim()}
    >
      <span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--cc-bg)] text-[var(--cc-text)] ${active ? "ring-2 ring-[var(--cc-accent)]" : ""}`.trim()}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="flex flex-col text-xs text-[var(--cc-text-muted)]">
        <span className="text-sm font-medium text-[var(--cc-text)]">{label}</span>
        {description && <span>{description}</span>}
      </span>
    </button>
  );
}
