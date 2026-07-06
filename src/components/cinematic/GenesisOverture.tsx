import { useEffect, useRef, useState } from "react";
import sentinelUrl from "@/assets/genesis-sentinel.png";
import { setIntroActive } from "@/lib/intro-store";

/**
 * GenesisOverture — pre-system cinematic overture.
 *
 * 6-scene storyboard (≈8s total), played once per session:
 *   1. Void        (0.0 → 1.0s)   — obsidian + starfield
 *   2. Spark       (1.0 → 2.2s)   — cyan ignition burst
 *   3. Orbital     (2.2 → 4.0s)   — 3 rotating rings form an energy core
 *   4. Sentinel    (4.0 → 6.5s)   — chrome winged figure rises through smoke
 *   5. Crest       (6.5 → 7.5s)   — NEXIOS wordmark + tagline reveal
 *   6. Dissolve    (7.5 → 8.0s)   — soft flash to white, then fade out
 *
 * Skip: Esc / Space / Enter / click / dedicated Skip pill (visible after 1.5s).
 * Session gate: sessionStorage["nexios-genesis-played"].
 * Reduced motion: skipped entirely.
 */

const SESSION_KEY = "nexios-genesis-played";
const TOTAL_MS = 8000;
const SKIP_VISIBLE_AT = 1500;

type Phase = "hidden" | "playing" | "dissolving" | "done";

