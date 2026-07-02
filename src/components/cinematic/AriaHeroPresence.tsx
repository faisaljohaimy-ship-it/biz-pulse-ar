/**
 * AriaHeroPresence — cinematic ARIA hologram presence for the hero.
 *
 * Renders the canonical ARIA reference asset with living idle motion:
 *   - Breath scale + vertical drift (procedural, damped)
 *   - Subtle head/shoulder sway via layered translate
 *   - Cyan holographic rim glow that pulses in sync with breath
 *   - Floating particle field (pure CSS/keyframes, GPU-only transforms)
 *   - Scanline shimmer sweep across the silhouette
 *
 * Zero JS on the render path: all motion via CSS custom animations so it
 * survives SSR, reduced-motion, and mobile throttling. Respects
 * `prefers-reduced-motion` (motion pauses, glow remains). Pointer-events
 * disabled — hero UI on top stays fully interactive.
 */
import aria from "@/assets/aria-hero-presence.png.asset.json";

interface Props {
  /** Visual weight against the hero UI. 'ambient' = backdrop, 'stage' = present. */
  readonly intensity?: "ambient" | "stage";
  readonly className?: string;
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => i);

export function AriaHeroPresence({ intensity = "stage", className = "" }: Props) {
  const isAmbient = intensity === "ambient";

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 flex items-end justify-center overflow-hidden ${className}`}
    >
      {/* Volumetric cyan floor glow */}
      <div
        className="absolute bottom-0 left-1/2 h-[45%] w-[80%] -translate-x-1/2 rounded-[50%]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(58,232,255,0.35) 0%, rgba(0,212,255,0.15) 35%, rgba(6,26,46,0) 70%)",
          filter: "blur(24px)",
          animation: "ariaFloorPulse 6s ease-in-out infinite",
        }}
      />

      {/* Particle field — cyan motes rising through silhouette */}
      <div className="absolute inset-0">
        {PARTICLES.map((i) => {
          const left = (i * 37 + 13) % 100;
          const delay = (i * 0.53) % 6;
          const dur = 8 + ((i * 1.7) % 6);
          const size = 1 + (i % 3);
          return (
            <span
              key={i}
              className="absolute rounded-full bg-[#7EF9FF]"
              style={{
                left: `${left}%`,
                bottom: "-6%",
                width: `${size}px`,
                height: `${size}px`,
                opacity: 0,
                boxShadow: "0 0 6px rgba(126,249,255,0.9)",
                animation: `ariaRise ${dur}s linear ${delay}s infinite`,
              }}
            />
          );
        })}
      </div>

      {/* ARIA hologram — canonical presence with breath + sway */}
      <div
        className="relative flex h-full w-full items-end justify-center"
        style={{
          animation: "ariaBreath 5.2s ease-in-out infinite",
          transformOrigin: "50% 100%",
        }}
      >
        <div
          className="relative h-full w-full max-w-[520px]"
          style={{
            animation: "ariaSway 9s ease-in-out infinite",
          }}
        >
          {/* Rim glow behind figure */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 55% 65% at 50% 42%, rgba(0,212,255,0.28) 0%, rgba(58,232,255,0.12) 40%, rgba(6,26,46,0) 72%)",
              animation: "ariaGlow 5.2s ease-in-out infinite",
            }}
          />

          {/* The figure itself */}
          <img
            src={aria.url}
            alt=""
            draggable={false}
            className="relative h-full w-full select-none object-contain object-bottom"
            style={{
              opacity: isAmbient ? 0.35 : 0.82,
              filter:
                "drop-shadow(0 0 24px rgba(0,212,255,0.55)) drop-shadow(0 0 60px rgba(58,232,255,0.3))",
              mixBlendMode: "screen",
            }}
          />

          {/* Scanline sweep — subtle holographic band */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, transparent 45%, rgba(126,249,255,0.18) 50%, transparent 55%, transparent 100%)",
              backgroundSize: "100% 220%",
              mixBlendMode: "screen",
              animation: "ariaScan 7.5s linear infinite",
            }}
          />
        </div>
      </div>

      {/* Motion keyframes — inlined so the component is self-contained */}
      <style>{`
        @keyframes ariaBreath {
          0%, 100% { transform: scale(1) translateY(0); }
          50%      { transform: scale(1.015) translateY(-4px); }
        }
        @keyframes ariaSway {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          33%      { transform: translateX(-6px) rotate(-0.35deg); }
          66%      { transform: translateX(6px) rotate(0.35deg); }
        }
        @keyframes ariaGlow {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.04); }
        }
        @keyframes ariaFloorPulse {
          0%, 100% { opacity: 0.75; transform: translateX(-50%) scale(1); }
          50%      { opacity: 1;    transform: translateX(-50%) scale(1.06); }
        }
        @keyframes ariaScan {
          0%   { background-position: 0 -110%; opacity: 0; }
          15%  { opacity: 0.6; }
          85%  { opacity: 0.6; }
          100% { background-position: 0 110%; opacity: 0; }
        }
        @keyframes ariaRise {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          10%  { opacity: 0.9; }
          90%  { opacity: 0.7; }
          100% { transform: translateY(-120vh) translateX(12px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-aria-presence] * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
