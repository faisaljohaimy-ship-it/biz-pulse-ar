import { useEffect, useMemo, useRef, useState } from "react";
import heroAudio from "@/assets/hero-assembly-audio.mp3.asset.json";

/**
 * Cinematic "Chrome Assembly" wordmark — 3D forge sequence.
 * Pure CSS 3D + SVG. No Three.js / WebGL / new deps.
 *
 * Sequence (~4.5s, once on mount, matches attached reference video):
 *   0.0–0.4s  ember ignition — warm glow blooms from center
 *   0.4–1.8s  scattered chrome letters drift/tumble in deep Z-space
 *             + energy rings orbit inward, contracting toward center
 *   1.8–3.6s  each letter converges to its final slot with center-out
 *             stagger, motion-blur clears, rings collapse into a halo
 *   3.6s+     single metallic light-sweep fires; halo fades; onAssembled()
 *
 * Sound: only on user gesture (see `playAudio`).
 * Reduced motion: skips scatter, renders assembled wordmark + sweep only.
 */

const WORD = "NEXIOS AI";
const AUDIO_SRC = heroAudio.url;

// Timing (ms) — kept in sync with the CSS keyframes below.
const T_SCATTER_END = 1800;   // phase 1 → phase 2 handoff
const T_ASSEMBLE_END = 3600;  // phase 2 → done
const T_TOTAL = 4400;         // done → subhead fade-up

type Scatter = {
  x: string; y: string; z: string;
  rx: number; ry: number; rz: number;
  tumble: number;
};

function makeScatter(count: number, mobile: boolean): Scatter[] {
  const xRange = mobile ? 22 : 42;
  const yRange = mobile ? 16 : 32;
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;
  return Array.from({ length: count }, () => ({
    x: `${rand(-xRange, xRange).toFixed(2)}vw`,
    y: `${rand(-yRange, yRange).toFixed(2)}vh`,
    z: `${rand(-700, 340).toFixed(0)}px`,
    rx: Math.round(rand(-140, 140)),
    ry: Math.round(rand(-140, 140)),
    rz: Math.round(rand(-140, 140)),
    tumble: rand(0, 2),
  }));
}

export interface HeroChromeWordmarkProps {
  onAssembled?: () => void;
  replayToken?: number;
}

