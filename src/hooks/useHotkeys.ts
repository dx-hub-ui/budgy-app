"use client";

import { useEffect } from "react";

type Hotkey = {
  key: string;
  handler: (e: KeyboardEvent) => void;
  ctrlOrMeta?: boolean;
};

export default function useHotkeys(hotkeys: Hotkey[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      for (const hk of hotkeys) {
        const matchKey = e.key.toLowerCase() === hk.key.toLowerCase();
        const matchMod = hk.ctrlOrMeta ? (e.ctrlKey || e.metaKey) : true;
        if (matchKey && matchMod) {
          hk.handler(e);
          return;
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hotkeys]);
}
