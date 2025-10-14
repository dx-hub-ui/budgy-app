"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import { Search, Bell, PanelsTopLeft, Moon, Sun, LogOut } from "lucide-react";
import useHotkeys from "@/hooks/useHotkeys";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/components/auth/AuthGate";

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

    function handleClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await onSignOut();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-accent)]"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menu do usuário"
      >
        <Avatar label={initial} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border bg-[var(--cc-surface)] shadow-lg"
          style={{ borderColor: "var(--cc-border)" }}
        >
          <div
            className="border-b px-3 py-2 text-sm"
            style={{ borderColor: "var(--cc-border)" }}
            aria-live="polite"
          >
            <p className="font-semibold">{email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--cc-bg-elev)] disabled:opacity-60"
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

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, signingOut } = useAuth();

  useHotkeys([
    {
      key: "/",
      handler: (e) => {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        e.preventDefault();
        searchRef.current?.focus();
      }
    },
    {
      key: "k",
      ctrlOrMeta: true,
      handler: (e) => {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
  ]);

  return (
    <header id="topbar" className="cc-topbar">
      <div className="mx-auto h-full max-w-[var(--cc-content-maxw)] px-3 md:px-4">
        <div className="grid h-full grid-cols-12 items-center gap-2">
          {/* Left col */}
          <div className="col-span-4 flex items-center gap-2 md:col-span-3">
            <IconButton type="button" aria-label="Alternar menu" onClick={onToggleSidebar}>
              <PanelsTopLeft size={18} />
            </IconButton>
            <div className="text-sm font-semibold opacity-90">ContaCerta</div>
          </div>

          {/* Center col */}
          <div className="col-span-5 md:col-span-6">
            <form role="search" className="flex items-center gap-2">
              <Search size={16} className="opacity-60" />
              <Input
                ref={searchRef}
                type="search"
                placeholder="Buscar"
                aria-label="Buscar"
                className="w-full"
              />
              <span className="hidden text-xs opacity-60 md:inline">/ ou Ctrl/⌘+K</span>
            </form>
          </div>

          {/* Right col */}
          <div className="col-span-3 flex items-center justify-end gap-2 md:col-span-3">
            <IconButton
              type="button"
              aria-label="Alternar tema"
              onClick={toggleTheme}
              aria-pressed={theme === "dark"}
              title={
                theme === "dark"
                  ? "Alternar para tema claro"
                  : "Alternar para tema escuro"
              }
            >
              {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            </IconButton>
            <IconButton type="button" aria-label="Notificações">
              <Bell size={18} />
            </IconButton>
            <UserMenu user={user} signingOut={signingOut} onSignOut={signOut} />
          </div>
        </div>
      </div>
    </header>
  );
}
