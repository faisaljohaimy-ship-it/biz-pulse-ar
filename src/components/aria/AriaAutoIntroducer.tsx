/**
 * AriaAutoIntroducer — auto-narrates every route on entry.
 *
 * On every route change (mobile + desktop), ARIA speaks a DISTINCT script
 * for the current window/sub-page: title · purpose · action · Example 1 ·
 * Example 2. Flagship surfaces (e.g. `/hajj`) append an extended
 * end-to-end explanation. Auto-intro is skipped when the copilot panel
 * is open (AriaCopilot owns the panel-open intro to avoid double speech).
 *
 * Additionally installs a global click delegate: any element carrying a
 * `data-aria-intro="…"` attribute (icons, quick actions, KPI tiles) will
 * have ARIA speak that intro plus optional `data-aria-example="…"` when
 * tapped — no per-icon wiring required.
 *
 * Kill switch: `localStorage["aria-auto-intro"] = "0"` disables all
 * auto/icon narration until re-enabled. Default is ON (per directive).
 */
import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { speakAria, type SpeakHandle } from "@/lib/digital-humans/aria-voice";
import { speakablePageScript } from "@/lib/aria/page-scripts";
import { useAriaStore } from "@/lib/aria-core/store";

function pickLocale(): "ar" | "en" {
  if (typeof document === "undefined") return "ar";
  return document.documentElement.lang.startsWith("en") ? "en" : "ar";
}

function autoIntroEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("aria-auto-intro") !== "0";
  } catch {
    return true;
  }
}

export function AriaAutoIntroducer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode = useAriaStore((s) => s.mode);
  const lastKeyRef = useRef<string | null>(null);
  const handleRef = useRef<SpeakHandle | null>(null);

  // Route-change auto narration.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!autoIntroEnabled()) return;
    // When the copilot panel is open, AriaCopilot narrates. Skip here.
    if (mode !== "collapsed") return;

    const locale = pickLocale();
    const key = `${pathname}::${locale}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const text = speakablePageScript(pathname, locale);
    if (!text) return;

    handleRef.current?.stop();
    handleRef.current = null;
    try {
      const h = speakAria({ text, lang: locale });
      handleRef.current = h;
      void h.promise.catch(() => {
        /* silent — per ARIA voice policy */
      });
    } catch {
      /* best-effort */
    }

    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, [pathname, mode]);

  // Global click delegate for [data-aria-intro] icons/tiles.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let iconHandle: SpeakHandle | null = null;
    const onClick = (ev: MouseEvent) => {
      if (!autoIntroEnabled()) return;
      const target = ev.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>("[data-aria-intro]");
      if (!el) return;
      const locale = pickLocale();
      const intro = el.getAttribute("data-aria-intro") ?? "";
      const example =
        el.getAttribute(locale === "en" ? "data-aria-example-en" : "data-aria-example-ar") ??
        el.getAttribute("data-aria-example") ??
        "";
      const introText =
        el.getAttribute(locale === "en" ? "data-aria-intro-en" : "data-aria-intro-ar") ?? intro;
      if (!introText) return;
      const exampleLead =
        locale === "en" ? "Example one: " : "المِثَالُ الأَوَّل: ";
      const full = example ? `${introText} ${exampleLead}${example}.` : introText;
      iconHandle?.stop();
      try {
        iconHandle = speakAria({ text: full, lang: locale });
        void iconHandle.promise.catch(() => {});
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("click", onClick, { capture: true, passive: true });
    return () => {
      window.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
      iconHandle?.stop();
    };
  }, []);

  return null;
}

export default AriaAutoIntroducer;
