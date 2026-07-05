import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Cinematic "Chrome Assembly" wordmark.
 * Pure CSS 3D + React. No Three.js / WebGL / new deps.
 *
 * Sequence (~3s, once on mount):
 *   0–1.2s   scattered chrome letters drift/tumble in space
 *   1.2–3s   each letter converges to its final slot (60ms center-out stagger)
 *   3s+      single metallic light-sweep fires, then onAssembled() -> subhead fade
 *
 * Sound: only on user gesture (see `playWithSound`).
 * Reduced motion: skips scatter, renders assembled wordmark with sweep only.
 */

const WORD = "NEXIOS AI";
const AUDIO_SRC = "/hero-assembly-audio.mp3";

type Scatter = {
  x: string;
  y: string;
  z: string;
  rx: number;
  ry: number;
  rz: number;
  tumble: number; // seconds phase offset for floating tumble
};

function makeScatter(count: number, mobile: boolean): Scatter[] {
  const xRange = mobile ? 20 : 40; // vw
  const yRange = mobile ? 15 : 30; // vh
  const zMin = -600;
  const zMax = 300;
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;
  return Array.from({ length: count }, () => ({
    x: `${rand(-xRange, xRange).toFixed(2)}vw`,
    y: `${rand(-yRange, yRange).toFixed(2)}vh`,
    z: `${rand(zMin, zMax).toFixed(0)}px`,
    rx: Math.round(rand(-120, 120)),
    ry: Math.round(rand(-120, 120)),
    rz: Math.round(rand(-120, 120)),
    tumble: rand(0, 2),
  }));
}

export interface HeroChromeWordmarkProps {
  /** Fires once the assembly + sweep completes (subhead/CTA fade-up hook). */
  onAssembled?: () => void;
  /** Externally trigger a replay WITH audio (must be from user gesture). */
  replayToken?: number;
}

