/**
 * HologramFace — ARIA's holographic portrait used as the dock face.
 * Uses the user-provided cyan hologram image. Glow + subtle scale react
 * to `state` (thinking/speaking) and live `amp` (TTS amplitude) for a
 * "talking" feel without needing 3D / video.
 */
import { cn } from "@/lib/utils";
import ariaHologram from "@/assets/aria-hologram.png.asset.json";
import type { DigitalHumanState } from "@/lib/digital-humans/registry";

interface Props {
  state: DigitalHumanState;
  amp?: number;
  size?: number;
  className?: string;
  ar?: boolean;
}

export function HologramFace({ state, amp = 0, size = 72, className, ar }: Props) {
  const speaking = state === "speaking";
  const thinking = state === "thinking";
  const intensity = Math.min(1, Math.max(0, amp));
  const glow = speaking ? 18 + intensity * 26 : thinking ? 14 : 8;
  const ringOpacity = speaking ? 0.55 + intensity * 0.35 : thinking ? 0.4 : 0.25;
  const scale = speaking ? 1 + intensity * 0.025 : 1;

  return (
    <div
      className={cn("relative shrink-0 rounded-full overflow-hidden", className)}
      style={{ width: size, height: size }}
      aria-label={ar ? "آريا" : "ARIA"}
    >
      {/* Outer ambient ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none transition-all duration-300"
        style={{
          boxShadow: `0 0 ${glow}px ${glow / 2}px rgba(0,212,255,${ringOpacity}), inset 0 0 ${glow / 1.5}px rgba(58,232,255,${ringOpacity * 0.7})`,
        }}
      />
      {/* Image */}
      <img
        src={ariaHologram.url}
        alt={ar ? "آريا — المساعد التنفيذي" : "ARIA — Executive AI"}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-150"
        style={{
          transform: `scale(${scale})`,
          filter: thinking
            ? "brightness(0.95) saturate(1.05) hue-rotate(-4deg)"
            : speaking
              ? `brightness(${1 + intensity * 0.15}) saturate(${1.1 + intensity * 0.2})`
              : "brightness(0.95)",
        }}
      />
      {/* Thinking shimmer */}
      {thinking && (
        <div className="absolute inset-0 rounded-full pointer-events-none animate-pulse"
          style={{ background: "radial-gradient(circle at 50% 35%, rgba(58,232,255,0.25), transparent 60%)" }}
        />
      )}
      {/* Speaking mouth-band — subtle horizontal pulse near jaw line driven by amp */}
      {speaking && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all"
          style={{
            bottom: `${size * 0.18}px`,
            width: `${size * (0.28 + intensity * 0.22)}px`,
            height: `${Math.max(2, size * 0.045 * (0.6 + intensity))}px`,
            background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.85), transparent)",
            boxShadow: `0 0 ${8 + intensity * 12}px rgba(0,212,255,0.7)`,
            opacity: 0.55 + intensity * 0.45,
          }}
        />
      )}
    </div>
  );
}
