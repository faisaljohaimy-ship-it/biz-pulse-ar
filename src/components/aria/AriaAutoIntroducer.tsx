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

  // Global click delegate — activates ARIA on every interactive icon/button/link
  // across all pages and devices. Priority: explicit data-aria-intro wins,
  // else fall back to aria-label / title / visible text on the nearest
  // interactive ancestor (button, a, [role=button|link|tab|menuitem|switch|checkbox]).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let iconHandle: SpeakHandle | null = null;
    let lastAt = 0;
    let lastText = "";

    const INTERACTIVE_SEL =
      'button, a, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"], [data-aria-intro]';

    const readLabel = (el: HTMLElement): string => {
      const aria = el.getAttribute("aria-label")?.trim();
      if (aria) return aria;
      const labelledby = el.getAttribute("aria-labelledby");
      if (labelledby) {
        const parts = labelledby
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .filter(Boolean);
        if (parts.length) return parts.join(" ");
      }
      const title = el.getAttribute("title")?.trim();
      if (title) return title;
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text && text.length <= 80) return text;
      const svg = el.querySelector("svg[aria-label], svg[data-icon]");
      if (svg) {
        return (
          svg.getAttribute("aria-label")?.trim() ||
          svg.getAttribute("data-icon")?.trim() ||
          ""
        );
      }
      return "";
    };

    const onClick = (ev: MouseEvent) => {
      if (!autoIntroEnabled()) return;
      const target = ev.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>(INTERACTIVE_SEL);
      if (!el) return;
      // Ignore inputs the user is typing into.
      if (el.matches("input, textarea, select")) return;

      const locale = pickLocale();
      const explicitIntro =
        el.getAttribute(locale === "en" ? "data-aria-intro-en" : "data-aria-intro-ar") ??
        el.getAttribute("data-aria-intro") ??
        "";
      const explicitExample =
        el.getAttribute(locale === "en" ? "data-aria-example-en" : "data-aria-example-ar") ??
        el.getAttribute("data-aria-example") ??
        "";

      let introText = explicitIntro;
      let exampleText = explicitExample;

      if (!introText) {
        const label = readLabel(el);
        if (!label) return;
        introText =
          locale === "en"
            ? `${label}. This control lets you ${label.toLowerCase()} directly from here.`
            : `${label}. هٰذَا العُنْصُر يُتِيحُ لَكَ ${label} مُبَاشَرَةً مِنْ هٰذِهِ النَّافِذَة.`;
        if (!exampleText) {
          exampleText =
            locale === "en"
              ? `tap ${label} to open the related view instantly`
              : `اضْغَطْ ${label} لِفَتْحِ الوَاجِهَةِ المُرْتَبِطَة فَوْرًا`;
        }
      }

      const exampleLead = locale === "en" ? "Example one: " : "المِثَالُ الأَوَّل: ";
      const full = exampleText ? `${introText} ${exampleLead}${exampleText}.` : introText;

      // Debounce rapid duplicate clicks on same control.
      const now = Date.now();
      if (full === lastText && now - lastAt < 1500) return;
      lastText = full;
      lastAt = now;

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
