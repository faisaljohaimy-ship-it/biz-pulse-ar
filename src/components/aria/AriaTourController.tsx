/**
 * AriaTourController — Continuous Video Tour panel.
 *
 * ARIA speaks the entire scripted tour in a single pre-rendered video with
 * lip-sync baked in (/tour/aria-tour-full.mp4). While the video plays, the
 * page auto-scrolls between named sections using a fixed timestamp map. The
 * user can only mute or close; there are no per-section stops, no next/prev,
 * no progress bar.
 *
 * Discipline:
 *  • Starts ONLY on explicit user tap (the hero "Voice tour with ARIA" btn).
 *  • Single audio owner via AriaAudioBus ("tour-video"). Any other ARIA audio
 *    or route change closes the tour instantly.
 *  • Manual user scroll pauses auto-scroll for 5s, then resumes at the
 *    current narration point. Narration itself never stops.
 *  • prefers-reduced-motion: no auto-scroll (panel plays in place).
 *  • video preload="none" until the button tap. Zero layout shift.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { AriaAudioBus } from "@/lib/aria/audio-bus";

export type TourLang = "ar" | "en";

// Legacy prop shape kept so existing call sites compile without change.
// stops/lang are informational only — the video is the tour.
export interface TourStop {
  readonly id: string;
  readonly anchorId: string;
  readonly display: string;
  readonly tts: string;
}

interface Props {
  readonly open: boolean;
  readonly lang?: TourLang;
  readonly stops?: readonly TourStop[];
  readonly onClose: () => void;
}

const VIDEO_SRC = "/tour/aria-tour-full.mp4";
const HIGHLIGHT_CLASS = "aria-tour-ring";
const SCROLL_OFFSET = 96;
const USER_SCROLL_RESUME_MS = 5000;
const FADE_MS = 250;

/**
 * Fixed narration timeline (section anchor id → video currentTime seconds).
 * Ordered by time. Adjust these to the real video timing once uploaded.
 */
const TOUR_TIMELINE: ReadonlyArray<{ readonly t: number; readonly anchorId: string }> = [
  { t: 0,  anchorId: "tour-hero" },
  { t: 7,  anchorId: "tour-positioning" },
  { t: 15, anchorId: "tour-pillar-security" },
  { t: 22, anchorId: "tour-pillar-agents" },
  { t: 30, anchorId: "tour-pillar-twin" },
  { t: 37, anchorId: "tour-pillar-reports" },
  { t: 44, anchorId: "tour-pillar-hajj" },
  { t: 52, anchorId: "tour-pillar-aria" },
  { t: 59, anchorId: "tour-compliance" },
  { t: 66, anchorId: "tour-closing" },
] as const;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function scrollToAnchor(id: string, reduced: boolean): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById(id);
  if (!el) return null;
  const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
  window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  return el;
}

function clearAllRings() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((n) => {
    n.classList.remove(HIGHLIGHT_CLASS);
  });
}

function currentIndexFor(time: number): number {
  let idx = 0;
  for (let i = 0; i < TOUR_TIMELINE.length; i++) {
    if (time + 0.05 >= TOUR_TIMELINE[i].t) idx = i;
    else break;
  }
  return idx;
}

