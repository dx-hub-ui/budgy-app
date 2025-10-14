"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import { Search, Bell, PanelsTopLeft } from "lucide-react";
import useHotkeys from "@/hooks/useHotkeys";
import { supabase } from "@/lib/supabase";

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>();
  const [signingOut, setSigningOut] = useState(false);

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

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
    }
  }

  const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <header id="topbar" className="cc-topbar">
      <div className="mx-auto h-full max-w-[var(--cc-content-maxw)] px-3 md:px-4">
        <div className="grid h-full grid-cols-12 items-center gap-2">
          {/* Left col */}
          <div className="col-span-4 md:col-span-3 flex items-center gap-2">
            <IconButton aria-label="Alternar menu" onClick={onToggleSidebar}>
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
          <div className="col-span-3 md:col-span-3 flex items-center justify-end gap-2">
            {user === undefined ? (
              <span className="text-sm opacity-60">Carregando…</span>
            ) : user ? (
              <>
                <IconButton aria-label="Notificações">
                  <Bell size={18} />
                </IconButton>
                <span className="hidden text-sm opacity-80 md:inline" aria-live="polite">
                  {user.email}
                </span>
                <button
                  type="button"
                  className="rounded-md border px-3 py-1 text-xs"
                  style={{ borderColor: "var(--cc-border)" }}
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? "Saindo..." : "Sair"}
                </button>
                <Avatar label={userInitial} />
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-md border px-3 py-1 text-sm"
                style={{ borderColor: "var(--cc-border)" }}
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
