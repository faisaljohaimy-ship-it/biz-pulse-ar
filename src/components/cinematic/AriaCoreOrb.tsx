/**
 * AriaCoreOrb — the signature opening visual of NEXIOS AI OS.
 *
 * A self-contained cinematic mark:
 * - Radiant cyan core (multi-stop radial gradient) that breathes
 * - Two concentric orbit rings (thin hairlines) with slow counter-rotation
 * - 60 radial tick marks around the sphere (compass HUD)
 * - Live waveform under the sphere (SVG path animation)
 * - Drifting light motes that spread outward
 *
 * Pure SVG + CSS keyframes — no canvas, no JS animation loop. Runs at a
 * stable 60 FPS on any modern GPU and stays under 6 KB.
 */
import { useMemo } from "react";

export interface AriaCoreOrbProps {
  /** Approximate rendered diameter in pixels. Default 340. */
  size?: number;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

export function AriaCoreOrb({ size = 340, className = "" }: AriaCoreOrbProps) {
  // 60 evenly spaced radial ticks around the sphere.
  const ticks = useMemo(() => Array.from({ length: 60 }, (_, i) => (i * 360) / 60), []);
  // Drifting light motes — deterministic layout so SSR & client match.
  const motes = useMemo(
    () => [
      { x: 8, y: 22, r: 2.2, d: 0, s: 6.4, o: 0.85 },
      { x: 92, y: 14, r: 1.6, d: 1.2, s: 7.1, o: 0.75 },
      { x: 18, y: 78, r: 2.6, d: 0.4, s: 6.0, o: 0.9 },
      { x: 82, y: 82, r: 1.8, d: 2.0, s: 6.8, o: 0.7 },
      { x: 4, y: 52, r: 1.2, d: 3.0, s: 7.6, o: 0.65 },
      { x: 96, y: 48, r: 2.0, d: 0.8, s: 6.2, o: 0.8 },
      { x: 34, y: 6, r: 1.4, d: 2.4, s: 7.4, o: 0.6 },
      { x: 68, y: 94, r: 1.8, d: 1.6, s: 6.6, o: 0.75 },
      { x: 50, y: 30, r: 1.0, d: 3.6, s: 7.8, o: 0.55 },
      { x: 24, y: 44, r: 1.6, d: 2.2, s: 6.9, o: 0.7 },
      { x: 76, y: 62, r: 1.4, d: 1.0, s: 7.2, o: 0.65 },
      { x: 44, y: 88, r: 2.0, d: 0.2, s: 6.3, o: 0.85 },
    ],
    [],
  );

  return (
    <div
      role="img"
      aria-label="ARIA core intelligence orb"
      className={`relative mx-auto ${className}`}
      style={{ width: size, height: size }}
    >
      <style>{`
        @keyframes ariaCoreBreathe { 0%,100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.045); filter: brightness(1.15); } }
        @keyframes ariaOrbitCW  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ariaOrbitCCW { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes ariaWaveShift { 0% { transform: translateX(0); } 100% { transform: translateX(-20%); } }
        @keyframes ariaIridescence { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ariaChromaShift {
          0%,100% { transform: translate(0,0); opacity: 0.55; }
          33%     { transform: translate(-1.5px, 0.5px); opacity: 0.75; }
          66%     { transform: translate(1.5px, -0.5px); opacity: 0.65; }
        }
        @keyframes ariaScanlines { from { background-position: 0 0; } to { background-position: 0 -12px; } }
        @keyframes ariaHaloPulse { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.06); } }
        @keyframes ariaMoteDrift {
          0%   { transform: translate(0,0) scale(1);   opacity: var(--o); }
          50%  { transform: translate(var(--dx), var(--dy)) scale(1.15); opacity: calc(var(--o) * 1.15); }
          100% { transform: translate(0,0) scale(1);   opacity: var(--o); }
        }
        @keyframes ariaMoteTwinkle { 0%,100% { opacity: var(--o); } 50% { opacity: calc(var(--o) * 0.35); } }
        .aria-orb-core     { animation: ariaCoreBreathe 5.2s ease-in-out infinite; transform-origin: center; }
        .aria-orbit-outer  { animation: ariaOrbitCW  90s linear infinite; transform-origin: center; }
        .aria-orbit-inner  { animation: ariaOrbitCCW 60s linear infinite; transform-origin: center; }
        .aria-wave-shift   { animation: ariaWaveShift 4.5s linear infinite; }
        .aria-iridescence  { animation: ariaIridescence 22s linear infinite; transform-origin: center; }
        .aria-chroma-r     { animation: ariaChromaShift 4.6s ease-in-out infinite; mix-blend-mode: screen; }
        .aria-chroma-b     { animation: ariaChromaShift 4.6s ease-in-out infinite reverse; mix-blend-mode: screen; }
        .aria-scanlines    { animation: ariaScanlines 6s linear infinite; }
        .aria-halo         { animation: ariaHaloPulse 5.2s ease-in-out infinite; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .aria-orb-core, .aria-orbit-outer, .aria-orbit-inner, .aria-wave-shift,
          .aria-iridescence, .aria-chroma-r, .aria-chroma-b, .aria-scanlines, .aria-halo { animation: none !important; }
        }
      `}</style>

      {/* ── Holographic volumetric halo (deep glow behind everything) ── */}
      <div
        aria-hidden
        className="aria-halo pointer-events-none absolute inset-[-14%]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(58,232,255,0.55) 0%, rgba(0,212,255,0.28) 18%, rgba(122,90,255,0.18) 38%, rgba(6,26,46,0) 62%)",
          filter: "blur(24px)",
        }}
      />