export function AriaTourController({ open, lang = "en", onClose }: Props) {
  const ar = lang === "ar";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeSectionRef = useRef<string | null>(null);
  const userScrollPausedUntilRef = useRef<number>(0);
  const programmaticScrollRef = useRef<boolean>(false);
  const [muted, setMuted] = useState(false);
  const [fading, setFading] = useState(false);
  const reduced = useMemo(prefersReducedMotion, [open]);

  // Watch route changes → same as pressing X.
  const routePath = useRouterState({ select: (s) => s.location.pathname });
  const initialRouteRef = useRef<string | null>(null);

  const handleClose = useCallback(() => {
    setFading(true);
    const v = videoRef.current;
    if (v) {
      try { v.pause(); } catch { /* noop */ }
      try { v.removeAttribute("src"); v.load(); } catch { /* noop */ }
    }
    AriaAudioBus.release("tour-video");
    clearAllRings();
    activeSectionRef.current = null;
    window.setTimeout(() => {
      setFading(false);
      onClose();
    }, FADE_MS);
  }, [onClose]);

  // Close on route change (after initial mount).
  useEffect(() => {
    if (!open) { initialRouteRef.current = null; return; }
    if (initialRouteRef.current === null) {
      initialRouteRef.current = routePath;
      return;
    }
    if (routePath !== initialRouteRef.current) handleClose();
  }, [routePath, open, handleClose]);

  // Ownership: any other ARIA source or explicit ARIA-open event closes.
  useEffect(() => {
    if (!open) return;
    const unsub = AriaAudioBus.subscribe((e) => {
      if (e.kind === "start" && e.source !== "tour-video") handleClose();
    });
    const onAriaOpen = () => handleClose();
    const onHide = () => handleClose();
    window.addEventListener("aria:open", onAriaOpen);
    window.addEventListener("pagehide", onHide);
    return () => {
      unsub();
      window.removeEventListener("aria:open", onAriaOpen);
      window.removeEventListener("pagehide", onHide);
    };
  }, [open, handleClose]);

  // User-scroll detection → pause auto-scroll for 5s.
  useEffect(() => {
    if (!open || reduced) return;
    const onWheel = () => {
      if (programmaticScrollRef.current) return;
      userScrollPausedUntilRef.current = Date.now() + USER_SCROLL_RESUME_MS;
    };
    const onTouch = onWheel;
    const onKey = (e: KeyboardEvent) => {
      if (["PageDown","PageUp","ArrowDown","ArrowUp","Home","End"," "].includes(e.key)) onWheel();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, reduced]);

  // Start video + acquire audio bus on open.
  useEffect(() => {
    if (!open) return;
    const v = videoRef.current;
    if (!v) return;

    AriaAudioBus.unlock();
    const granted = AriaAudioBus.acquire("tour-video", () => {
      // Preempted from outside.
      try { v.pause(); } catch { /* noop */ }
    });
    if (!granted) { handleClose(); return; }

    v.muted = false;
    v.currentTime = 0;
    v.play().then(() => {
      AriaAudioBus.notifyPlaying("tour-video", v);
    }).catch(() => {
      // Autoplay blocked despite user tap — retry muted so the panel isn't dead.
      v.muted = true;
      setMuted(true);
      v.play().catch(() => handleClose());
    });

    const onTime = () => {
      const idx = currentIndexFor(v.currentTime);
      const target = TOUR_TIMELINE[idx];
      if (!target) return;
      if (activeSectionRef.current === target.anchorId) return;
      activeSectionRef.current = target.anchorId;

      // Refresh ring.
      clearAllRings();
      const el = document.getElementById(target.anchorId);
      if (el) el.classList.add(HIGHLIGHT_CLASS);

      // Auto-scroll unless reduced-motion or user just scrolled.
      if (reduced) return;
      if (Date.now() < userScrollPausedUntilRef.current) return;
      programmaticScrollRef.current = true;
      scrollToAnchor(target.anchorId, false);
      window.setTimeout(() => { programmaticScrollRef.current = false; }, 900);
    };
    const onEnded = () => handleClose();
    const onStopped = () => AriaAudioBus.notifyStopped("tour-video");

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    v.addEventListener("pause", onStopped);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("pause", onStopped);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup any lingering ring when closed/unmounted.
  useEffect(() => {
    if (!open) clearAllRings();
    return () => clearAllRings();
  }, [open]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  }, []);

  if (!open) return null;

  return (
    <>
      <style>{`
        .${HIGHLIGHT_CLASS} {
          position: relative;
          transition: box-shadow 420ms ease, outline-color 420ms ease;
          outline: 2px solid rgba(52, 211, 153, 0.55);
          outline-offset: 6px;
          box-shadow: 0 0 0 6px rgba(16,185,129,0.14), 0 0 46px rgba(16,185,129,0.28);
          border-radius: 18px;
          animation: aria-tour-pulse 2600ms ease-in-out infinite;
        }
        @keyframes aria-tour-pulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(16,185,129,0.12), 0 0 40px rgba(16,185,129,0.22); }
          50%      { box-shadow: 0 0 0 8px rgba(16,185,129,0.20), 0 0 62px rgba(16,185,129,0.38); }
        }
        @media (prefers-reduced-motion: reduce) {
          .${HIGHLIGHT_CLASS} { animation: none !important; }
        }
        .aria-tour-panel {
          position: fixed;
          z-index: 70;
          border-radius: 22px;
          overflow: hidden;
          background: #041a12;
          border: 1px solid rgba(52,211,153,0.35);
          box-shadow:
            0 0 0 1px rgba(52,211,153,0.15),
            0 18px 60px rgba(6,26,20,0.55),
            0 0 80px rgba(16,185,129,0.35);
          transition: opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out;
        }
        /* Desktop: bottom-right */
        @media (min-width: 768px) {
          .aria-tour-panel {
            right: 24px;
            bottom: 24px;
            width: 240px;
          }
          [dir="rtl"] .aria-tour-panel { right: auto; left: 24px; }
        }
        /* Mobile: bottom-center, above safe-area */
        @media (max-width: 767.98px) {
          .aria-tour-panel {
            left: 50%;
            transform: translateX(-50%);
            bottom: calc(16px + env(safe-area-inset-bottom));
            width: 40vw;
            min-width: 180px;
            max-width: 260px;
          }
          .aria-tour-panel.aria-tour-fading { transform: translateX(-50%) scale(0.96); }
        }
        .aria-tour-panel.aria-tour-fading { opacity: 0; }
      `}</style>

      <div
        role="dialog"
        aria-label={ar ? "جولة آريا التقديمية" : "ARIA guided tour"}
        dir={ar ? "rtl" : "ltr"}
        className={`aria-tour-panel ${fading ? "aria-tour-fading" : ""}`}
      >
        <div style={{ position: "relative", width: "100%", aspectRatio: "9 / 16", background: "#000" }}>
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            playsInline
            preload="none"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {/* Corner controls */}
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? (ar ? "تشغيل الصوت" : "Unmute") : (ar ? "كتم الصوت" : "Mute")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/40 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label={ar ? "إغلاق الجولة" : "Close tour"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/40 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default AriaTourController;
