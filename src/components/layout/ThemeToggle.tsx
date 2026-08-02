import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

/**
 * ThemeToggle — floating light/dark switch, visible on every page and device.
 * Sits opposite the global back control so the two never collide.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        isDark ? (ar ? "الوضع الفاتح" : "Light mode") : ar ? "الوضع الداكن" : "Dark mode"
      }
      title={isDark ? (ar ? "الوضع الفاتح" : "Light mode") : ar ? "الوضع الداكن" : "Dark mode"}
      className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/35 bg-background/85 text-foreground shadow-lg backdrop-blur-md transition-colors hover:border-primary/70 hover:bg-primary/10 ltr:right-3 rtl:left-3"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-primary" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
      )}
    </button>
  );
}

export default ThemeToggle;
