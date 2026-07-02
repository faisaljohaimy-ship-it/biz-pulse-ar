/**
 * ARIA GENESIS — Executive Cinematic Boot
 *
 * A restrained 10-second opening designed for boardroom viewing:
 * quiet, luxurious, confident. Fewer moving parts, tighter typography,
 * a single focal light. Uses GPU-friendly transforms and a small
 * canvas particle field. Respects prefers-reduced-motion (short fade),
 * skips on repeat visits within a session, and can be dismissed with
 * the Skip button or Escape.
 *
 * Timeline (ms):
 *    0    silence, deep midnight background
 *  400    seed light appears and begins to breathe
 * 1800    concentric halo rings + soft particle field
 * 4200    two ambient orbit ellipses (very low speed)
 * 6600    Vision 2030 signature fades in
 * 8200    signature dissolves, ARIA identity reveals
 *10000    smooth cross-fade into the application
 */
import { useEffect, useRef, useState } from "react";

type Props = { onComplete: () => void };

const TOTAL_MS = 10_000;
const SESSION_KEY = "aria-genesis-played";

export function AriaGenesis({ onComplete }: Props) {
  const [stage, setStage] = useState(0);        // 0..5
  const [hiding, setHiding] = useState(false);
  const [mounted, setMounted] = useState(true);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setHiding(true);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    window.setTimeout(() => { setMounted(false); onComplete(); }, 700);
  };

  // Boot timeline
  useEffect(() => {
    if (typeof window === "undefined") return;

    let alreadyPlayed = false;
    try { alreadyPlayed = sessionStorage.getItem(SESSION_KEY) === "1"; } catch { /* ignore */ }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    if (alreadyPlayed) {
      // Very short brand flash on subsequent visits — never intrusive.
      setStage(5);
      const t = window.setTimeout(finish, 400);
      return () => window.clearTimeout(t);
    }
    if (reduced) {
      setStage(5);
      const t = window.setTimeout(finish, 1_200);
      return () => window.clearTimeout(t);
    }

    const timers: number[] = [];
    const at = (ms: number, s: number) =>
      timers.push(window.setTimeout(() => setStage(s), ms));
    at(  400, 1);   // seed
    at( 1800, 2);   // halo + particles
    at( 4200, 3);   // orbit rings
    at( 6600, 4);   // Vision 2030 mark
    at( 8200, 5);   // ARIA identity
    timers.push(window.setTimeout(finish, TOTAL_MS));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape to skip
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) return null;

  const s = stage;
  const showParticles = s >= 2 && !hiding;
  const showOrbits = s >= 3;
  const showVision = s === 4;
  const showAria = s >= 5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="NEXIOS system boot"
      className={[
        "fixed inset-0 z-[100] overflow-hidden",
        "transition-opacity duration-[700ms] ease-out",
        hiding ? "opacity-0 pointer-events-none" : "opacity-100",
      ].join(" ")}
      style={{
        contain: "strict",
        // Deep executive midnight — matches the platform palette.
        background:
          "radial-gradient(ellipse at 50% 50%, #0A2440 0%, #061A2E 45%, #030B17 100%)",
      }}
    >
      {/* Ambient particle field — quiet, low-count, no shadow blur */}
      {showParticles && <QuietParticles />}

      {/* Focal composition */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="relative"
          style={{
            width: "min(70vmin, 560px)",
            height: "min(70vmin, 560px)",
          }}
        >
          {/* Seed light — always present after stage 1 */}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: 10, height: 10,
              marginLeft: -5, marginTop: -5,
              background: "radial-gradient(circle, #EAFBFF 0%, #3AE8FF 55%, rgba(0,212,255,0) 75%)",
              boxShadow: "0 0 32px 6px rgba(58,232,255,0.55), 0 0 90px 18px rgba(0,212,255,0.35)",
              opacity: s >= 1 ? 1 : 0,
              transform: `scale(${s < 2 ? 1 : s < 5 ? 1.6 : 2.1})`,
              transition: "transform 1600ms cubic-bezier(0.22,0.68,0.16,1), opacity 700ms ease-out",
              animation: s >= 1 ? "aria-breath 4s ease-in-out infinite" : undefined,
              willChange: "transform, opacity",
            }}
          />

          {/* Concentric halo — a single slow ring rather than many */}
          <span
            aria-hidden
            className="absolute inset-0 m-auto rounded-full border"
            style={{
              width: "58%", height: "58%",
              inset: 0,
              margin: "auto",
              borderColor: "rgba(58,232,255,0.22)",
              opacity: s >= 2 && !hiding ? 1 : 0,
              transition: "opacity 1200ms ease-out",
              animation: s >= 2 ? "aria-halo 5.5s ease-in-out infinite" : undefined,
              willChange: "transform, opacity",
            }}
          />

          {/* Two calm orbit ellipses — stage 3+ */}
          <svg
            aria-hidden
            viewBox="0 0 400 400"
            className="absolute inset-0 h-full w-full"
            style={{
              opacity: showOrbits ? 1 : 0,
              transition: "opacity 1400ms ease-out",
            }}
          >
            <defs>
              <linearGradient id="aria-orbit" x1="0" x2="1">
                <stop offset="0%"   stopColor="#3AE8FF" stopOpacity="0" />
                <stop offset="50%"  stopColor="#3AE8FF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g style={{ transformOrigin: "200px 200px", animation: "aria-spin 60s linear infinite" }}>
              <ellipse cx="200" cy="200" rx="175" ry="60"
                fill="none" stroke="url(#aria-orbit)" strokeWidth="0.9" />
            </g>
            <g style={{ transformOrigin: "200px 200px", animation: "aria-spin-rev 80s linear infinite", transform: "rotate(45deg)" }}>
              <ellipse cx="200" cy="200" rx="175" ry="60"
                fill="none" stroke="rgba(58,232,255,0.32)" strokeWidth="0.7" />
            </g>
          </svg>

          {/* Vision 2030 signature — appears briefly, then dissolves */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center"
            style={{
              opacity: showVision ? 1 : 0,
              transform: `translateY(${showVision ? 0 : 4}px)`,
              transition: "opacity 900ms ease-in-out, transform 900ms ease-out",
            }}
          >
            <Vision2030Mark />
          </div>

          {/* ARIA identity — final stage */}
          <div
            className="pointer-events-none absolute inset-0 grid place-items-center"
            style={{
              opacity: showAria ? 1 : 0,
              transform: `translateY(${showAria ? 0 : 6}px)`,
              transition: "opacity 900ms ease-out 150ms, transform 900ms ease-out 150ms",
            }}
          >
            <div className="text-center">
              <div
                className="text-[10px] uppercase tracking-[0.55em] text-[#3AE8FF]/85"
                style={{ textShadow: "0 0 18px rgba(58,232,255,0.45)" }}
              >
                NEXIOS · AI OS
              </div>
              <div
                className="mt-3 font-semibold tracking-[0.32em] text-white"
                style={{
                  fontSize: "clamp(30px, 6vmin, 60px)",
                  textShadow: "0 0 26px rgba(58,232,255,0.5), 0 0 70px rgba(0,212,255,0.3)",
                }}
              >
                A R I A
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-[0.4em] text-white/55">
                Executive Intelligence · Ready
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fog — very subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(0,212,255,0.10), transparent 70%)",
          opacity: s >= 2 ? 1 : 0,
          transition: "opacity 1400ms ease-out",
        }}
      />

      {/* Skip — quiet, discoverable */}
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 right-6 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/60 backdrop-blur transition hover:border-[#3AE8FF]/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/70"
        style={{
          opacity: s >= 2 ? 1 : 0,
          transition: "opacity 800ms ease-out",
        }}
      >
        Skip
      </button>

      <style>{`
        @keyframes aria-breath {
          0%,100% { filter: brightness(1); }
          50%     { filter: brightness(1.28); }
        }
        @keyframes aria-halo {
          0%,100% { transform: scale(1);    opacity: 0.55; }
          50%     { transform: scale(1.08); opacity: 0.9;  }
        }
        @keyframes aria-spin     { to { transform: rotate(360deg); } }
        @keyframes aria-spin-rev { to { transform: rotate(-315deg); } }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"][aria-label="NEXIOS system boot"] * {
            animation: none !important;
            transition: opacity 400ms ease-out !important;
          }
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Quiet particle field — small count, no shadow blur, single rAF loop.      */
/* -------------------------------------------------------------------------- */

function QuietParticles() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let w = 0, h = 0, cx = 0, cy = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2; cy = h / 2;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const mobile = window.innerWidth < 640;
    const count = mobile ? 60 : 120;
    const parts = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = 80 + Math.random() * Math.min(w, h) * 0.5;
      return {
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
      };
    });

    let last = performance.now();
    // Pause when tab hidden
    let paused = document.hidden;
    const onVis = () => { paused = document.hidden; if (!paused) { last = performance.now(); loop(last); } };
    document.addEventListener("visibilitychange", onVis);

    const loop = (t: number) => {
      if (paused) { rafRef.current = null; return; }
      const dt = Math.min(50, t - last); last = t;
      ctx.clearRect(0, 0, w, h);

      // very soft center wash
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
      g.addColorStop(0, "rgba(58,232,255,0.035)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const pull = 0.00006;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const dx = cx - p.x, dy = cy - p.y;
        p.vx += dx * pull * dt;
        p.vy += dy * pull * dt;
        p.vx *= 0.99; p.vy *= 0.99;
        p.x  += p.vx; p.y += p.vy;

        p.phase += dt * 0.002;
        const a = 0.28 + 0.22 * Math.sin(p.phase);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,240,255,${a.toFixed(3)})`;
        ctx.fill();

        // respawn if consumed by the core
        if (dx * dx + dy * dy < 300) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.min(w, h) * (0.35 + Math.random() * 0.25);
          p.x = cx + Math.cos(ang) * rad;
          p.y = cy + Math.sin(ang) * rad;
          p.vx = (Math.random() - 0.5) * 0.15;
          p.vy = (Math.random() - 0.5) * 0.15;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 h-full w-full"
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Vision 2030 signature — typographic, subordinate to ARIA.                 */
/* -------------------------------------------------------------------------- */

function Vision2030Mark() {
  return (
    <div
      className="rounded-full border border-[#3AE8FF]/25 bg-black/40 px-6 py-3 text-center backdrop-blur-md"
      style={{ boxShadow: "0 0 30px rgba(0,212,255,0.18), inset 0 0 22px rgba(0,212,255,0.10)" }}
    >
      <div className="text-[9px] uppercase tracking-[0.5em] text-[#3AE8FF]/80">
        Kingdom of Saudi Arabia
      </div>
      <div
        className="mt-1 font-semibold tracking-[0.28em] text-white"
        style={{ fontSize: "clamp(16px, 2.8vmin, 26px)", textShadow: "0 0 18px rgba(58,232,255,0.45)" }}
      >
        VISION · 2030
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.4em] text-white/55">
        رؤية المملكة العربية السعودية
      </div>
    </div>
  );
}