export function HeroChromeWordmark({ onAssembled, replayToken }: HeroChromeWordmarkProps) {
  const letters = useMemo(() => WORD.split(""), []);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // Stable random scatter per mount (ref -> no re-scatter on re-render).
  const scatterRef = useRef<Scatter[] | null>(null);
  if (scatterRef.current === null) {
    scatterRef.current = makeScatter(letters.length, isMobile);
  }
  const scatter = scatterRef.current;

  const [phase, setPhase] = useState<"scatter" | "assembling" | "done">(
    reducedMotion ? "done" : "scatter",
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Kick assembly + completion timers.
  useEffect(() => {
    if (reducedMotion) {
      onAssembled?.();
      return;
    }
    const t1 = window.setTimeout(() => setPhase("assembling"), 1200);
    // Assembly ends ~1800ms after start of phase 2. Add 200ms breathing room for sweep.
    const t2 = window.setTimeout(() => {
      setPhase("done");
      onAssembled?.();
    }, 3000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onAssembled, reducedMotion]);

  // Replay-with-audio on external gesture (e.g., splash "Enter" or speaker chip).
  useEffect(() => {
    if (!replayToken) return;
    if (reducedMotion) {
      // Still allow the sound to play on gesture, but no visual re-scatter.
      void playAudio(audioRef);
      return;
    }
    // Re-scatter with a fresh random layout for the replay.
    scatterRef.current = makeScatter(letters.length, isMobile);
    setPhase("scatter");
    void playAudio(audioRef);
    const t1 = window.setTimeout(() => setPhase("assembling"), 1200);
    const t2 = window.setTimeout(() => {
      setPhase("done");
      onAssembled?.();
    }, 3000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [replayToken, isMobile, letters.length, onAssembled, reducedMotion]);

  // Cleanup audio on unmount.
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  // Center-out stagger order (indices sorted by distance from center).
  const staggerOrder = useMemo(() => {
    const center = (letters.length - 1) / 2;
    return letters
      .map((_, i) => ({ i, d: Math.abs(i - center) }))
      .sort((a, b) => a.d - b.d)
      .reduce<number[]>((acc, item, rank) => {
        acc[item.i] = rank;
        return acc;
      }, []);
  }, [letters]);

  const showSweep = phase === "done";

  return (
    <div
      ref={containerRef}
      className="hero-chrome-wrap"
      aria-label={WORD}
      role="img"
      style={{ perspective: "1200px" }}
    >
      <audio ref={audioRef} src={AUDIO_SRC} preload="none" playsInline />
      <h1 className={`hero-chrome ${showSweep ? "hero-chrome--sweep" : ""}`}>
        {letters.map((ch, i) => {
          const s = scatter[i];
          const isSpace = ch === " ";
          const styleVars: React.CSSProperties = {
            // CSS custom props consumed by the keyframes below.
            ["--sx" as never]: s.x,
            ["--sy" as never]: s.y,
            ["--sz" as never]: s.z,
            ["--rx" as never]: `${s.rx}deg`,
            ["--ry" as never]: `${s.ry}deg`,
            ["--rz" as never]: `${s.rz}deg`,
            ["--tumble-delay" as never]: `${s.tumble.toFixed(2)}s`,
            animationDelay: `${staggerOrder[i] * 60}ms`,
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
          /* Reserve final line-height from first paint -> zero layout shift. */
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          direction: ltr; /* wordmark is a Latin logo unit even in RTL */
          transform-style: preserve-3d;
        }
        .hero-chrome {
          position: relative;
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
            #f8f9fb 0%,
            #c8ccd4 18%,
            #6e7480 38%,
            #2a2e36 50%,
            #9aa0ac 64%,
            #eef0f4 82%,
            #b8bcc6 100%
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

        /* Phase 1: scattered + floating tumble. */
        .hero-chrome__letter--scatter {
          opacity: 0.85;
          filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                  drop-shadow(0 8px 22px rgba(0,0,0,0.4))
                  blur(1px);
          transform: translate3d(var(--sx), var(--sy), var(--sz))
                     rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz));
          animation: chromeTumble 3.4s ease-in-out infinite;
          animation-delay: var(--tumble-delay);
        }

        /* Phase 2: converge to final slot. */
        .hero-chrome__letter--assembling {
          opacity: 1;
          filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                  drop-shadow(0 8px 22px rgba(0,0,0,0.4));
          transform: none;
          animation: chromeAssemble 1800ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .hero-chrome__letter--done {
          opacity: 1;
          transform: none;
          filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                  drop-shadow(0 8px 22px rgba(0,0,0,0.4));
        }

        /* Light-sweep overlay across the assembled wordmark. */
        .hero-chrome::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 0%,
            transparent 40%,
            rgba(255,255,255,0.85) 50%,
            transparent 60%,
            transparent 100%
          );
          mix-blend-mode: screen;
          transform: translateX(-120%);
          opacity: 0;
        }
        .hero-chrome--sweep::after {
          animation: chromeSweep 6s ease-in-out 0.2s infinite;
        }

        @keyframes chromeAssemble {
          0% {
            opacity: 0.85;
            filter: drop-shadow(0 2px 1px rgba(0,0,0,0.55))
                    drop-shadow(0 8px 22px rgba(0,0,0,0.4)) blur(1px);
            transform: translate3d(var(--sx), var(--sy), var(--sz))
                       rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz));
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
                            rotateX(calc(var(--rx) + 8deg))
                            rotateY(calc(var(--ry) - 8deg))
                            rotateZ(calc(var(--rz) + 4deg)); }
          100% { transform: translate3d(var(--sx), var(--sy), var(--sz))
                            rotateX(var(--rx)) rotateY(var(--ry)) rotateZ(var(--rz)); }
        }

        @keyframes chromeSweep {
          0%   { transform: translateX(-120%); opacity: 0; }
          8%   { opacity: 1; }
          22%  { transform: translateX(120%); opacity: 0; }
          100% { transform: translateX(120%); opacity: 0; }
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
  } catch {
    // Autoplay blocked or asset missing — silent fail is required by spec.
  }
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
