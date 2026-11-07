"use client";

import { useEffect, useRef } from "react";

type Handler = (e: KeyboardEvent) => void;

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * Raccourcis clavier simples. Les touches sans modificateur sont ignorées pendant
 * la saisie ; « mod+enter » fonctionne partout.
 */
export function useHotkeys(bindings: Record<string, Handler>, enabled = true) {
  const ref = useRef(bindings);
  useEffect(() => {
    ref.current = bindings;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = `${mod ? "mod+" : ""}${e.key.toLowerCase()}`;
      const handler = ref.current[key];
      if (!handler) return;
      if (!mod && (isTyping(e.target) || e.altKey)) return;
      if (document.querySelector("[role=menu],[role=listbox],[role=dialog]")) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
