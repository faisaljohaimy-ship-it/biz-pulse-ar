import { useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Global back control — shown on every page except the home shell.
 * RTL-safe: the arrow points right in Arabic, left in English.
 */
export function GlobalBackButton() {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRtl = locale === "ar";

  const goBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate({ to: "/" });
  }, [navigate]);

  if (pathname === "/" || pathname === "" || pathname === "/index") return null;

  return (
    <div
      className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] flex items-center gap-2 ltr:left-3 rtl:right-3"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <button
        type="button"
        onClick={goBack}
        aria-label={isRtl ? "رجوع" : "Back"}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-primary/30 bg-background/85 px-3 text-xs font-semibold text-foreground shadow-lg backdrop-blur-sm transition-colors hover:border-primary/60 hover:bg-primary/10"
      >
        <ArrowRight
          className={`h-4 w-4 text-primary ${isRtl ? "" : "rotate-180"}`}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{isRtl ? "رجوع" : "Back"}</span>
      </button>
      <button
        type="button"
        onClick={() => void navigate({ to: "/" })}
        aria-label={isRtl ? "الرئيسية" : "Home"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-background/85 text-foreground shadow-lg backdrop-blur-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
      >
        <Home className="h-4 w-4 text-primary" aria-hidden="true" />
      </button>
    </div>
  );
}
