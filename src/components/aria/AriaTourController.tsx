/**
 * AriaTourController — Living ARIA Presenter Panel synced to the page.
 *
 * A single pre-rendered 81.8s portrait video of ARIA speaking the full
 * Arabic tour (lip-sync + gestures baked in). Its embedded audio IS the
 * narration. The panel breathes and floats — the <video> itself never
 * transforms so lip-sync stays crisp.
 *
 * Discipline:
 *  • Mounts + starts ONLY on explicit user tap (hero "Voice tour" button).
 *  • Single audio owner via AriaAudioBus ("tour-video"). Any other ARIA
 *    audio source, chat open, route change, or pagehide → close instantly.
 *  • preload="none" until mount; load+play inside the tap-triggered effect.
 *  • Manual user scroll pauses auto-scroll for 5s, narration never stops.
 *  • prefers-reduced-motion: no auto-scroll, no float/glow.
 *  • Zero layout shift, zero new dependencies.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import tourVideoAsset from "@/assets/aria-tour-full.mp4.asset.json";

export type TourLang = "ar" | "en";

// Legacy prop shape kept so existing call sites compile unchanged.
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

const VIDEO_SRC = tourVideoAsset.url;
const HIGHLIGHT_CLASS = "aria-tour-ring";
const SCROLL_OFFSET = 96;
const USER_SCROLL_RESUME_MS = 5000;
const FADE_MS = 250;

/**
 * Section timeline (video currentTime → page section id).
 * Ordered by time. 81.8s narration.
 */
