"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import useHotkeys from "@/hooks/useHotkeys";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("cc_sidebar_state") === "collapsed";
  });

  useEffect(() => {
    const v = collapsed ? "collapsed" : "expanded";
    localStorage.setItem("cc_sidebar_state", v);
  }, [collapsed]);

  useHotkeys([
    {
      key: "[",
      handler: (e) => {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    }
  ]);

  const shellClass = useMemo(
    () => `cc-shell ${collapsed ? "cc--sidebar-collapsed" : "cc--sidebar-expanded"}`,
    [collapsed]
  );

  return (
    <div className={shellClass}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main id="main-content" className="cc-main focus:outline-none" tabIndex={-1}>
        <div className="flex h-full flex-col overflow-hidden">
          <Topbar />
          <div className="flex-1 overflow-auto">
            <div className="h-full">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
