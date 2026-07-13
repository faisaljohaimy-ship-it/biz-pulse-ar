import { useId } from "react";

/**
 * AuroraFantasyBackdrop — a cinematic, "fantastical" ambient backdrop rendered
 * in pure CSS/SVG (no images, no JS animation loop, no build-memory cost). It
 * layers a deep-space nebula gradient, two slow-drifting aurora ribbons, a
 * parallax starfield, and a soft vignette — GPU-composited transforms only, so
 * it stays smooth on mobile. Fully decorative (aria-hidden), RTL-agnostic, and
 * it goes still under `prefers-reduced-motion` (constitution art. 5 + 13.5:
 * pure style, zero fabricated content).
 *
 * Usage: place as the first child of a `relative` container with content above
 * it at a higher z-index.
 */
export function AuroraFantasyBackdrop({
  className = "",
  intensity = 1,
}: {
  readonly className?: string;
  readonly intensity?: number;
}) {
  const id = useId().replace(/[:]/g, "");
  const a = `aur-${id}`;
  const o = Math.max(0, Math.min(1.4, intensity));

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Deep base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, #0a1836 0%, #050b1c 45%, #02040c 100%)",
        }}
      />

      {/* Nebula blobs */}
      <div
        className={`${a}-neb absolute -left-[15%] top-[-10%] h-[70vh] w-[70vh] rounded-full blur-[90px]`}
        style={{
          background: "radial-gradient(circle, rgba(58,232,255,0.35), transparent 62%)",
          opacity: 0.5 * o,
        }}
      />
      <div
        className={`${a}-neb2 absolute right-[-12%] top-[18%] h-[64vh] w-[64vh] rounded-full blur-[100px]`}
        style={{
          background: "radial-gradient(circle, rgba(120,86,255,0.32), transparent 62%)",
          opacity: 0.5 * o,
        }}
      />
      <div
        className={`${a}-neb3 absolute bottom-[-18%] left-[30%] h-[60vh] w-[60vh] rounded-full blur-[110px]`}
        style={{
          background: "radial-gradient(circle, rgba(0,255,180,0.22), transparent 60%)",
          opacity: 0.45 * o,
        }}
      />

      {/* Aurora ribbons */}
      <div
        className={`${a}-rib absolute left-[-20%] top-[22%] h-[42vh] w-[140%] blur-[46px]`}
        style={{
          background:
            "linear-gradient(100deg, transparent 8%, rgba(58,232,255,0.28) 34%, rgba(120,86,255,0.24) 58%, transparent 90%)",
          transform: "rotate(-8deg)",
          opacity: 0.55 * o,
        }}
      />
      <div
        className={`${a}-rib2 absolute left-[-20%] top-[46%] h-[38vh] w-[140%] blur-[52px]`}
        style={{
          background:
            "linear-gradient(80deg, transparent 10%, rgba(0,255,180,0.2) 40%, rgba(58,232,255,0.24) 66%, transparent 92%)",
          transform: "rotate(6deg)",
          opacity: 0.5 * o,
        }}
      />

      {/* Twinkling starfield (SVG, deterministic) */}
      <svg
        className={`${a}-stars absolute inset-0 h-full w-full`}
        preserveAspectRatio="xMidYMid slice"
      >
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill="#dff6ff"
            opacity={s.o * o}
            style={{ animation: `${a}-tw ${s.d}s ease-in-out ${s.delay}s infinite` }}
          />
        ))}
      </svg>

      {/* Cyan top edge + vignette */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3AE8FF]/50 to-transparent" />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(130% 100% at 50% 40%, transparent 55%, #02040c 100%)",
        }}
      />

      <style>{`
        @keyframes ${a}-drift { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(4%,3%,0)} }
        @keyframes ${a}-drift2 { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(-5%,2%,0)} }
        @keyframes ${a}-drift3 { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(3%,-4%,0)} }
        @keyframes ${a}-wave { 0%,100%{transform:rotate(-8deg) translateX(0)} 50%{transform:rotate(-5deg) translateX(4%)} }
        @keyframes ${a}-wave2 { 0%,100%{transform:rotate(6deg) translateX(0)} 50%{transform:rotate(9deg) translateX(-4%)} }
        @keyframes ${a}-tw { 0%,100%{opacity:.15} 50%{opacity:1} }
        .${a}-neb{animation:${a}-drift 22s ease-in-out infinite}
        .${a}-neb2{animation:${a}-drift2 26s ease-in-out infinite}
        .${a}-neb3{animation:${a}-drift3 30s ease-in-out infinite}
        .${a}-rib{animation:${a}-wave 18s ease-in-out infinite}
        .${a}-rib2{animation:${a}-wave2 21s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){
          .${a}-neb,.${a}-neb2,.${a}-neb3,.${a}-rib,.${a}-rib2{animation:none}
          .${a}-stars circle{animation:none !important}
        }
      `}</style>
    </div>
  );
}

// Deterministic star positions (no Math.random — stable across SSR/build).
const STARS: { x: number; y: number; r: number; o: number; d: number; delay: number }[] = [
  { x: 8, y: 14, r: 1.1, o: 0.9, d: 4, delay: 0 },
  { x: 22, y: 30, r: 0.8, o: 0.7, d: 5, delay: 1.2 },
  { x: 35, y: 10, r: 1.3, o: 0.85, d: 6, delay: 0.6 },
  { x: 48, y: 40, r: 0.7, o: 0.6, d: 4.5, delay: 2 },
  { x: 60, y: 18, r: 1, o: 0.8, d: 5.5, delay: 0.3 },
  { x: 72, y: 34, r: 0.9, o: 0.75, d: 4.2, delay: 1.8 },
  { x: 85, y: 12, r: 1.2, o: 0.9, d: 6.2, delay: 0.9 },
  { x: 92, y: 46, r: 0.7, o: 0.55, d: 5, delay: 2.4 },
  { x: 14, y: 56, r: 0.9, o: 0.7, d: 4.8, delay: 1.1 },
  { x: 30, y: 70, r: 1.1, o: 0.8, d: 5.8, delay: 0.4 },
  { x: 44, y: 62, r: 0.6, o: 0.5, d: 4.4, delay: 2.1 },
  { x: 58, y: 78, r: 1, o: 0.78, d: 6, delay: 0.7 },
  { x: 70, y: 66, r: 0.8, o: 0.65, d: 5.2, delay: 1.5 },
  { x: 82, y: 82, r: 1.2, o: 0.88, d: 4.6, delay: 0.2 },
  { x: 90, y: 70, r: 0.7, o: 0.55, d: 5.6, delay: 2.3 },
  { x: 6, y: 88, r: 1, o: 0.72, d: 4.9, delay: 1.3 },
  { x: 26, y: 92, r: 0.8, o: 0.6, d: 6.4, delay: 0.5 },
  { x: 52, y: 90, r: 0.9, o: 0.7, d: 5.1, delay: 1.9 },
];

export default AuroraFantasyBackdrop;
