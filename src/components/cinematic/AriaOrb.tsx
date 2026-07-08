import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  state?: "idle" | "listening" | "speaking" | "thinking";
  className?: string;
};

/**
 * AriaOrb — cinematic film-style icon for ARIA.
 * Pure SVG + CSS, GPU-friendly, mobile-safe.
 * States animate halo, rings, and scanline.
 */
export function AriaOrb({ size = 48, state = "idle", className }: Props) {
  const speed =
    state === "speaking"
      ? "1.2s"
      : state === "listening"
        ? "1.8s"
        : state === "thinking"
          ? "2.4s"
          : "3.2s";

  const haloColor =
    state === "speaking"
      ? "rgba(245,180,84,0.55)"
      : state === "listening"
        ? "rgba(52,211,153,0.55)"
        : state === "thinking"
          ? "rgba(167,139,250,0.55)"
          : "rgba(56,189,248,0.45)";

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{
        width: size,
        height: size,
        ["--aria-speed" as any]: speed,
        ["--aria-halo" as any]: haloColor,
      }}
      aria-hidden
    >
      {/* outer breathing halo */}
      <span className="aria-orb-halo" />
      {/* rotating rings */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="ariaCore" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="1" />
            <stop offset="35%" stopColor="#7dd3fc" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#6366f1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="ariaGlow" cx="30%" cy="30%" r="40%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ariaRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f5b454" />
          </linearGradient>
        </defs>

        {/* core sphere */}
        <circle cx="50" cy="50" r="22" fill="url(#ariaCore)" />
        <circle cx="50" cy="50" r="22" fill="url(#ariaGlow)" />

        {/* equatorial scan ring */}
        <g className="aria-orb-scan" style={{ transformOrigin: "50px 50px" }}>
          <ellipse
            cx="50"
            cy="50"
            rx="30"
            ry="8"
            fill="none"
            stroke="url(#ariaRing)"
            strokeWidth="0.8"
            opacity="0.85"
          />
        </g>

        {/* rotating outer ring */}
        <g className="aria-orb-ring-a" style={{ transformOrigin: "50px 50px" }}>
          <circle
            cx="50"
            cy="50"
            r="34"
            fill="none"
            stroke="url(#ariaRing)"
            strokeWidth="0.6"
            strokeDasharray="2 4"
            opacity="0.7"
          />
        </g>
        <g className="aria-orb-ring-b" style={{ transformOrigin: "50px 50px" }}>
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="0.4"
            strokeDasharray="1 6"
            opacity="0.5"
          />
        </g>

        {/* tick marks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x1 = 50 + Math.cos(a) * 44;
          const y1 = 50 + Math.sin(a) * 44;
          const x2 = 50 + Math.cos(a) * 47;
          const y2 = 50 + Math.sin(a) * 47;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#67e8f9"
              strokeWidth="0.6"
              opacity="0.55"
            />
          );
        })}

        {/* specular highlight */}
        <circle cx="42" cy="40" r="5" fill="#ffffff" opacity="0.5" />
      </svg>
    </div>
  );
}

export default AriaOrb;