export function HeroChromeWordmark({ onAssembled, replayToken }: HeroChromeWordmarkProps) {
  const letters = useMemo(() => WORD.split(""), []);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const scatterRef = useRef<Scatter[] | null>(null);
  if (scatterRef.current === null) {
    scatterRef.current = makeScatter(letters.length, isMobile);
  }
  const scatter = scatterRef.current;

  const [phase, setPhase] = useState<"scatter" | "assembling" | "done">(
    reducedMotion ? "done" : "scatter",
  );
  const [needsUnmute, setNeedsUnmute] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (reducedMotion) { onAssembled?.(); return; }
    // Auto-play from the start of the hero. Try unmuted first; if the browser
    // blocks (no prior gesture), fall back to muted autoplay and surface a
    // one-tap unmute chip so sound still starts as early as possible.
    void autoplayAudio(audioRef).then((state) => {
      if (state === "muted-fallback") setNeedsUnmute(true);
    });
    const t1 = window.setTimeout(() => setPhase("assembling"), T_SCATTER_END);
    const t2 = window.setTimeout(() => setPhase("done"), T_ASSEMBLE_END);
    const t3 = window.setTimeout(() => onAssembled?.(), T_TOTAL);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); };
  }, [onAssembled, reducedMotion]);

  useEffect(() => {
    if (!replayToken) return;
    if (reducedMotion) { void playAudio(audioRef); setNeedsUnmute(false); return; }
    scatterRef.current = makeScatter(letters.length, isMobile);
    setPhase("scatter");
    void playAudio(audioRef);
    setNeedsUnmute(false);
    const t1 = window.setTimeout(() => setPhase("assembling"), T_SCATTER_END);
    const t2 = window.setTimeout(() => setPhase("done"), T_ASSEMBLE_END);
    const t3 = window.setTimeout(() => onAssembled?.(), T_TOTAL);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); };
  }, [replayToken, isMobile, letters.length, onAssembled, reducedMotion]);

  const handleUnmute = () => {
    const a = audioRef.current;
    if (!a) return;
    try { a.muted = false; a.volume = 0.9; void a.play(); } catch { /* noop */ }
    setNeedsUnmute(false);
  };

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) { try { a.pause(); a.currentTime = 0; } catch { /* noop */ } }
    };
  }, []);

  // Center-out stagger order.
  const staggerOrder = useMemo(() => {
    const center = (letters.length - 1) / 2;
    return letters
      .map((_, i) => ({ i, d: Math.abs(i - center) }))
      .sort((a, b) => a.d - b.d)
      .reduce<number[]>((acc, item, rank) => { acc[item.i] = rank; return acc; }, []);
  }, [letters]);

  const showRings = phase !== "done";
  const showSweep = phase === "done";

  return (
    <div
      className="hero-chrome-wrap"
      aria-label={WORD}
      role="img"
      style={{ perspective: "1400px" }}
    >
      <audio ref={audioRef} src={AUDIO_SRC} preload="none" playsInline />

      {/* Ember / forge glow behind the wordmark. */}
      <div className={`hero-chrome-forge hero-chrome-forge--${phase}`} aria-hidden />

      {/* Energy rings — orbit inward, collapse to a halo on assemble. */}
      {!reducedMotion && showRings && (
        <svg
          className={`hero-chrome-rings hero-chrome-rings--${phase}`}
          viewBox="-100 -100 200 200"
          aria-hidden
        >
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(180,200,220,0)" />
              <stop offset="45%" stopColor="rgba(220,230,240,0.9)" />
              <stop offset="55%" stopColor="rgba(255,255,255,1)" />
              <stop offset="100%" stopColor="rgba(120,140,160,0)" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse
              key={i}
              cx={0} cy={0}
              rx={90 - i * 6} ry={30 - i * 2}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth={0.6}
              className="hero-chrome-ring"
              style={{
                transform: `rotate(${i * 34}deg) rotateX(${60 + i * 6}deg)`,
                animationDelay: `${i * 90}ms`,
              }}
            />
          ))}
        </svg>
      )}

      <h1 className={`hero-chrome ${showSweep ? "hero-chrome--sweep" : ""}`}>
        {letters.map((ch, i) => {
          const s = scatter[i];
          const isSpace = ch === " ";
          const styleVars: React.CSSProperties = {
            ["--sx" as never]: s.x,
            ["--sy" as never]: s.y,
            ["--sz" as never]: s.z,
            ["--rx" as never]: `${s.rx}deg`,
            ["--ry" as never]: `${s.ry}deg`,
            ["--rz" as never]: `${s.rz}deg`,
            ["--tumble-delay" as never]: `${s.tumble.toFixed(2)}s`,
            animationDelay: `${staggerOrder[i] * 70}ms`,
          };
          return (
            <span
              key={`${ch}-${i}`}
              className={
                isSpace
                  ? "hero-chrome__space"
                  : `hero-chrome__letter hero-chrome__letter--${phase}`
              }
              style={isSpace ? undefined : styleVars}
              aria-hidden
            >
              {isSpace ? "\u00A0" : ch}
            </span>
          );
        })}
      </h1>

      <style>{`
        .hero-chrome-wrap {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          min-height: 1.2em;
          direction: ltr;
          transform-style: preserve-3d;
        }

        /* ── Forge glow ─────────────────────────────────────── */
        .hero-chrome-forge {
          position: absolute;
          inset: -40% -10%;
          pointer-events: none;
          background:
            radial-gradient(ellipse 55% 45% at 50% 50%,
              rgba(255, 170, 90, 0.35) 0%,
              rgba(255, 120, 60, 0.18) 22%,
              rgba(120, 90, 200, 0.10) 48%,
              transparent 72%);
          filter: blur(24px);
          opacity: 0;
          transform: scale(0.6);
          transition: opacity 900ms ease, transform 1400ms cubic-bezier(0.16,1,0.3,1);
          mix-blend-mode: screen;
          z-index: 0;
        }
        .hero-chrome-forge--scatter    { opacity: 0.85; transform: scale(1.15); }
        .hero-chrome-forge--assembling { opacity: 0.6;  transform: scale(0.95); }
        .hero-chrome-forge--done       { opacity: 0.28; transform: scale(0.82); }

        /* ── Energy rings ───────────────────────────────────── */
        .hero-chrome-rings {
          position: absolute;
          left: 50%; top: 50%;
          width: min(140%, 1100px);
          height: min(80%, 380px);
          transform: translate(-50%, -50%);
          pointer-events: none;
          overflow: visible;
          z-index: 1;
          filter: drop-shadow(0 0 12px rgba(200,220,255,0.35));
        }
        .hero-chrome-ring {
          transform-origin: 0 0;
          animation: chromeRingOrbit 3.6s cubic-bezier(0.16,1,0.3,1) both;
          opacity: 0;
        }
        .hero-chrome-rings--assembling .hero-chrome-ring {
          animation: chromeRingCollapse 1600ms cubic-bezier(0.6,0,0.2,1) forwards;
        }

        /* ── Wordmark ───────────────────────────────────────── */
        .hero-chrome {
          position: relative;
          z-index: 2;
          margin: 0;
          font-weight: 900;
          letter-spacing: 0.04em;
          line-height: 1;
          font-size: clamp(2.6rem, 8vw, 5.5rem);
          display: inline-flex;
          transform-style: preserve-3d;
          isolation: isolate;
        }
        @media (max-width: 767px) {
          .hero-chrome { font-size: clamp(2.2rem, 11vw, 4rem); }
        }
        .hero-chrome__space { display: inline-block; width: 0.35em; }
        .hero-chrome__letter {
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
          filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                  drop-shadow(0 8px 22px rgba(0,0,0,0.4));
          transform-style: preserve-3d;
          will-change: transform, opacity, filter;
          backface-visibility: hidden;
        }

        .hero-chrome__letter--scatter {
          opacity: 0.9;
          filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                  drop-shadow(0 8px 22px rgba(0,0,0,0.4))
                  drop-shadow(0 0 12px rgba(255,170,90,0.35))
                  blur(1.2px);
          transform: translate3d(var(--sx), var(--sy), var(--sz))
                     rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz));
          animation: chromeTumble 3.6s ease-in-out infinite;
          animation-delay: var(--tumble-delay);
        }

        .hero-chrome__letter--assembling {
          opacity: 1;
          filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                  drop-shadow(0 8px 22px rgba(0,0,0,0.4))
                  drop-shadow(0 0 18px rgba(255,180,110,0.5));
          transform: none;
          animation: chromeAssemble 1800ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .hero-chrome__letter--done {
          opacity: 1;
          transform: none;
          filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                  drop-shadow(0 8px 22px rgba(0,0,0,0.4));
        }

        /* ── Metallic light-sweep ───────────────────────────── */
        .hero-chrome::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 0%, transparent 40%,
            rgba(255,255,255,0.85) 50%,
            transparent 60%, transparent 100%
          );
          mix-blend-mode: screen;
          transform: translateX(-120%);
          opacity: 0;
        }
        .hero-chrome--sweep::after {
          animation: chromeSweep 6s ease-in-out 0.2s infinite;
        }

        /* ── Keyframes ──────────────────────────────────────── */
        @keyframes chromeAssemble {
          0% {
            opacity: 0.9;
            filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                    drop-shadow(0 8px 22px rgba(0,0,0,0.4))
                    drop-shadow(0 0 18px rgba(255,180,110,0.5))
                    blur(1.2px);
            transform: translate3d(var(--sx), var(--sy), var(--sz))
                       rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz));
          }
          70% {
            filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                    drop-shadow(0 8px 22px rgba(0,0,0,0.4))
                    drop-shadow(0 0 26px rgba(255,220,180,0.7))
                    blur(0.3px);
          }
          100% {
            opacity: 1;
            filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                    drop-shadow(0 8px 22px rgba(0,0,0,0.4));
            transform: none;
          }
        }

        @keyframes chromeTumble {
          0%   { transform: translate3d(var(--sx), var(--sy), var(--sz))
                            rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz)); }
          50%  { transform: translate3d(var(--sx), var(--sy), var(--sz))
                            rotateX(calc(var(--rx) + 10deg))
                            rotateY(calc(var(--ry) - 10deg))
                            rotateZ(calc(var(--rz) + 5deg)); }
          100% { transform: translate3d(var(--sx), var(--sy), var(--sz))
                            rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz)); }
        }

        @keyframes chromeSweep {
          0%   { transform: translateX(-120%); opacity: 0; }
          8%   { opacity: 1; }
          22%  { transform: translateX(120%); opacity: 0; }
          100% { transform: translateX(120%); opacity: 0; }
        }

        @keyframes chromeRingOrbit {
          0%   { opacity: 0; transform: rotate(0deg) rotateX(60deg) scale(2.2); }
          25%  { opacity: 0.9; }
          100% { opacity: 0.85; transform: rotate(360deg) rotateX(60deg) scale(1); }
        }
        @keyframes chromeRingCollapse {
          0%   { opacity: 0.85; transform: rotate(0deg) rotateX(60deg) scale(1); }
          100% { opacity: 0;    transform: rotate(180deg) rotateX(60deg) scale(0.15); }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-chrome__letter,
          .hero-chrome__letter--scatter,
          .hero-chrome__letter--assembling,
          .hero-chrome__letter--done {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
            filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                    drop-shadow(0 8px 22px rgba(0,0,0,0.4)) !important;
          }
          .hero-chrome-forge { opacity: 0.25 !important; transform: scale(0.8) !important; }
          .hero-chrome-ring  { animation: none !important; opacity: 0.5 !important; }
          .hero-chrome--sweep::after { animation: chromeSweep 6s ease-in-out 0.2s infinite; }
        }
      `}</style>
    </div>
  );
}

/* ─── helpers ───────────────────────────────────────────── */

async function playAudio(ref: React.MutableRefObject<HTMLAudioElement | null>) {
  const a = ref.current;
  if (!a) return;
  try {
    a.currentTime = 0;
    a.muted = false;
    a.volume = 0.9;
    await a.play();
  } catch { /* autoplay blocked — silent fail per spec */ }
}

function useReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return r;
}

function useIsMobile(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setM(window.innerWidth < 768);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return m;
}
