"use client";

import { useEffect } from "react";

type Hotkey = {
  key: string;
  handler: (event: KeyboardEvent) => void;
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
  allowWhileTyping?: boolean;
};

export default function useHotkeys(hotkeys: Hotkey[]) {
  useEffect(() => {
    if (!hotkeys.length || typeof window === "undefined") return;

    const normalized = hotkeys.map((hotkey) => ({
      ...hotkey,
      key: hotkey.key.toLowerCase(),
    }));

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
      );

      for (const hotkey of normalized) {
        if (!hotkey.allowWhileTyping && isTypingTarget) {
          continue;
        }

        const matchKey = event.key.toLowerCase() === hotkey.key;
        const matchCtrl = hotkey.ctrlOrMeta ? event.ctrlKey || event.metaKey : true;
        const matchShift = hotkey.shift ? event.shiftKey : !event.shiftKey || !hotkey.shift;
        const matchAlt = hotkey.alt ? event.altKey : !event.altKey || !hotkey.alt;

        if (matchKey && matchCtrl && matchShift && matchAlt) {
          hotkey.handler(event);
          break;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hotkeys]);
}

export type { Hotkey };
