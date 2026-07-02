/**
 * ARIA GENESIS — Cinematic System Boot
 *
 * A single 15-second opening sequence that replaces the previous hero surfaces.
 * Stages (approximate, ms):
 *   0000  Absolute darkness — one pulse of light in the center.
 *   2000  Breathing light, expanding energy rings, particle genesis.
 *   5000  Holographic AI grid forms — 3D light lines, magnetic rings, data streams.
 *   8000  ARIA neural core awakens — nested rings, sound-wave halos.
 *  11000  Saudi Vision 2030 signature fades in and dissolves gracefully.
 *  13000  ARIA fully present — HUD ignition, wordmark reveal.
 *  15000  Smooth cross-fade into the main interface.
 *
 * Fully GPU-friendly: canvas particles + SVG + transform/opacity only.
 * Respects prefers-reduced-motion (collapses to a graceful 1.6s fade).
 */
import { useEffect, useRef, useState } from "react";

type Props = { onComplete: () => void };

const TOTAL_MS = 15_000;

export function AriaGenesis({ onComplete }: Props) {
  const [stage, setStage] = useState(0); // 0..6
  const [hiding, setHiding] = useState(false);
  const [mounted, setMounted] = useState(true);
  const doneRef = useRef(false);
  const reducedRef = useRef(false);

  // Skip on repeat visits within the same session so it never feels intrusive.
  const skipRef = useRef<boolean>(false);
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem("aria-genesis-played") === "1") {
        skipRef.current = true;
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reducedRef.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setHiding(true);
      try { sessionStorage.setItem("aria-genesis-played", "1"); } catch {}
      // let CSS fade play
      window.setTimeout(() => { setMounted(false); onComplete(); }, 900);
    };

    if (skipRef.current) {
      // Very short flash so the app doesn't feel abrupt on revisit.
      setStage(6);
      const t = window.setTimeout(finish, 350);
      return () => window.clearTimeout(t);
    }

    if (reducedRef.current) {
      setStage(6);
      const t = window.setTimeout(finish, 1_400);
      return () => window.clearTimeout(t);
    }

    const timers: number[] = [];
    const at = (ms: number, s: number) => timers.push(window.setTimeout(() => setStage(s), ms));
    at(   0, 1);
    at(2000, 2);
    at(5000, 3);
    at(8000, 4);
    at(11000, 5);
    at(13000, 6);
    timers.push(window.setTimeout(finish, TOTAL_MS));
    return () => timers.forEach(window.clearTimeout);
  }, [onComplete]);

  // Allow the user to skip with Escape / click.
  useEffect(() => {
    if (!mounted) return;
    const skip = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setHiding(true);
      try { sessionStorage.setItem("aria-genesis-played", "1"); } catch {}
      window.setTimeout(() => { setMounted(false); onComplete(); }, 500);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, onComplete]);

  if (!mounted) return null;

  const s = stage;

  return (
    <div
      role="dialog"
      aria-label="ARIA system boot"
      className={[
        "fixed inset-0 z-[100] overflow-hidden bg-black",
        "transition-opacity duration-[900ms] ease-out",
        hiding ? "opacity-0 pointer-events-none" : "opacity-100",
      ].join(" ")}
      style={{ contain: "strict" }}
    >
      {/* Canvas particle field — starts at stage >= 2 */}
      <GenesisCanvas active={s >= 2 && !hiding} intensity={s} />

      {/* Ambient radial breath */}
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-[1400ms]"
        style={{
          opacity: s === 0 ? 0 : s < 3 ? 0.55 : s < 6 ? 0.85 : 1,
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.22) 0%, rgba(6,26,46,0.35) 35%, rgba(0,0,0,0.95) 72%)",
        }}
      />

      {/* Holographic grid — stage 3+ */}
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-[1600ms]"
        style={{
          opacity: s >= 3 && s < 6 ? 0.35 : s >= 6 ? 0.18 : 0,
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.18) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 78%)",
          transform: "perspective(900px) rotateX(58deg) translateZ(0)",
          transformOrigin: "50% 60%",
        }}
      />

      {/* Light rays — stage 3+ */}
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: s >= 3 && s < 6 ? 0.45 : s >= 6 ? 0.25 : 0,
          background:
            "conic-gradient(from 210deg at 50% 50%, transparent 0deg, rgba(58,232,255,0.18) 22deg, transparent 44deg, transparent 180deg, rgba(0,212,255,0.14) 210deg, transparent 240deg)",
          animation: "genesis-spin 22s linear infinite",
          filter: "blur(24px)",
        }}
      />

      {/* CORE — nested rings + pulse */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="relative"
          style={{
            width: "min(78vmin, 620px)",
            height: "min(78vmin, 620px)",
          }}
        >
          {/* seed pulse */}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 14, height: 14,
              background: "radial-gradient(circle, #E8FBFF 0%, #3AE8FF 45%, rgba(0,212,255,0) 70%)",
              boxShadow: "0 0 40px 10px rgba(58,232,255,0.85), 0 0 120px 20px rgba(0,212,255,0.55)",
              opacity: s >= 1 ? 1 : 0,
              transform: `translate(-50%,-50%) scale(${s === 1 ? 1 : s < 4 ? 2.2 : s < 6 ? 3.6 : 4.2})`,
              transition: "transform 1600ms cubic-bezier(0.22,0.68,0.16,1), opacity 900ms ease-out",
              animation: s >= 1 ? "genesis-breath 3.4s ease-in-out infinite" : undefined,
              willChange: "transform, opacity",
            }}
          />

          {/* expanding waves */}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
              style={{
                width: "60%", height: "60%",
                borderColor: "rgba(58,232,255,0.35)",
                opacity: s >= 2 && s < 6 ? 0.9 : 0,
                animation: s >= 2 ? `genesis-wave 3.6s ease-out ${i * 1.2}s infinite` : undefined,
                willChange: "transform, opacity",
              }}
            />
          ))}

          {/* orbit rings — stage 4+ */}
          <svg
            aria-hidden
            viewBox="0 0 400 400"
            className="absolute inset-0 h-full w-full transition-opacity duration-1000"
            style={{ opacity: s >= 4 ? 1 : 0 }}
          >
            <defs>
              <radialGradient id="gcore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#E8FBFF" stopOpacity="0.95" />
                <stop offset="30%" stopColor="#3AE8FF" stopOpacity="0.55" />
                <stop offset="70%" stopColor="#00D4FF" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="gring" x1="0" x2="1">
                <stop offset="0%" stopColor="#3AE8FF" stopOpacity="0" />
                <stop offset="50%" stopColor="#3AE8FF" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="200" cy="200" r="150" fill="url(#gcore)" />
            <g style={{ transformOrigin: "200px 200px", animation: "genesis-spin 24s linear infinite" }}>
              <circle cx="200" cy="200" r="150" fill="none" stroke="url(#gring)" strokeWidth="1.2" />
              <circle cx="200" cy="200" r="150" fill="none" stroke="rgba(0,212,255,0.35)" strokeWidth="0.6" strokeDasharray="2 8" />
            </g>
            <g style={{ transformOrigin: "200px 200px", animation: "genesis-spin-rev 34s linear infinite" }}>
              <ellipse cx="200" cy="200" rx="185" ry="60" fill="none" stroke="rgba(58,232,255,0.55)" strokeWidth="0.9" />
              <ellipse cx="200" cy="200" rx="185" ry="60" fill="none" stroke="rgba(0,212,255,0.25)" strokeWidth="0.5" strokeDasharray="1 6" />
            </g>
            <g style={{ transformOrigin: "200px 200px", animation: "genesis-spin 42s linear infinite", transform: "rotate(60deg)" }}>
              <ellipse cx="200" cy="200" rx="185" ry="60" fill="none" stroke="rgba(58,232,255,0.4)" strokeWidth="0.8" />
            </g>
            <g style={{ transformOrigin: "200px 200px", animation: "genesis-spin-rev 52s linear infinite", transform: "rotate(120deg)" }}>
              <ellipse cx="200" cy="200" rx="185" ry="60" fill="none" stroke="rgba(0,212,255,0.35)" strokeWidth="0.8" />
            </g>
          </svg>

          {/* Vision 2030 signature — stage 5 only, fades in and out */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center"
            style={{
              opacity: s === 5 ? 1 : 0,
              transition: "opacity 1200ms ease-in-out",
            }}
          >
            <Vision2030Mark />
          </div>

          {/* ARIA wordmark — stage 6 */}
          <div
            className="pointer-events-none absolute inset-0 grid place-items-center"
            style={{
              opacity: s >= 6 ? 1 : 0,
              transform: `translateY(${s >= 6 ? 0 : 8}px)`,
              transition: "opacity 900ms ease-out 200ms, transform 900ms ease-out 200ms",
            }}
          >
            <div className="text-center">
              <div
                className="text-[11px] uppercase tracking-[0.55em] text-[#3AE8FF]/80"
                style={{ textShadow: "0 0 24px rgba(58,232,255,0.6)" }}
              >
                NEXIOS · AI OS
              </div>
              <div
                className="mt-3 font-semibold tracking-[0.18em] text-white"
                style={{
                  fontSize: "clamp(28px, 6.4vmin, 64px)",
                  textShadow: "0 0 32px rgba(58,232,255,0.55), 0 0 80px rgba(0,212,255,0.35)",
                }}
              >
                A R I A
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-[0.4em] text-white/55">
                Executive Intelligence · Online
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* subtle atmospheric fog */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(60% 40% at 50% 100%, rgba(0,212,255,0.14), transparent 70%)",
          opacity: s >= 3 ? 1 : 0,
          transition: "opacity 1400ms ease-out",
        }}
      />

      {/* Skip affordance — appears after 4s */}
      <button
        type="button"
        onClick={() => {
          if (doneRef.current) return;
          doneRef.current = true;
          setHiding(true);
          try { sessionStorage.setItem("aria-genesis-played", "1"); } catch {}
          window.setTimeout(() => { setMounted(false); onComplete(); }, 500);
        }}
        className="absolute bottom-6 right-6 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/50 backdrop-blur transition hover:border-[#3AE8FF]/50 hover:text-white"
        style={{
          opacity: s >= 2 ? 1 : 0,
          transition: "opacity 800ms ease-out",
        }}
      >
        Skip
      </button>

      <style>{`
        @keyframes genesis-breath {
          0%,100% { filter: brightness(1); }
          50%     { filter: brightness(1.35); }
        }
        @keyframes genesis-wave {
          0%   { transform: translate(-50%,-50%) scale(0.15); opacity: 0.9; }
          80%  { opacity: 0.15; }
          100% { transform: translate(-50%,-50%) scale(2.6);  opacity: 0; }
        }
        @keyframes genesis-spin      { to { transform: rotate(360deg); } }
        @keyframes genesis-spin-rev  { to { transform: rotate(-360deg); } }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"][aria-label="ARIA system boot"] * { animation: none !important; transition: opacity 400ms ease-out !important; }
        }
      `}</style>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Canvas particle field — attraction to center, GPU-friendly.               */