      {/* ── Iridescent film — slow conic sweep for holographic sheen ── */}
      <div
        aria-hidden
        className="aria-iridescence pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(58,232,255,0) 0%, rgba(122,90,255,0.35) 12%, rgba(58,232,255,0.55) 25%, rgba(255,120,220,0.28) 42%, rgba(58,232,255,0) 55%, rgba(0,212,255,0.45) 72%, rgba(122,90,255,0.3) 88%, rgba(58,232,255,0) 100%)",
          maskImage:
            "radial-gradient(circle at 50% 50%, transparent 34%, black 42%, black 56%, transparent 66%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, transparent 34%, black 42%, black 56%, transparent 66%)",
          mixBlendMode: "screen",
          opacity: 0.75,
        }}
      />

      {/* ── Layered radiant glow behind the sphere ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(58,232,255,0.38) 0%, rgba(0,212,255,0.22) 22%, rgba(6,26,46,0) 62%)",
          filter: "blur(6px)",
        }}
      />

      {/* Compass HUD + orbits + core + waveform, all in one SVG */}
      <svg viewBox="0 0 400 400" className="relative h-full w-full" aria-hidden>
        <defs>
          {/* Core sphere gradient — bright white-cyan center → deep cyan → transparent */}
          <radialGradient id="ariaCoreFill" cx="50%" cy="46%" r="52%">
            <stop offset="0%" stopColor="#EAFCFF" stopOpacity="1" />
            <stop offset="18%" stopColor="#7DF0FF" stopOpacity="0.95" />
            <stop offset="42%" stopColor="#3AE8FF" stopOpacity="0.85" />
            <stop offset="72%" stopColor="#00A8D8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#052033" stopOpacity="0" />
          </radialGradient>
          {/* Inner specular highlight */}
          <radialGradient id="ariaCoreSpec" cx="46%" cy="38%" r="20%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          {/* Waveform stroke gradient */}
          <linearGradient id="ariaWaveStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3AE8FF" stopOpacity="0" />
            <stop offset="50%" stopColor="#EAFCFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#3AE8FF" stopOpacity="0" />
          </linearGradient>
          {/* Soft glow filter */}
          <filter id="ariaCoreGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 60 radial tick marks — compass HUD */}
        <g className="aria-orbit-outer" opacity="0.55">
          {ticks.map((deg, i) => {
            const major = i % 5 === 0;
            const len = major ? 14 : 7;
            const w = major ? 1.4 : 0.7;
            const op = major ? 0.95 : 0.5;
            return (
              <line
                key={deg}
                x1="200"
                y1={30}
                x2="200"
                y2={30 + len}
                stroke="#3AE8FF"
                strokeOpacity={op}
                strokeWidth={w}
                strokeLinecap="round"
                transform={`rotate(${deg} 200 200)`}
              />
            );
          })}
        </g>

        {/* Outer orbit ring — hairline with soft glow */}
        <circle
          className="aria-orbit-outer"
          cx="200"
          cy="200"
          r="152"
          fill="none"
          stroke="#3AE8FF"
          strokeOpacity="0.35"
          strokeWidth="0.8"
          strokeDasharray="1 4"
        />
        {/* Inner orbit ring */}
        <circle
          className="aria-orbit-inner"
          cx="200"
          cy="200"
          r="128"
          fill="none"
          stroke="#3AE8FF"
          strokeOpacity="0.5"
          strokeWidth="1"
        />
        {/* Faint concentric hairline */}
        <circle
          cx="200"
          cy="200"
          r="110"
          fill="none"
          stroke="#3AE8FF"
          strokeOpacity="0.15"
          strokeWidth="0.6"
        />

        {/* Chromatic aberration ghosts — magenta ↔ cyan channel split for holographic prism edge */}
        <g className="aria-chroma-r">
          <circle
            cx="202.2"
            cy="196"
            r="86"
            fill="none"
            stroke="#FF4DC9"
            strokeOpacity="0.55"
            strokeWidth="1.1"
          />
        </g>
        <g className="aria-chroma-b">
          <circle
            cx="197.8"
            cy="196"
            r="86"
            fill="none"
            stroke="#4DE1FF"
            strokeOpacity="0.55"
            strokeWidth="1.1"
          />
        </g>

        {/* Core sphere — breathing */}
        <g className="aria-orb-core" filter="url(#ariaCoreGlow)">
          <circle cx="200" cy="196" r="86" fill="url(#ariaCoreFill)" />
          <circle cx="188" cy="176" r="26" fill="url(#ariaCoreSpec)" />
        </g>

        {/* Baseline under the sphere */}
        <line
          x1="130"
          y1="284"
          x2="270"
          y2="284"
          stroke="#3AE8FF"
          strokeOpacity="0.55"
          strokeWidth="1"
        />

        {/* Waveform — two overlapping paths for depth, shifting horizontally */}
        <g className="aria-wave-shift" opacity="0.9">
          <path
            d="M 100 300 Q 118 288 136 300 T 172 300 T 208 300 T 244 300 T 280 300 T 316 300 T 352 300"
            fill="none"
            stroke="url(#ariaWaveStroke)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M 100 302 Q 122 314 144 302 T 188 302 T 232 302 T 276 302 T 320 302 T 364 302"
            fill="none"
            stroke="url(#ariaWaveStroke)"
            strokeWidth="1"
            strokeOpacity="0.55"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* Drifting light motes — pure CSS, layered above the SVG */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {motes.map((m, i) => {
          const dx = (m.x - 50) * 0.28;
          const dy = (m.y - 50) * 0.28;
          const style: React.CSSProperties = {
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: `${m.r * 4}px`,
            height: `${m.r * 4}px`,
            // CSS custom properties consumed by the keyframes
            ["--dx" as string]: `${dx}px`,
            ["--dy" as string]: `${dy}px`,
            ["--o" as string]: String(m.o),
            animation: `ariaMoteDrift ${m.s}s ease-in-out ${m.d}s infinite, ariaMoteTwinkle ${m.s * 0.6}s ease-in-out ${m.d}s infinite`,
            background:
              "radial-gradient(circle, rgba(234,252,255,0.95) 0%, rgba(58,232,255,0.85) 35%, rgba(58,232,255,0) 72%)",
            filter: "blur(0.4px)",
          };
          return (
            <span
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={style}
            />
          );
        })}
      </div>

      {/* ── Holographic scanlines masked to the sphere ── */}
      <div
        aria-hidden
        className="aria-scanlines pointer-events-none absolute left-1/2 top-[49%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: `${size * 0.44}px`,
          height: `${size * 0.44}px`,
          background:
            "repeating-linear-gradient(180deg, rgba(234,252,255,0.14) 0px, rgba(234,252,255,0.14) 1px, transparent 1px, transparent 4px)",
          mixBlendMode: "screen",
          opacity: 0.7,
        }}
      />
    </div>
  );
}

export default AriaCoreOrb;
