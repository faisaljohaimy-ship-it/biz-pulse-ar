import { createContext, useContext, useEffect, type ReactNode } from "react";

/**
 * SADEED is a Premium Light Mode platform (owner directive v10.0).
 * Dark mode is prohibited: no theme switch, no OS detection, no auto switching.
 * The `Theme` type and `setTheme` API stay for source compatibility, but the
 * resolved theme is permanently "light".
 */
export type Theme = "dark" | "light";

const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme: Theme = "light";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.add("light");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
    if (typeof window !== "undefined") localStorage.setItem("theme", "light");
  }, []);

  // Permanent light mode — switching is intentionally a no-op.
  const setTheme = (_t: Theme) => {};

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
