/**
 * AmbientParticles — pure-CSS ambient atmosphere for the Executive Theater.
 *
 * Renders a fixed, pointer-events-none layer of slowly drifting cyan
 * particles plus a subtle vignette glow. No canvas, no rAF, no JS work
 * after mount — animations are pure CSS transforms / opacity so GPU
 * handles them. Safe to mount on any dark backdrop.
 */
import { useMemo } from "react";

export function AmbientParticles({
  count = 36,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // Deterministic-ish pseudo-random spread so it doesn't reshuffle on rerender.
        const seed = (i + 1) * 9301 + 49297;
        const r1 = (seed % 233280) / 233280;
        const r2 = ((seed * 1103) % 233280) / 233280;
        const r3 = ((seed * 7919) % 233280) / 233280;
        const size = 1 + Math.round(r1 * 3); // 1–4 px
        const left = Math.round(r2 * 100);
        const top = Math.round(r3 * 100);
        const delay = -(r1 * 18).toFixed(2);
        const duration = (14 + r2 * 14).toFixed(2);
        const opacity = (0.18 + r3 * 0.55).toFixed(2);
        return { i, size, left, top, delay, duration, opacity };
      }),
    [count],
  );

  return (
    <div
      aria-hidden
      className={"pointer-events-none absolute inset-0 overflow-hidden " + (className ?? "")}
    >
      {/* Vignette + ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,212,255,0.10),transparent_55%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(58,232,255,0.06),transparent_60%)]" />

      {/* Sweeping horizon line (very subtle) */}
      <div className="absolute left-0 right-0 top-1/3 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent animate-mc-sweep" />

      {/* Drifting particles */}
      {particles.map((p) => (
        <span
          key={p.i}
          className="absolute rounded-full bg-cyan-300 animate-mc-drift will-change-transform"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: Number(p.opacity),
            boxShadow: "0 0 8px rgba(0,212,255,0.6)",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      {/* Local keyframes — scoped via global tag, single declaration. */}
      <style>{`
        @keyframes mc-drift {
          0%   { transform: translate3d(0,0,0) scale(1);   opacity: var(--mc-o, 0.4); }
          50%  { transform: translate3d(8px,-18px,0) scale(1.15); opacity: 0.85; }
          100% { transform: translate3d(-6px,-36px,0) scale(0.9); opacity: 0; }
        }
        .animate-mc-drift { animation: mc-drift linear infinite; }
        @keyframes mc-sweep {
          0%   { transform: translateX(-20%); opacity: 0; }
          50%  { opacity: 1; }
          100% { transform: translateX(20%);  opacity: 0; }
        }
        .animate-mc-sweep { animation: mc-sweep 9s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
