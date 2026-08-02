import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * SADEED ships in Premium Light Mode by default (owner directive v10.0),
 * but the owner explicitly requested a manual light/dark switch (2026-08-02).
 * There is no OS detection: the default is always light until the user flips
 * the switch, and the choice persists in localStorage.
 */
export type Theme = "dark" | "light";

const STORAGE_KEY = "theme";

const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Hydration-safe: read the stored choice after mount only.
  useEffect(() => {
    let stored: Theme | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "dark" || raw === "light") stored = raw;
    } catch {
      stored = null;
    }
    const next = stored ?? "light";
    setThemeState(next);
    applyTheme(next);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* storage unavailable — in-memory only */
    }
  }, []);

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
