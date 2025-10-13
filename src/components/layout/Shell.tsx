"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import useHotkeys from "@/hooks/useHotkeys";

type Theme = "light" | "dark";

const SIDEBAR_KEY = "cc_sidebar_state";
const THEME_KEY = "cc_theme";

export default function Shell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const shellClass = useMemo(
    () =>
      `cc-shell cc-transition-grid ${sidebarCollapsed ? "cc--sidebar-collapsed" : "cc--sidebar-expanded"}`,
    [sidebarCollapsed]
  );

  const applyTheme = useCallback((value: Theme) => {
    setTheme(value);
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    const targetClass = value === "light" ? "theme-light" : "theme-dark";
    [root.classList, body.classList].forEach((classList) => {
      classList.remove("theme-light", "theme-dark");
      classList.add(targetClass);
    });
    localStorage.setItem(THEME_KEY, value);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedSidebar = window.localStorage.getItem(SIDEBAR_KEY);
    if (storedSidebar === "collapsed") {
      setSidebarCollapsed(true);
    }

    const storedTheme = window.localStorage.getItem(THEME_KEY) as Theme | null;
    if (storedTheme === "light" || storedTheme === "dark") {
      applyTheme(storedTheme);
    } else {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      applyTheme(prefersLight ? "light" : "dark");
    }
  }, [applyTheme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const classList = document.body.classList;
    classList.remove("cc--sidebar-expanded", "cc--sidebar-collapsed");
    classList.add(sidebarCollapsed ? "cc--sidebar-collapsed" : "cc--sidebar-expanded");
    window.localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? "collapsed" : "expanded");
  }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  useHotkeys(
    useMemo(
      () => [
        {
          key: "[",
          handler: (event: KeyboardEvent) => {
            event.preventDefault();
            toggleSidebar();
          },
        },
      ],
      [toggleSidebar]
    )
  );

  return (
    <div className={shellClass}>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <Topbar
        onToggleSidebar={toggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        theme={theme}
        onThemeChange={applyTheme}
      />
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main
        id="main-content"
        className="cc-main focus-visible:outline-none"
        tabIndex={-1}
        role="main"
        aria-label="Conteúdo principal"
        data-main-container
      >
        {children}
      </main>
    </div>
  );
}
