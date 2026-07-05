import { useEffect, useMemo, useRef, useState } from "react";
import heroAudio from "@/assets/hero-assembly-audio.mp3.asset.json";
import { useI18n } from "@/lib/i18n";

/**
 * NEXIOS Letter Genesis — one-shot cinematic pre-page gate.
 *
 *   1. Full-viewport dark charcoal (#07090D) with a soft vignette.
 *   2. Single "Enter / دخول" button, chrome ring + emerald pulse.
 *   3. On tap: audio starts, letters "NEXIOS" phase through
 *      A (rotating scattered) → B (drifting toward center) → C (assembly).
 *   4. Auto-crossfades out on completion (or 8 s hard cap). A "Skip / تخطي"
 *      chip appears after 1 s.
 *   5. Session-scoped: shown once per session via `sessionStorage`.
 *
 * Pure CSS 3D + React. No Three.js, no new dependencies.
 * prefers-reduced-motion: skips phases and never autoplays audio.
 */

const WORD = "NEXIOS";
const AUDIO_SRC = heroAudio.url;
const SEEN_KEY = "nexios-genesis-seen";

const T_PHASE_B = 1200;
const T_PHASE_C = 2000;
const T_DONE = 4000;
const T_MAX = 8000;
const T_FADE = 600;

type Scatter = {
  x: string; y: string; z: string;
  rx: number; ry: number; rz: number;
  spinDur: number; spinDir: 1 | -1;
};

function makeScatter(count: number, mobile: boolean): Scatter[] {
  const xR = mobile ? 20 : 40;
  const yR = mobile ? 15 : 30;
  const r = (a: number, b: number) => Math.random() * (b - a) + a;
  return Array.from({ length: count }, () => ({
    x: `${r(-xR, xR).toFixed(2)}vw`,
    y: `${r(-yR, yR).toFixed(2)}vh`,
    z: `${r(-600, 300).toFixed(0)}px`,
    rx: Math.round(r(-180, 180)),
    ry: Math.round(r(-180, 180)),
    rz: Math.round(r(-180, 180)),
    spinDur: r(3.5, 6.5),
    spinDir: Math.random() > 0.5 ? 1 : -1,
  }));
}

function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRm(mq.matches);
    const h = (e: MediaQueryListEvent) => setRm(e.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);
  return rm;
}
function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    setM(mq.matches);
    const h = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);
  return m;
}

