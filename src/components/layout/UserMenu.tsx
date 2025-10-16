"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Moon, Sun, SunMoon, UserCog } from "lucide-react";

import { useAuth } from "@/components/auth/AuthGate";
import { useTheme } from "@/components/theme/ThemeProvider";
import Avatar from "@/components/ui/Avatar";

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
  const [themeMenuOpen, setThemeMenuOpen] = useState(true);

  const baseMenuItemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

  return (
    <div
      role="menu"
      className={cn(
        "absolute z-[70] mt-2 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-[var(--cc-surface)] text-[var(--cc-text)] shadow-lg",
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

      <nav className="px-2 py-2 text-sm" aria-label="Menu do usuário">
        <ul className="space-y-1" role="menu">
          <li>
            <Link
              href="/profile"
              className={cn(
                baseMenuItemClass,
                "text-[var(--cc-text)] hover:bg-[var(--cc-bg)]"
              )}
              onClick={onClose}
              role="menuitem"
            >
              <UserCog size={16} />
              <span>Meu Perfil</span>
            </Link>
          </li>
          <li>
            <div>
              <button
                type="button"
                className={cn(
                  baseMenuItemClass,
                  "w-full items-center justify-between text-[var(--cc-text)] hover:bg-[var(--cc-bg)]"
                )}
                onClick={() => setThemeMenuOpen((value) => !value)}
                aria-expanded={themeMenuOpen}
                aria-controls="user-theme-menu"
              >
                <span className="flex items-center gap-2">
                  <SunMoon size={16} />
                  Mudar Tema
                </span>
                <ChevronDown
                  size={14}
                  className={cn(
                    "transition-transform",
                    themeMenuOpen ? "rotate-180" : "rotate-0"
                  )}
                  aria-hidden
                />
              </button>
              <ul
                id="user-theme-menu"
                role="menu"
                className={cn(
                  "mt-1 space-y-1 border-l border-[var(--cc-border)] pl-3",
                  themeMenuOpen ? "" : "hidden"
                )}
              >
                <li>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={theme === "light"}
                    className={cn(
                      baseMenuItemClass,
                      "justify-start border border-transparent bg-transparent text-[var(--cc-text)] hover:border-[var(--ring)] hover:bg-[var(--cc-bg)]",
                      theme === "light" ? "border-[var(--ring)] bg-[var(--cc-bg)]" : ""
                    )}
                    onClick={() => onSelectTheme("light")}
                  >
                    <Sun size={16} />
                    Claro
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={theme === "dark"}
                    className={cn(
                      baseMenuItemClass,
                      "justify-start border border-transparent bg-transparent text-[var(--cc-text)] hover:border-[var(--ring)] hover:bg-[var(--cc-bg)]",
                      theme === "dark" ? "border-[var(--ring)] bg-[var(--cc-bg)]" : ""
                    )}
                    onClick={() => onSelectTheme("dark")}
                  >
                    <Moon size={16} />
                    Escuro
                  </button>
                </li>
              </ul>
            </div>
          </li>
        </ul>

        <div className="my-2 border-t" style={{ borderColor: "var(--cc-border)" }} />

        <button
          type="button"
          role="menuitem"
          className={cn(
            baseMenuItemClass,
            "text-[var(--cc-text)] hover:bg-[var(--cc-bg)]"
          )}
          onClick={() => {
            onClose();
            void onSignOut();
          }}
          disabled={signingOut}
        >
          <LogOut size={16} />
          {signingOut ? "Saindo..." : "Sair"}
        </button>
      </nav>
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
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--sidebar-foreground)] transition",
          "hover:bg-[var(--sidebar-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          collapsed ? "justify-center" : "pr-2"
        )}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menu do usuário"
      >
        <Avatar label={initial} src={avatarUrl ?? undefined} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {user.email ? (
              <p className="truncate text-xs text-[var(--sidebar-muted)]">{user.email}</p>
            ) : null}
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

