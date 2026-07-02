import { useSyncExternalStore } from "react";

export type AriaPresentationMode = "hologram" | "orb";

const KEY = "aria_presentation_mode";
const listeners = new Set<() => void>();

function read(): AriaPresentationMode {
  if (typeof window === "undefined") return "hologram";
  try {
    const v = localStorage.getItem(KEY);
    return v === "orb" ? "orb" : "hologram";
  } catch {
    return "hologram";
  }
}

let current: AriaPresentationMode = read();

export function getPresentationMode(): AriaPresentationMode {
  return current;
}

export function setPresentationMode(mode: AriaPresentationMode): void {
  if (current === mode) return;
  current = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l());
}

export function togglePresentationMode(): void {
  setPresentationMode(current === "hologram" ? "orb" : "hologram");
}

export function useAriaPresentationMode(): AriaPresentationMode {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => current,
    () => "hologram" as AriaPresentationMode,
  );
}
