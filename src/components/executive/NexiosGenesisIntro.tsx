import { useEffect, useMemo, useRef, useState } from "react";
import backdrop from "@/assets/hero-intro-backdrop.mp4.asset.json";
import assemblyAudio from "@/assets/hero-assembly-audio.mp3.asset.json";
import { useI18n } from "@/lib/i18n";

/**
 * NEXIOS AI cinematic pre-system intro.
 * — Fullscreen backdrop video (silent, autoplays) + gated soundtrack.
 * — Single "Enter" tap unlocks audio + triggers 3-phase letter assembly.
 * — Crossfades into the system homepage. Once per session.
 */

const SEEN_KEY = "nexios-genesis-seen";
const WORD = "NEXIOS AI";
const T_FADE = 600;
const T_MAX = 10_000; // hard cap after tap
const T_A = 1200;
const T_B = 800;
const T_C = 2000;
const T_TAIL = 2000;

type Scatter = { x: number; y: number; z: number; rx: number; ry: number; rz: number };

function makeScatter(mobile: boolean): Scatter {
  const rx = () => (Math.random() * 2 - 1);
  const xr = mobile ? 20 : 40;
  const yr = mobile ? 15 : 30;
  return {
    x: rx() * xr,
    y: rx() * yr,
    z: -600 + Math.random() * 900,
    rx: rx() * 180,
    ry: rx() * 180,
    rz: rx() * 90,
  };
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

export function NexiosGenesisIntro() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const reducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [started, setStarted] = useState(false); // tap happened
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const dismissedRef = useRef(false);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const letters = useMemo(() => WORD.split(""), []);
  const scatterRef = useRef<Scatter[]>(letters.map(() => makeScatter(isMobile)));

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) return;
    } catch { /* noop */ }
    setMounted(true);
  }, []);

  const dismiss = (instant = false) => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    try { window.sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* noop */ }
    const a = audioRef.current, v = videoRef.current;
    if (instant) {
      if (a) { try { a.pause(); a.src = ""; } catch { /* noop */ } }
      if (v) { try { v.pause(); v.removeAttribute("src"); v.load(); } catch { /* noop */ } }
    } else if (a) {
      // fade audio
      const start = a.volume || 0.9;
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / T_FADE);
        try { a.volume = start * (1 - k); } catch { /* noop */ }
        if (k < 1) requestAnimationFrame(step); else { try { a.pause(); } catch { /* noop */ } }
      };
      requestAnimationFrame(step);
    }
    setFading(true);
    window.setTimeout(() => {
      setGone(true);
      const v2 = videoRef.current; if (v2) { try { v2.pause(); v2.removeAttribute("src"); v2.load(); } catch { /* noop */ } }
    }, T_FADE);
  };

  // Start backdrop immediately on mount (muted autoplay allowed).
  useEffect(() => {
    if (!mounted) return;
    const v = videoRef.current;
    if (v) { try { void v.play(); } catch { /* noop */ } }
  }, [mounted]);

  // Skip chip after 1s of intro visible
  useEffect(() => {
    if (!mounted) return;
    const t = window.setTimeout(() => setShowSkip(true), 1000);
    timersRef.current.push(t);
    return () => window.clearTimeout(t);
  }, [mounted]);

  // Stop everything on unmount / navigation away
  useEffect(() => {
    return () => {
      const a = audioRef.current, v = videoRef.current;
      try { a?.pause(); } catch { /* noop */ }
      try { v?.pause(); } catch { /* noop */ }
      timersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const beginSequence = () => {
    if (started) return;
    setStarted(true);
    // authorize audio in same gesture
    const a = audioRef.current;
    if (a) {
      a.volume = 0.9;
      a.muted = false;
      try { void a.play(); } catch { /* noop */ }
    }
    setPhase(1);
    const t1 = window.setTimeout(() => setPhase(2), T_A);
    const t2 = window.setTimeout(() => setPhase(3), T_A + T_B);
    const t3 = window.setTimeout(() => dismiss(false), T_A + T_B + T_C + T_TAIL);
    const cap = window.setTimeout(() => dismiss(false), T_MAX);
    const onEnd = () => dismiss(false);
    a?.addEventListener("ended", onEnd, { once: true });
    timersRef.current.push(t1, t2, t3, cap);
  };

  if (!mounted || gone) return null;

  const backdropUrl = backdrop.url;
  const audioUrl = assemblyAudio.url;

  return (
    <div
      onPointerDown={beginSequence}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#07090D",
        opacity: fading ? 0 : 1,
        transition: `opacity ${T_FADE}ms ease`,
        overflow: "hidden",
        cursor: started ? "default" : "pointer",
      }}
      aria-hidden={fading}
    >
      {!reducedMotion && (
        <video
          ref={videoRef}
          src={backdropUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster=""
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(7,9,13,.55) 0%, rgba(7,9,13,.40) 40%, rgba(7,9,13,.75) 100%)",
          pointerEvents: "none",
        }}
      />

      <audio ref={audioRef} src={audioUrl} preload="auto" playsInline />

      {/* Enter button */}
      {!started && (
        <button
          type="button"
          onClick={beginSequence}
          className="nx-enter-btn"
          aria-label={ar ? "دخول" : "Enter"}
        >
          <span className="nx-enter-ring" />
          <span className="nx-enter-label">{ar ? "دخول" : "Enter"}</span>
        </button>
      )}

      {/* Letters */}
      {started && (
        <div className="nx-stage" aria-label={WORD}>
          <div className="nx-word">
            {letters.map((ch, i) => {
              const s = scatterRef.current[i];
              const isSpace = ch === " ";
              const style: React.CSSProperties = phase === 1
                ? {
                    transform: `translate3d(${s.x}vw, ${s.y}vh, ${s.z}px) rotateX(${s.rx}deg) rotateY(${s.ry}deg) rotateZ(${s.rz}deg)`,
                    opacity: 0.9,
                    filter: "blur(1px)",
                    transition: "none",
                  }
                : phase === 2
                ? {
                    transform: `translate3d(${s.x * 0.4}vw, ${s.y * 0.4}vh, ${s.z * 0.3}px) rotateX(${s.rx * 0.3}deg) rotateY(${s.ry * 0.3}deg) rotateZ(${s.rz * 0.3}deg)`,
                    opacity: 1,
                    filter: "blur(0.4px)",
                    transition: `transform ${T_B}ms ease-out, filter ${T_B}ms ease-out, opacity ${T_B}ms ease-out`,
                  }
                : {
                    transform: "translate3d(0,0,0) rotateX(0) rotateY(0) rotateZ(0)",
                    opacity: 1,
                    filter: "blur(0)",
                    transition: `transform ${T_C}ms cubic-bezier(0.16,1,0.3,1) ${i * 70}ms, filter ${T_C}ms ease-out ${i * 70}ms, opacity ${T_C}ms ease-out ${i * 70}ms`,
                  };
              return (
                <span
                  key={i}
                  className={`nx-letter${phase === 3 ? " nx-letter--settled" : ""}`}
                  style={{ ...style, width: isSpace ? "0.4em" : undefined }}
                >
                  {isSpace ? "\u00A0" : ch}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {showSkip && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); dismiss(true); }}
          className="nx-skip"
        >
          {ar ? "تخطي" : "Skip"}
        </button>
      )}

      <style>{`
        .nx-enter-btn {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          display: inline-flex; align-items: center; justify-content: center;
          width: 168px; height: 168px; border-radius: 999px;
          border: 1px solid rgba(16,185,129,0.55);
          background: radial-gradient(circle at 30% 25%, #e6eaf0 0%, #9ea4b0 45%, #2b3038 100%);
          color: #0b1220; font-weight: 800; letter-spacing: 0.12em;
          font-size: 22px; cursor: pointer;
          box-shadow:
            0 0 0 6px rgba(16,185,129,0.10),
            0 0 40px rgba(16,185,129,0.35),
            0 0 80px rgba(34,211,238,0.20),
            inset 0 2px 8px rgba(255,255,255,0.6),
            inset 0 -8px 22px rgba(0,0,0,0.45);
          animation: nxEnterFade 400ms ease-out both;
        }
        .nx-enter-btn:focus-visible { outline: 2px solid #34d399; outline-offset: 4px; }
        .nx-enter-ring {
          position: absolute; inset: -14px; border-radius: 999px;
          border: 2px solid rgba(16,185,129,0.75);
          animation: nxEnterPulse 1800ms ease-out infinite;
          pointer-events: none;
        }
        .nx-enter-label { position: relative; z-index: 1; }
        @keyframes nxEnterFade { from { opacity: 0; transform: translate(-50%, -46%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes nxEnterPulse {
          0% { transform: scale(1); opacity: 0.9; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }

        .nx-stage {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          perspective: 1200px;
        }
        .nx-word {
          display: inline-flex; align-items: baseline;
          transform-style: preserve-3d;
          font-weight: 900; letter-spacing: 0.06em; line-height: 1;
          font-size: clamp(2.6rem, 8vw, 5.8rem);
        }
        @media (max-width: 639px) {
          .nx-word { font-size: clamp(2rem, 11vw, 4rem); }
        }
        .nx-letter {
          display: inline-block;
          background: linear-gradient(175deg,#f8f9fb 0%,#c8ccd4 18%,#6e7480 38%,#2a2e36 50%,#9aa0ac 64%,#eef0f4 82%,#b8bcc6 100%);
          -webkit-background-clip: text; background-clip: text;
          color: transparent; -webkit-text-fill-color: transparent;
          text-shadow:
            0 0 14px rgba(16,185,129,0.55),
            0 0 28px rgba(34,211,238,0.35);
          will-change: transform, opacity, filter;
        }
        .nx-letter--settled {
          animation: nxSettleGlow 900ms ease-out;
        }
        @keyframes nxSettleGlow {
          0% { text-shadow: 0 0 30px rgba(16,185,129,0.95), 0 0 60px rgba(34,211,238,0.75); }
          100% { text-shadow: 0 0 14px rgba(16,185,129,0.55), 0 0 28px rgba(34,211,238,0.35); }
        }

        .nx-skip {
          position: absolute; bottom: 20px;
          ${ar ? "left" : "right"}: 20px;
          padding: 8px 14px; border-radius: 999px;
          background: rgba(15,20,28,0.6);
          border: 1px solid rgba(148,163,184,0.35);
          color: #e2e8f0; font-size: 12px; letter-spacing: 0.08em;
          cursor: pointer; backdrop-filter: blur(6px);
        }
        .nx-skip:hover { background: rgba(15,20,28,0.85); }

        @media (prefers-reduced-motion: reduce) {
          .nx-enter-ring { animation: none; }
          .nx-letter { transition: none !important; animation: none !important; transform: none !important; filter: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
