import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { AriaAvatar } from "./AriaAvatar";
import { useAriaPresentationMode } from "@/lib/aria/presentation-mode";

const AriaGlobalPanel = lazy(() => import("./AriaGlobalPanel"));

const GREET_KEY = "aria_dock_greeted";

/**
 * AriaGlobalDock — persistent, page-aware Digital Executive dock.
 * Additive component. Mounted once at the root layout.
 * Reuses the existing /api/public/aria-ask backend contract.
 */
export function AriaGlobalDock() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode = useAriaPresentationMode();
  const [open, setOpen] = useState(false);
  const [showGreet, setShowGreet] = useState(false);
  const [hiddenByHero, setHiddenByHero] = useState(false);

  // Hide on landing while hero ARIA section is likely in view (top of page).
  useEffect(() => {
    if (pathname !== "/") {
      setHiddenByHero(false);
      return;
    }
    const check = () => setHiddenByHero(window.scrollY < 520);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [pathname]);

  // Session greeting — once per session, only when dock is visible.
  useEffect(() => {
    if (hiddenByHero) return;
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(GREET_KEY)) return;
      const t = window.setTimeout(() => {
        setShowGreet(true);
        sessionStorage.setItem(GREET_KEY, "1");
        window.setTimeout(() => setShowGreet(false), 5000);
      }, 800);
      return () => window.clearTimeout(t);
    } catch { /* noop */ }
  }, [hiddenByHero]);

  const toggle = useCallback(() => {
    setShowGreet(false);
    setOpen((v) => !v);
  }, []);

  const orbAria = isAr ? "افتح آريا" : "Open ARIA";

  return (
    <>
      {/* Orb */}
      <div
        aria-hidden={hiddenByHero || undefined}
        className={[
          "fixed z-[90] transition-opacity duration-300",
          // RTL: bottom-start (visually bottom-right in RTL, bottom-left in LTR per spec: "bottom-left in RTL, mirrors to bottom-right in LTR")
          // spec says orb bottom-left in RTL. Using logical `start` yields left in RTL.
          "bottom-4 start-4",
          hiddenByHero ? "opacity-0 pointer-events-none" : "opacity-100",
        ].join(" ")}
      >
        <div className="relative">
          {/* Greet tooltip */}
          {showGreet && !open && (
            <div
              dir={isAr ? "rtl" : "ltr"}
              className={[
                "absolute bottom-full mb-2 whitespace-nowrap",
                isAr ? "start-0" : "start-0",
                "px-3 py-2 rounded-xl text-[12px]",
                "bg-[#061A2E]/90 backdrop-blur-md border border-cyan-400/25 text-cyan-100",
                "shadow-[0_8px_28px_-10px_rgba(0,212,255,0.5)]",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1",
              ].join(" ")}
            >
              {isAr ? "مرحباً، أنا آريا. اسألني عن هذه الصفحة." : "Hi, I'm ARIA. Ask me about this page."}
            </div>
          )}

          <button
            type="button"
            onClick={toggle}
            aria-label={orbAria}
            aria-expanded={open}
            className={[
              "relative h-16 w-16 rounded-full overflow-hidden",
              "border border-cyan-400/40",
              "shadow-[0_0_24px_rgba(0,212,255,0.35),inset_0_0_18px_rgba(58,232,255,0.15)]",
              "flex items-center justify-center bg-[#03111e]",
              "transition-transform duration-200 active:scale-95 hover:scale-105",
              "motion-safe:animate-[aria-breathe_4s_ease-in-out_infinite]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60",
            ].join(" ")}
          >
            <AriaAvatar
              mode={mode}
              framing="portrait"
              size={64}
              alt={orbAria}
              className="!h-full !w-full"
            />
          </button>
        </div>
      </div>

      {open && (
        <Suspense fallback={null}>
          <AriaGlobalPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}

      {/* keyframes — scoped, tiny */}
      <style>{`
        @keyframes aria-breathe {
          0%,100% { box-shadow: 0 0 20px rgba(0,212,255,0.28), inset 0 0 16px rgba(58,232,255,0.12); }
          50%     { box-shadow: 0 0 34px rgba(0,212,255,0.55), inset 0 0 22px rgba(58,232,255,0.22); }
        }
        @keyframes aria-ring {
          0%,100% { opacity: .35; transform: scale(1); }
          50%     { opacity: .8;  transform: scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="animate-[aria-breathe"], [class*="animate-[aria-ring"] { animation: none !important; }
        }
      `}</style>
    </>
  );
}

export default AriaGlobalDock;