export function GenesisOverture() {
  const [phase, setPhase] = useState<Phase>("playing");
  const [scene, setScene] = useState(0); // 0..5
  const [showSkip, setShowSkip] = useState(false);
  const timers = useRef<number[]>([]);
  const starCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Boot decision — SSR-safe, avoids hydration mismatch.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reduced motion → skip entirely.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let alreadyPlayed = false;
    try {
      alreadyPlayed = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* private mode */
    }
    if (reduced || alreadyPlayed) {
      setPhase("done");
      setIntroActive(false);
      return;
    }

    setIntroActive(true);
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }

    // Scene timeline (ms offsets)
    const marks: Array<[number, number]> = [
      [0, 0],       // Void
      [1000, 1],    // Spark
      [2200, 2],    // Orbital
      [4000, 3],    // Sentinel
      [6500, 4],    // Crest
      [7500, 5],    // Dissolve
    ];
    marks.forEach(([t, s]) => {
      const id = window.setTimeout(() => setScene(s), t);
      timers.current.push(id);
    });
    timers.current.push(window.setTimeout(() => setShowSkip(true), SKIP_VISIBLE_AT));
    timers.current.push(window.setTimeout(() => setPhase("dissolving"), TOTAL_MS - 500));
    timers.current.push(
      window.setTimeout(() => {
        setPhase("done");
        setIntroActive(false);
      }, TOTAL_MS),
    );

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setIntroActive(false);
    };
  }, []);

  // Keyboard skip
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") skipNow();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Lightweight starfield (~60 dots, mounted only while playing)
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.6 + 0.2,
      s: Math.random() * 0.4 + 0.05,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const st of stars) {
        st.a += (Math.random() - 0.5) * 0.02;
        st.a = Math.max(0.15, Math.min(0.85, st.a));
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 230, 255, ${st.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [phase]);

  const skipNow = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("dissolving");
    window.setTimeout(() => setPhase("done"), 320);
  };

  if (phase === "hidden" || phase === "done") return null;

  return (
    <div
      role="presentation"
      aria-hidden={phase !== "playing"}
      onClick={skipNow}
      className="fixed inset-0 flex items-center justify-center overflow-hidden text-white"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#000208",
        opacity: phase === "dissolving" ? 0 : 1,
        transition: "opacity 320ms cubic-bezier(0.4,0,0.2,1)",
        cursor: "pointer",
      }}
    >
      {/* Starfield */}
      <canvas
        ref={starCanvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ opacity: scene >= 1 ? 0.35 : 0.9, transition: "opacity 800ms ease-out" }}
      />

      {/* Radial vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,2,8,0.65) 75%, #000208 100%)",
        }}
      />

      {/* Scene 2 — Spark ignition */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          opacity: scene === 1 ? 1 : scene >= 2 ? 0.35 : 0,
          transform: `translate(-50%,-50%) scale(${scene >= 1 ? 1 : 0.2})`,
          transition: "opacity 900ms ease-out, transform 1100ms cubic-bezier(0.22,1,0.36,1)",
          width: 520,
          height: 520,
          filter: "blur(0.5px)",
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(58,232,255,1) 0%, rgba(0,212,255,0.6) 12%, rgba(0,120,200,0.15) 40%, transparent 65%)",
            boxShadow: "0 0 120px rgba(0,212,255,0.6), 0 0 220px rgba(58,232,255,0.35)",
          }}
        />
        {/* Radial rays */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * 360;
            return (
              <line
                key={i}
                x1="100"
                y1="100"
                x2="100"
                y2="10"
                stroke="rgba(58,232,255,0.55)"
                strokeWidth="0.6"
                strokeLinecap="round"
                transform={`rotate(${angle} 100 100)`}
              />
            );
          })}
        </svg>
      </div>

      {/* Scene 3 — Orbital rings */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2"
        style={{
          opacity: scene === 2 ? 1 : scene >= 3 ? 0.25 : 0,
          transform: `translate(-50%,-50%) scale(${scene >= 2 ? 1 : 0.5})`,
          transition:
            "opacity 800ms ease-out, transform 1200ms cubic-bezier(0.22,1,0.36,1)",
          width: 560,
          height: 560,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ animation: "genesis-spin-a 6s linear infinite" }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(58,232,255,0.55)"
              strokeWidth="0.6"
              strokeDasharray="3 4"
            />
          </svg>
        </div>
        <div
          className="absolute inset-6"
          style={{ animation: "genesis-spin-b 9s linear infinite" }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <ellipse
              cx="100"
              cy="100"
              rx="90"
              ry="42"
              fill="none"
              stroke="rgba(0,212,255,0.6)"
              strokeWidth="0.7"
            />
          </svg>
        </div>
        <div
          className="absolute inset-14"
          style={{ animation: "genesis-spin-a 12s linear infinite reverse" }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <ellipse
              cx="100"
              cy="100"
              rx="42"
              ry="90"
              fill="none"
              stroke="rgba(120,220,255,0.5)"
              strokeWidth="0.7"
            />
          </svg>
        </div>
        {/* Core glow */}
        <div
          className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(58,232,255,0.9) 0%, rgba(0,120,200,0.3) 45%, transparent 70%)",
            filter: "blur(6px)",
            animation: "genesis-pulse 1.6s ease-in-out infinite",
          }}
        />
      </div>

      {/* Scene 4 — Sentinel reveal */}
      <div
        className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2"
        style={{
          opacity: scene >= 3 ? 1 : 0,
          transform: `translate(-50%, ${scene >= 3 ? "0" : "12%"})`,
          transition:
            "opacity 1400ms cubic-bezier(0.22,1,0.36,1), transform 1600ms cubic-bezier(0.22,1,0.36,1)",
          height: "88vh",
          maxHeight: "1100px",
          // Mask reveals figure from the bottom up
          WebkitMaskImage:
            scene >= 3
              ? "linear-gradient(to top, black 0%, black 90%, transparent 100%)"
              : "linear-gradient(to top, transparent 0%, transparent 100%)",
          maskImage:
            scene >= 3
              ? "linear-gradient(to top, black 0%, black 90%, transparent 100%)"
              : "linear-gradient(to top, transparent 0%, transparent 100%)",
          transitionProperty: "opacity, transform, -webkit-mask-image, mask-image",
        }}
      >
        <img
          src={sentinelUrl}
          alt=""
          aria-hidden
          width={1024}
          height={1536}
          className="h-full w-auto select-none"
          style={{
            filter: "drop-shadow(0 0 60px rgba(58,232,255,0.35))",
            animation: scene >= 3 ? "genesis-float 6s ease-in-out infinite" : "none",
          }}
          draggable={false}
        />
      </div>

      {/* Rising smoke under the sentinel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: "40vh",
          opacity: scene >= 3 ? 0.85 : 0,
          transition: "opacity 1200ms ease-out",
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(20,40,70,0.65) 0%, rgba(0,2,8,0) 70%)",
        }}
      />
      {/* Ember base */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          height: "18vh",
          opacity: scene >= 3 ? 0.18 : 0,
          transition: "opacity 1400ms ease-out",
          background:
            "radial-gradient(50% 100% at 50% 100%, rgba(183,136,96,0.6) 0%, transparent 75%)",
          mixBlendMode: "screen",
        }}
      />

      {/* Scene 5 — Crest */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center"
        style={{
          bottom: "12vh",
          opacity: scene >= 4 ? 1 : 0,
          transform: `translate(-50%, ${scene >= 4 ? "0" : "8px"})`,
          transition:
            "opacity 700ms cubic-bezier(0.22,1,0.36,1) 100ms, transform 700ms cubic-bezier(0.22,1,0.36,1) 100ms",
        }}
      >
        <div
          className="mx-auto mb-3 h-px w-28"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(58,232,255,0.9), transparent)",
            boxShadow: "0 0 12px rgba(58,232,255,0.6)",
          }}
        />
        <h1
          dir="ltr"
          className="select-none"
          style={{
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
            fontWeight: 900,
            fontSize: "clamp(2rem, 6vw, 4.2rem)",
            letterSpacing: "0.32em",
            lineHeight: 1,
            background:
              "linear-gradient(180deg, #FFFFFF 0%, #E4F5FF 45%, #7FBFDD 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent",
            textShadow: "0 0 40px rgba(58,232,255,0.35)",
          }}
        >
          NEXIOS
        </h1>
        <p
          dir="ltr"
          className="mt-3 text-[10px] font-semibold uppercase sm:text-xs"
          style={{
            fontFamily: '"Space Grotesk", ui-sans-serif, system-ui',
            letterSpacing: "0.42em",
            color: "rgba(180,220,240,0.7)",
          }}
        >
          Executive Intelligence · Genesis Protocol
        </p>
      </div>

      {/* Scene 6 — Flash to white */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-white"
        style={{
          opacity: scene >= 5 ? 0.9 : 0,
          transition: "opacity 260ms cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      {/* Skip pill */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          skipNow();
        }}
        className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70 backdrop-blur-sm transition hover:border-[#3AE8FF]/60 hover:text-white sm:right-6 sm:top-6"
        style={{
          opacity: showSkip && phase === "playing" ? 1 : 0,
          transition: "opacity 400ms ease-out",
          pointerEvents: showSkip && phase === "playing" ? "auto" : "none",
        }}
        aria-label="Skip intro"
      >
        Skip
      </button>

      <style>{`
        @keyframes genesis-spin-a { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @keyframes genesis-spin-b { from { transform: rotate(0deg);} to { transform: rotate(-360deg);} }
        @keyframes genesis-pulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 0.9; }
          50%      { transform: translate(-50%,-50%) scale(1.25); opacity: 1; }
        }
        @keyframes genesis-float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-14px); }
        }
      `}</style>
    </div>
  );
}

export default GenesisOverture;
