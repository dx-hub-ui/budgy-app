"use client";

import IconButton from "@/components/ui/IconButton";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import { Search, Bell, PanelsTopLeft } from "lucide-react";
import useHotkeys from "@/hooks/useHotkeys";
import { useRef } from "react";

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const searchRef = useRef<HTMLInputElement>(null);

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
              <span className="hidden md:inline text-xs opacity-60">/ ou Ctrl/⌘+K</span>
            </form>
          </div>

          {/* Right col */}
          <div className="col-span-3 md:col-span-3 flex items-center justify-end gap-2">
            <IconButton aria-label="Notificações">
              <Bell size={18} />
            </IconButton>
            <Avatar label="A" />
          </div>
        </div>
      </div>
    </header>
  );
}