/* -------------------------------------------------------------------------- */

function GenesisCanvas({ active, intensity }: { active: boolean; intensity: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !active) return;

    const dpr = Math.min(1.75, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

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

    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const count = isMobile ? 140 : 260;
    const particles = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * Math.min(w, h) * 0.55;
      return {
        x: cx + Math.cos(a) * r * (0.4 + Math.random()),
        y: cy + Math.sin(a) * r * (0.4 + Math.random()),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 0.5 + Math.random() * 1.6,
        life: Math.random(),
      };
    });

    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(50, t - last); last = t;
      ctx.clearRect(0, 0, w, h);

      // subtle center glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
      grd.addColorStop(0, "rgba(58,232,255,0.05)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      const pull = intensity >= 4 ? 0.00018 : 0.00008;
      const speed = intensity >= 4 ? 1.0 : 0.6;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = cx - p.x, dy = cy - p.y;
        const dist2 = dx * dx + dy * dy + 40;
        // attract
        p.vx += dx * pull * dt;
        p.vy += dy * pull * dt;
        // damping
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx * speed;
        p.y += p.vy * speed;

        p.life += dt * 0.0006;
        const a = 0.35 + 0.45 * Math.sin(p.life * 3);
        const glow = intensity >= 4 ? 1.4 : 1.0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * glow, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,240,255,${a.toFixed(3)})`;
        ctx.shadowColor = "rgba(58,232,255,0.9)";
        ctx.shadowBlur = 8 * glow;
        ctx.fill();

        // respawn when consumed by core
        if (dist2 < 60) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.min(w, h) * (0.35 + Math.random() * 0.3);
          p.x = cx + Math.cos(ang) * rad;
          p.y = cy + Math.sin(ang) * rad;
          p.vx = (Math.random() - 0.5) * 0.4;
          p.vy = (Math.random() - 0.5) * 0.4;
        }
      }
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [active, intensity]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 h-full w-full"
      style={{ opacity: active ? 1 : 0, transition: "opacity 900ms ease-out" }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Elegant typographic Vision 2030 signature (uses in-project styling only). */
/* -------------------------------------------------------------------------- */
function Vision2030Mark() {
  return (
    <div
      className="rounded-full border border-[#3AE8FF]/25 bg-black/40 px-6 py-4 text-center backdrop-blur-md"
      style={{ boxShadow: "0 0 40px rgba(0,212,255,0.25), inset 0 0 30px rgba(0,212,255,0.12)" }}
    >
      <div className="text-[9px] uppercase tracking-[0.5em] text-[#3AE8FF]/80">
        Kingdom of Saudi Arabia
      </div>
      <div
        className="mt-1 font-semibold tracking-[0.24em] text-white"
        style={{
          fontSize: "clamp(18px, 3.2vmin, 30px)",
          textShadow: "0 0 24px rgba(58,232,255,0.55)",
        }}
      >
        VISION · 2030
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.4em] text-white/55">
        رؤية المملكة العربية السعودية
      </div>
    </div>
  );
}