const TOUR_MAP: ReadonlyArray<{ readonly t: number; readonly anchorId: string }> = [
  { t: 0, anchorId: "tour-hero" },
  { t: 8, anchorId: "tour-positioning" },
  { t: 17, anchorId: "tour-pillar-security" },
  { t: 26, anchorId: "tour-pillar-agents" },
  { t: 35, anchorId: "tour-pillar-twin" },
  { t: 44, anchorId: "tour-pillar-reports" },
  { t: 53, anchorId: "tour-pillar-hajj" },
  { t: 62, anchorId: "tour-pillar-aria" },
  { t: 70, anchorId: "tour-compliance" },
  { t: 76, anchorId: "tour-closing" },
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
  for (let i = 0; i < TOUR_MAP.length; i++) {
    if (time + 0.05 >= TOUR_MAP[i].t) idx = i;
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
  const initialRouteRef = useRef<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [fading, setFading] = useState(false);
  const reduced = useMemo(prefersReducedMotion, [open]);

  const routePath = useRouterState({ select: (s) => s.location.pathname });

  const handleClose = useCallback(() => {
    setFading(true);
    setSpeaking(false);
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
      } catch {
        /* noop */
      }
      try {
        v.removeAttribute("src");
        v.load();
      } catch {
        /* noop */
      }
    }
    AriaAudioBus.release("tour-video");
    clearAllRings();
    activeSectionRef.current = null;
    window.setTimeout(() => {
      setFading(false);
      onClose();
    }, FADE_MS);
  }, [onClose]);

  // Route change closes the tour.
  useEffect(() => {
    if (!open) {
      initialRouteRef.current = null;
      return;
    }
    if (initialRouteRef.current === null) {
      initialRouteRef.current = routePath;
      return;
    }
    if (routePath !== initialRouteRef.current) handleClose();
  }, [routePath, open, handleClose]);

  // Bus ownership + ARIA-open / pagehide → close.
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

  // User-scroll detection → pause auto-scroll 5s.
  useEffect(() => {
    if (!open || reduced) return;
    const bump = () => {
      if (programmaticScrollRef.current) return;
      userScrollPausedUntilRef.current = Date.now() + USER_SCROLL_RESUME_MS;
    };
    const onKey = (e: KeyboardEvent) => {
      if (["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End", " "].includes(e.key))
        bump();
    };
    window.addEventListener("wheel", bump, { passive: true });
    window.addEventListener("touchmove", bump, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", bump);
      window.removeEventListener("touchmove", bump);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, reduced]);

  // Start video + wire timeupdate/ended on mount (open=true triggered by tap).
  useEffect(() => {
    if (!open) return;
    const v = videoRef.current;
    if (!v) return;

    AriaAudioBus.unlock();
    const granted = AriaAudioBus.acquire("tour-video", () => {
      try {
        v.pause();
      } catch {
        /* noop */
      }
    });
    if (!granted) {
      handleClose();
      return;
    }

    v.muted = false;
    setMuted(false);
    try {
      v.load();
    } catch {
      /* noop */
    }
    try {
      v.currentTime = 0;
    } catch {
      /* noop */
    }
    v.play()
      .then(() => {
        AriaAudioBus.notifyPlaying("tour-video", v);
        setSpeaking(true);
      })
      .catch(() => {
        // Autoplay-with-sound blocked — fall back to muted so panel shows life.
        v.muted = true;
        setMuted(true);
        v.play()
          .then(() => setSpeaking(true))
          .catch(() => handleClose());
      });

    const onTime = () => {
      // "Speaking" only when actively playing with sound reaching output.
      setSpeaking(!v.paused && !v.ended);

      const idx = currentIndexFor(v.currentTime);
      const target = TOUR_MAP[idx];
      if (!target) return;
      if (activeSectionRef.current === target.anchorId) return;
      activeSectionRef.current = target.anchorId;

      clearAllRings();
      const el = document.getElementById(target.anchorId);
      if (el) el.classList.add(HIGHLIGHT_CLASS);

      if (reduced) return;
      if (Date.now() < userScrollPausedUntilRef.current) return;
      programmaticScrollRef.current = true;
      scrollToAnchor(target.anchorId, false);
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 900);
    };
    const onEnded = () => {
      setSpeaking(false);
      handleClose();
    };
    const onPause = () => {
      setSpeaking(false);
      AriaAudioBus.notifyStopped("tour-video");
    };
    const onPlay = () => {
      setSpeaking(true);
    };

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    v.addEventListener("pause", onPause);
    v.addEventListener("play", onPlay);

    // Tab visibility → pause / resume; narration position preserved.
    const onVisibility = () => {
      if (document.hidden) {
        try {
          v.pause();
        } catch {
          /* noop */
        }
      } else {
        v.play().catch(() => {
          /* noop */
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("play", onPlay);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup rings on close/unmount.
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

        /* PANEL SHELL — RTL-aware, inline-start bottom on desktop. Motion
           lives on the panel wrapper only; the <video> itself never scales,
           translates, or rotates so lip-sync frames stay pixel-crisp. */
        .aria-tour-shell {
          position: fixed;
          z-index: 70;
          bottom: calc(20px + env(safe-area-inset-bottom));
          border-radius: 1rem;
          overflow: hidden;
          background: #041a12;
          border: 1px solid rgba(16,185,129,0.25);
          box-shadow:
            0 0 0 1px rgba(52,211,153,0.15),
            0 18px 60px rgba(6,26,20,0.55),
            0 0 60px rgba(16,185,129,0.35);
          animation:
            aria-tour-panel-float 7s ease-in-out infinite,
            aria-tour-panel-glow 4s ease-in-out infinite;
          transition: opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out;
          transform-origin: bottom center;
        }
        /* Desktop: 230px, inline-start corner (LTR: left, RTL: right). */
        @media (min-width: 768px) {
          .aria-tour-shell {
            inset-inline-start: 24px;
            width: 230px;
          }
        }
        /* Mobile: bottom-center, 38vw capped at 200px. */
        @media (max-width: 767.98px) {
          .aria-tour-shell {
            left: 50%;
            width: 38vw;
            min-width: 160px;
            max-width: 200px;
            /* Offset above the ARIA chat FAB (which sits at bottom-right
               with its own safe-area padding). */
            bottom: calc(88px + env(safe-area-inset-bottom));
            animation:
              aria-tour-panel-float-mobile 7s ease-in-out infinite,
              aria-tour-panel-glow 4s ease-in-out infinite;
          }
        }
        .aria-tour-shell.aria-tour-fading { opacity: 0; }

        @keyframes aria-tour-panel-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes aria-tour-panel-float-mobile {
          0%, 100% { transform: translate(-50%, 0); }
          50%      { transform: translate(-50%, -6px); }
        }
        @keyframes aria-tour-panel-glow {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(52,211,153,0.15),
              0 18px 60px rgba(6,26,20,0.55),
              0 0 40px rgba(16,185,129,0.25);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(52,211,153,0.30),
              0 18px 60px rgba(6,26,20,0.55),
              0 0 80px rgba(16,185,129,0.45);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .${HIGHLIGHT_CLASS} { animation: none !important; }
          .aria-tour-shell {
            animation: none !important;
          }
          @media (max-width: 767.98px) {
            .aria-tour-shell { transform: translateX(-50%); }
          }
        }

        /* Equalizer bars — decorative, pulse only while speaking. */
        .aria-tour-eq {
          position: fixed;
          z-index: 70;
          bottom: calc(38px + env(safe-area-inset-bottom));
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 22px;
          pointer-events: none;
        }
        @media (min-width: 768px) {
          .aria-tour-eq { inset-inline-start: calc(24px + 230px + 10px); }
        }
        @media (max-width: 767.98px) {
          .aria-tour-eq {
            left: calc(50% + 38vw / 2 + 8px);
            bottom: calc(96px + env(safe-area-inset-bottom));
          }
        }
        .aria-tour-eq span {
          width: 3px;
          background: linear-gradient(180deg, rgba(52,211,153,0.9), rgba(16,185,129,0.55));
          border-radius: 2px;
          transform-origin: bottom;
          animation: aria-tour-eq-bar 900ms ease-in-out infinite;
        }
        .aria-tour-eq span:nth-child(1) { animation-delay: 0ms; }
        .aria-tour-eq span:nth-child(2) { animation-delay: 180ms; }
        .aria-tour-eq span:nth-child(3) { animation-delay: 360ms; }
        @keyframes aria-tour-eq-bar {
          0%, 100% { transform: scaleY(0.35); opacity: 0.7; }
          50%      { transform: scaleY(1);    opacity: 1;   }
        }
        @media (prefers-reduced-motion: reduce) {
          .aria-tour-eq span { animation: none !important; transform: scaleY(0.6); }
        }
      `}</style>

      <div
        role="dialog"
        aria-label={ar ? "جولة آريا التقديمية" : "ARIA guided tour"}
        dir={ar ? "rtl" : "ltr"}
        className={`aria-tour-shell ${fading ? "aria-tour-fading" : ""}`}
      >
        <div
          style={{ position: "relative", width: "100%", aspectRatio: "9 / 16", background: "#000" }}
        >
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            playsInline
            preload="none"
            /* NO transform on the video — lip-sync must remain pixel-perfect. */
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? (ar ? "تشغيل الصوت" : "Unmute") : ar ? "كتم الصوت" : "Mute"}
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

      {/* Equalizer — visible only while she is actively speaking. */}
      {speaking && !muted && (
        <div aria-hidden className="aria-tour-eq" dir={ar ? "rtl" : "ltr"}>
          <span />
          <span />
          <span />
        </div>
      )}
    </>
  );
}

export default AriaTourController;