export function NexiosGenesisIntro() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const letters = useMemo(() => WORD.split(""), []);

  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"gate" | "A" | "B" | "C" | "done" | "gone">("gate");
  const [showSkip, setShowSkip] = useState(false);
  const [fading, setFading] = useState(false);

  const scatterRef = useRef<Scatter[] | null>(null);
  if (scatterRef.current === null) scatterRef.current = makeScatter(letters.length, isMobile);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<number[]>([]);

  // Session gate — decide whether to mount at all.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) return;
    } catch { /* noop */ }
    setMounted(true);
  }, []);

  // Center-out stagger.
  const stagger = useMemo(() => {
    const c = (letters.length - 1) / 2;
    return letters
      .map((_, i) => ({ i, d: Math.abs(i - c) }))
      .sort((a, b) => a.d - b.d)
      .reduce<number[]>((acc, x, rank) => { acc[x.i] = rank; return acc; }, []);
  }, [letters]);

  const dismiss = () => {
    try { window.sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* noop */ }
    const a = audioRef.current;
    if (a) { try { a.pause(); } catch { /* noop */ } }
    setFading(true);
    window.setTimeout(() => setPhase("gone"), T_FADE);
  };

  const stopAllTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  const beginSequence = () => {
    if (reducedMotion) {
      setPhase("done");
      timersRef.current.push(window.setTimeout(dismiss, 900));
      return;
    }
    setPhase("A");
    const a = audioRef.current;
    if (a) {
      a.muted = false;
      a.volume = 0.9;
      try { void a.play(); } catch { /* noop */ }
    }
    timersRef.current.push(window.setTimeout(() => setPhase("B"), T_PHASE_B));
    timersRef.current.push(window.setTimeout(() => setPhase("C"), T_PHASE_C));
    timersRef.current.push(window.setTimeout(() => setPhase("done"), T_DONE));
    const cap = () => dismiss();
    // Dismiss when audio ends OR at hard cap, whichever is later — capped to T_MAX.
    const hardCap = window.setTimeout(cap, T_MAX);
    timersRef.current.push(hardCap);
    if (a) {
      const onEnd = () => {
        // If sequence already done, dismiss now.
        window.clearTimeout(hardCap);
        dismiss();
      };
      a.addEventListener("ended", onEnd, { once: true });
    } else {
      // No audio → dismiss shortly after assembly.
      timersRef.current.push(window.setTimeout(dismiss, T_DONE + 400));
    }
    // Show skip after 1s.
    timersRef.current.push(window.setTimeout(() => setShowSkip(true), 1000));
  };

  useEffect(() => () => stopAllTimers(), []);

  if (!mounted || phase === "gone") return null;

  const scatter = scatterRef.current;

  return (
    <div
      className="nx-genesis"
      data-phase={phase}
      data-fading={fading ? "1" : "0"}
      role="dialog"
      aria-modal="true"
      aria-label="NEXIOS"
    >
      <audio ref={audioRef} src={AUDIO_SRC} preload="none" playsInline />

      <div className="nx-genesis__stage" style={{ perspective: "1200px" }}>
        {phase === "gate" ? (
          <button
            type="button"
            onClick={beginSequence}
            className="nx-genesis__enter"
            aria-label={ar ? "دخول" : "Enter"}
          >
            <span className="nx-genesis__enter-glow" aria-hidden />
            <span className="nx-genesis__enter-label">{ar ? "دخول" : "Enter"}</span>
          </button>
        ) : (
          <h1 className={`nx-genesis__word nx-genesis__word--${phase}`}>
            {letters.map((ch, i) => {
              const s = scatter![i];
              const styleVars: React.CSSProperties = {
                ["--sx" as never]: s.x,
                ["--sy" as never]: s.y,
                ["--sz" as never]: s.z,
                ["--rx" as never]: `${s.rx}deg`,
                ["--ry" as never]: `${s.ry}deg`,
                ["--rz" as never]: `${s.rz}deg`,
                ["--sd" as never]: `${s.spinDur.toFixed(2)}s`,
                ["--sdir" as never]: `${s.spinDir}`,
                animationDelay: `${stagger[i] * 70}ms`,
              };
              return (
                <span key={i} className="nx-genesis__letter" style={styleVars} aria-hidden>
                  {ch}
                </span>
              );
            })}
          </h1>
        )}
      </div>

      {showSkip && phase !== "gate" && (
        <button
          type="button"
          onClick={dismiss}
          className="nx-genesis__skip"
          aria-label={ar ? "تخطي" : "Skip"}
        >
          {ar ? "تخطي" : "Skip"}
        </button>
      )}

      <style>{`
        .nx-genesis {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background:
            radial-gradient(80% 60% at 50% 50%, rgba(20,26,36,1) 0%, #07090D 60%, #04060A 100%);
          display: flex; align-items: center; justify-content: center;
          transition: opacity ${T_FADE}ms ease;
          opacity: 1;
        }
        .nx-genesis[data-fading="1"] { opacity: 0; pointer-events: none; }
        .nx-genesis__stage {
          position: relative;
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          transform-style: preserve-3d;
        }

        /* ── Enter button ─────────────────────────────── */
        .nx-genesis__enter {
          position: relative;
          appearance: none;
          border: 1px solid rgba(220,230,240,0.35);
          background: linear-gradient(180deg, rgba(30,36,48,0.5), rgba(10,14,20,0.7));
          color: #eef2f6;
          font-weight: 700;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-size: 0.85rem;
          padding: 1rem 2.4rem;
          border-radius: 9999px;
          cursor: pointer;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.05) inset,
            0 8px 30px rgba(0,0,0,0.5),
            0 0 24px rgba(16,185,129,0.35);
          transition: transform 200ms ease, box-shadow 300ms ease, border-color 300ms ease;
        }
        .nx-genesis__enter:hover {
          border-color: rgba(16,185,129,0.7);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.05) inset,
            0 8px 30px rgba(0,0,0,0.5),
            0 0 36px rgba(16,185,129,0.6);
          transform: translateY(-1px);
        }
        .nx-genesis__enter:active { transform: translateY(0) scale(0.98); }
        .nx-genesis__enter-glow {
          position: absolute; inset: -6px;
          border-radius: 9999px;
          pointer-events: none;
          box-shadow: 0 0 0 0 rgba(16,185,129,0.55);
          animation: nxEnterPulse 2.2s ease-out infinite;
        }
        .nx-genesis__enter-label { position: relative; z-index: 1; }
        @keyframes nxEnterPulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); }
          70%  { box-shadow: 0 0 0 18px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }

        /* ── Wordmark ─────────────────────────────────── */
        .nx-genesis__word {
          position: relative;
          margin: 0;
          font-weight: 900;
          letter-spacing: 0.06em;
          line-height: 1;
          font-size: clamp(2.6rem, 8vw, 5.5rem);
          display: inline-flex;
          transform-style: preserve-3d;
          direction: ltr;
          isolation: isolate;
        }
        @media (max-width: 767px) {
          .nx-genesis__word { font-size: clamp(2.4rem, 12vw, 4.5rem); }
        }
        .nx-genesis__letter {
          display: inline-block;
          background: linear-gradient(
            175deg,
            #f8f9fb 0%, #c8ccd4 18%, #6e7480 38%,
            #2a2e36 50%, #9aa0ac 64%, #eef0f4 82%, #b8bcc6 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          will-change: transform, opacity, filter;
          text-shadow:
            0 0 8px rgba(16,185,129,0.18),
            0 0 14px rgba(34,211,238,0.12);
        }

        /* Phase A: scattered + spinning + soft blur */
        .nx-genesis__word--A .nx-genesis__letter {
          opacity: 0.95;
          transform:
            translate3d(var(--sx), var(--sy), var(--sz))
            rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz));
          filter: blur(1px);
          text-shadow:
            0 0 10px rgba(16,185,129,0.30),
            0 0 16px rgba(34,211,238,0.18);
          animation: nxSpin var(--sd) linear infinite;
        }

        /* Phase B: drift toward center, spin easing down, glow rising */
        .nx-genesis__word--B .nx-genesis__letter {
          opacity: 1;
          transform:
            translate3d(calc(var(--sx) * 0.55), calc(var(--sy) * 0.55), calc(var(--sz) * 0.5))
            rotateX(calc(var(--rx) * 0.4)) rotateY(calc(var(--ry) * 0.4)) rotateZ(calc(var(--rz) * 0.4));
          transition: transform 800ms cubic-bezier(0.4,0,0.2,1), filter 800ms ease, text-shadow 800ms ease;
          filter: blur(0.5px);
          text-shadow:
            0 0 12px rgba(16,185,129,0.45),
            0 0 20px rgba(34,211,238,0.28);
        }

        /* Phase C: assemble to final, flash to 100% glow */
        .nx-genesis__word--C .nx-genesis__letter {
          opacity: 1;
          transform: none;
          transition:
            transform 1900ms cubic-bezier(0.16,1,0.3,1) var(--_stagger, 0ms),
            filter 900ms ease,
            text-shadow 900ms ease;
          filter: none;
          animation: nxFlash 1400ms ease-out both;
        }

        /* Done: settled, gentle 70% glow, single light sweep */
        .nx-genesis__word--done .nx-genesis__letter {
          opacity: 1;
          transform: none;
          filter: none;
          text-shadow:
            0 0 12px rgba(16,185,129,0.55),
            0 0 22px rgba(34,211,238,0.35);
        }
        .nx-genesis__word--done::after {
          content: "";
          position: absolute; inset: 0;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 0%, transparent 40%,
            rgba(255,255,255,0.85) 50%,
            transparent 60%, transparent 100%
          );
          mix-blend-mode: screen;
          transform: translateX(-120%);
          animation: nxSweep 1200ms ease-out 100ms 1 forwards;
        }

        @keyframes nxSpin {
          0%   { transform: translate3d(var(--sx),var(--sy),var(--sz))
                            rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz)); }
          100% { transform: translate3d(var(--sx),var(--sy),var(--sz))
                            rotateX(calc(var(--rx) + calc(360deg * var(--sdir))))
                            rotateY(calc(var(--ry) + calc(360deg * var(--sdir))))
                            rotateZ(calc(var(--rz) + calc(180deg * var(--sdir)))); }
        }
        @keyframes nxFlash {
          0%   { text-shadow: 0 0 12px rgba(16,185,129,0.45), 0 0 20px rgba(34,211,238,0.28); }
          55%  { text-shadow: 0 0 22px rgba(16,185,129,0.95), 0 0 34px rgba(34,211,238,0.65); }
          100% { text-shadow: 0 0 12px rgba(16,185,129,0.55), 0 0 22px rgba(34,211,238,0.35); }
        }
        @keyframes nxSweep {
          0%   { transform: translateX(-120%); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }

        /* ── Skip chip ────────────────────────────────── */
        .nx-genesis__skip {
          position: absolute;
          bottom: calc(1.25rem + env(safe-area-inset-bottom));
          right: 1.25rem;
          appearance: none;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(10,14,20,0.55);
          color: rgba(240,245,255,0.85);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          padding: 0.5rem 0.95rem;
          border-radius: 9999px;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 200ms ease, border-color 200ms ease;
          animation: nxFadeIn 300ms ease-out both;
        }
        .nx-genesis__skip:hover { background: rgba(20,26,36,0.75); border-color: rgba(255,255,255,0.35); }
        [dir="rtl"] .nx-genesis__skip { right: auto; left: 1.25rem; }
        @keyframes nxFadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .nx-genesis__letter,
          .nx-genesis__word--A .nx-genesis__letter,
          .nx-genesis__word--B .nx-genesis__letter,
          .nx-genesis__word--C .nx-genesis__letter,
          .nx-genesis__word--done .nx-genesis__letter {
            animation: none !important;
            transform: none !important;
            filter: none !important;
            transition: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
