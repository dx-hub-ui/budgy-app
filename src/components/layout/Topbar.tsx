"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import IconButton from "@/components/ui/IconButton";
import Avatar from "@/components/ui/Avatar";
import { Bell, Moon, Sun, LogOut } from "lucide-react";
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

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut, signingOut } = useAuth();
  const brandLogoSrc = theme === "dark" ? "/brand/budgy_logo_escuro.png" : "/brand/budgy_logo_claro.png";

  return (
    <header id="topbar" className="cc-topbar">
      <div className="cc-topbar-inner flex items-center justify-between px-3 md:px-4">
        <div className="flex h-full items-center">
          <Link
            href="/"
            className="flex items-center"
            aria-label="Ir para a página inicial"
          >
            <Image
              src={brandLogoSrc}
              alt="Budgy"
              width={200}
              height={70}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>

        <div className="flex items-center gap-2">
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
    </header>
  );
}
