"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  Palette,
  Sun,
  SunMoon,
  UserCog
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthGate";
import { useTheme } from "@/components/theme/ThemeProvider";
import Avatar from "@/components/ui/Avatar";
import IconButton from "@/components/ui/IconButton";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type MenuContentProps = {
  align?: "left" | "right";
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  theme: "light" | "dark";
  onSelectTheme: (theme: "light" | "dark") => void;
  onClose: () => void;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
};

function UserMenuContent({
  align = "right",
  displayName,
  email,
  avatarUrl,
  theme,
  onSelectTheme,
  onClose,
  onSignOut,
  signingOut
}: MenuContentProps) {
  const placement = align === "left" ? "left-0" : "right-0";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      role="menu"
      className={cn(
        "absolute z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-[var(--cc-surface)] text-[var(--cc-text)] shadow-lg",
        placement
      )}
      style={{ borderColor: "var(--cc-border)" }}
    >
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: "var(--cc-border)" }}
      >
        <div className="flex items-center gap-3">
          <Avatar label={initial} src={avatarUrl ?? undefined} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {email ? (
              <p className="truncate text-xs text-[var(--cc-text-muted)]">{email}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 text-sm">
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-md px-2 py-2 transition hover:bg-[var(--cc-bg)]"
          onClick={onClose}
        >
          <UserCog size={16} />
          Meu Perfil
        </Link>

        <div
          className="mt-3 rounded-lg border px-3 py-2"
          style={{ borderColor: "var(--cc-border)" }}
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--cc-text-muted)]">
            <Palette size={14} /> Preferências
          </span>
          <div className="mt-3 space-y-3">
            <div>
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--cc-text)]">
                <SunMoon size={16} /> Mudar Tema
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm font-medium",
                    theme === "light"
                      ? "border-[var(--ring)] text-[var(--ring)]"
                      : "border-[var(--cc-border)] text-[var(--cc-text)] hover:border-[var(--ring)] hover:text-[var(--ring)]"
                  )}
                  onClick={() => onSelectTheme("light")}
                  aria-pressed={theme === "light"}
                >
                  <Sun size={16} /> Claro
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm font-medium",
                    theme === "dark"
                      ? "border-[var(--ring)] text-[var(--ring)]"
                      : "border-[var(--cc-border)] text-[var(--cc-text)] hover:border-[var(--ring)] hover:text-[var(--ring)]"
                  )}
                  onClick={() => onSelectTheme("dark")}
                  aria-pressed={theme === "dark"}
                >
                  <Moon size={16} /> Escuro
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="border-t px-4 py-2"
        style={{ borderColor: "var(--cc-border)" }}
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-[var(--cc-text)] transition hover:bg-[var(--cc-bg)]"
          onClick={() => {
            onClose();
            void onSignOut();
          }}
          disabled={signingOut}
        >
          <LogOut size={16} />
          {signingOut ? "Saindo..." : "Sair"}
        </button>
      </div>
    </div>
  );
}

type SidebarUserMenuProps = { collapsed: boolean };

export function SidebarUserMenu({ collapsed }: SidebarUserMenuProps) {
  const { user, displayName, avatarUrl, signOut, signingOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = useMemo(() => displayName.trim().charAt(0).toUpperCase() || "?", [displayName]);

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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-3 rounded-full px-2 py-1.5 text-left text-sm text-[var(--sidebar-foreground)] transition",
          "hover:bg-[var(--sidebar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          collapsed ? "justify-center" : "pl-2 pr-3"
        )}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menu do usuário"
      >
        <Avatar label={initial} src={avatarUrl ?? undefined} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--sidebar-muted)]">
              Conta
            </p>
            <p className="truncate text-sm font-semibold">{displayName}</p>
          </div>
        )}
        <ChevronDown size={16} className="text-[var(--sidebar-muted)]" aria-hidden />
      </button>

      {open ? (
        <UserMenuContent
          align="right"
          displayName={displayName}
          email={user.email ?? null}
          avatarUrl={avatarUrl}
          theme={theme}
          onSelectTheme={setTheme}
          onClose={() => setOpen(false)}
          onSignOut={signOut}
          signingOut={signingOut}
        />
      ) : null}
    </div>
  );
}

type TopbarUserMenuProps = { showNotificationButton?: boolean };

export function TopbarUserMenu({ showNotificationButton = true }: TopbarUserMenuProps) {
  const { user, displayName, avatarUrl, signOut, signingOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = useMemo(() => displayName.trim().charAt(0).toUpperCase() || "?", [displayName]);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  return (
    <div className="flex items-center gap-2" ref={menuRef}>
      {showNotificationButton ? (
        <IconButton type="button" aria-label="Notificações">
          <Bell size={18} />
        </IconButton>
      ) : null}
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-[var(--cc-border)] bg-[var(--cc-bg-elev)] px-3 py-1.5 text-sm font-medium text-[var(--cc-text)] shadow-sm transition hover:border-[var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menu do usuário"
      >
        <Avatar label={initial} src={avatarUrl ?? undefined} />
        <span className="max-w-[12rem] truncate">{displayName}</span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {open ? (
        <UserMenuContent
          align="right"
          displayName={displayName}
          email={user.email ?? null}
          avatarUrl={avatarUrl}
          theme={theme}
          onSelectTheme={setTheme}
          onClose={() => setOpen(false)}
          onSignOut={signOut}
          signingOut={signingOut}
        />
      ) : null}
    </div>
  );
}
