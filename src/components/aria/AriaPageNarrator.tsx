/**
 * AriaPageNarrator — global surface (Constitution Article 22).
 *
 * On every route change ARIA speaks a short bilingual blurb describing the
 * page the executive just landed on. Runs client-only, respects the
 * `aria:narrate:enabled` toggle, gates on the first user gesture to
 * satisfy browser autoplay policies, and always cancels any prior speech
 * before starting the next one so route transitions never stack audio.
 *
 * Non-goals:
 *  - Rendering UI (this component returns null).
 *  - Reading page data — page-specific speakers register via the ARIA
 *    context surface; this component is the always-on baseline.
 */
import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { speakAria, type SpeakHandle } from "@/lib/digital-humans/aria-voice";
import { NARRATE_STORAGE_KEY, isSilentRoute, narrationFor } from "@/lib/aria/page-narrations";
import { useIntroActive } from "@/lib/intro-store";

const START_DELAY_MS = 120; // "first fraction of a second" per user directive
let unlocked = false;
let unlockBound = false;

function bindUnlock() {
  if (unlockBound || typeof window === "undefined") return;
  unlockBound = true;
  const arm = () => {
    unlocked = true;
    window.removeEventListener("pointerdown", arm);
    window.removeEventListener("keydown", arm);
    window.removeEventListener("touchstart", arm);
  };
  window.addEventListener("pointerdown", arm, { once: true });
  window.addEventListener("keydown", arm, { once: true });
  window.addEventListener("touchstart", arm, { once: true });
}

function readEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(NARRATE_STORAGE_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function AriaPageNarrator() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const introActive = useIntroActive();
  const handleRef = useRef<SpeakHandle | null>(null);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    bindUnlock();
  }, []);

  useEffect(() => {
    if (introActive) return;
    if (typeof window === "undefined") return;
    if (isSilentRoute(pathname)) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    if (!readEnabled()) return;

    const locale: "ar" | "en" =
      typeof document !== "undefined" && document.documentElement.lang.startsWith("en")
        ? "en"
        : "ar";
    const n = narrationFor(pathname, locale);
    if (!n) return;
    const text = locale === "en" ? n.en : n.ar;
    if (!text) return;

    // Cancel any prior speech immediately — no audio stacking on nav.
    handleRef.current?.stop();
    handleRef.current = null;

    const t = window.setTimeout(() => {
      if (!unlocked) return; // wait for first gesture per browser autoplay policy
      try {
        const h = speakAria({ text, lang: locale });
        handleRef.current = h;
        void h.promise.catch(() => {
          // Silent failure — ARIA policy is silence over robotic fallback.
        });
      } catch {
        /* narrator is best-effort */
      }
    }, START_DELAY_MS);

    return () => {
      window.clearTimeout(t);
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, [pathname, introActive]);

  return null;
}
