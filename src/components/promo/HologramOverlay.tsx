/**
 * HologramOverlay — cinematic executive holographic layer for /promo/impact.
 * Pure CSS, GPU-only, pointer-events-none. Composited above the ScenePlayer
 * to add: scanlines, chromatic ghost, corner HUD brackets, aurora halos,
 * rotating hex grid, and a soft depth vignette. No layout impact.
 */
export function HologramOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {/* aurora halos — emerald + cyan, breathing */}
      <div
        className="absolute -left-[20%] top-[10%] h-[70vmin] w-[70vmin] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.28) 0%, rgba(16,185,129,0.08) 40%, transparent 70%)",
          filter: "blur(40px)",
          animation: "holoHaloA 9s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-[15%] bottom-[8%] h-[65vmin] w-[65vmin] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(56,225,255,0.22) 0%, rgba(56,225,255,0.06) 45%, transparent 72%)",
          filter: "blur(46px)",
          animation: "holoHaloB 11s ease-in-out infinite",
        }}
      />

      {/* rotating hexagonal grid — very subtle */}
      <div
        className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "repeating-linear-gradient(60deg, rgba(56,225,255,0.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(-60deg, rgba(56,225,255,0.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(56,225,255,0.05) 0 1px, transparent 1px 40px)",
          animation: "holoGridSpin 80s linear infinite",
          opacity: 0.55,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* scanlines */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          background:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 3px)",
          opacity: 0.55,
        }}
      />

      {/* rolling scan bar */}
      <div
        className="absolute inset-x-0 h-[18vh]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(56,225,255,0.10) 45%, rgba(16,185,129,0.14) 55%, transparent 100%)",
          animation: "holoScan 7s linear infinite",
          mixBlendMode: "screen",
        }}
      />

      {/* corner HUD brackets */}
      <HudCorner className="left-4 top-4" rot={0} />
      <HudCorner className="right-4 top-4" rot={90} />
      <HudCorner className="right-4 bottom-4" rot={180} />
      <HudCorner className="left-4 bottom-4" rot={270} />

      {/* top-left telemetry */}
      <div
        className="absolute left-5 top-5 font-mono text-[10px] tracking-widest text-emerald-300/70"
        style={{ textShadow: "0 0 8px rgba(16,185,129,0.7)" }}
      >
        NEXUS · HOLO-FEED · 60.00s
      </div>
      {/* top-right pulse */}
      <div className="absolute right-5 top-5 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full bg-emerald-400"
          style={{
            animation: "holoPulse 1.4s ease-in-out infinite",
            boxShadow: "0 0 10px #10B981",
          }}
        />
        <span className="font-mono text-[10px] tracking-widest text-emerald-300/70">LIVE</span>
      </div>

      {/* chromatic aberration edge ghost */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(56,225,255,0.10) 85%, rgba(200,164,92,0.08) 100%)",
          mixBlendMode: "screen",
        }}
      />

      {/* soft depth vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(4,7,15,0.55) 100%)",
        }}
      />

      <style>{`
        @keyframes holoHaloA {
          0%,100% { transform: translate3d(0,0,0) scale(1); opacity: .75; }
          50%     { transform: translate3d(30px,-20px,0) scale(1.08); opacity: 1; }
        }
        @keyframes holoHaloB {
          0%,100% { transform: translate3d(0,0,0) scale(1); opacity: .6; }
          50%     { transform: translate3d(-25px,15px,0) scale(1.1); opacity: .95; }
        }
        @keyframes holoGridSpin {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes holoScan {
          0%   { top: -20vh; }
          100% { top: 110vh; }
        }
        @keyframes holoPulse {
          0%,100% { opacity: .4; transform: scale(.85); }
          50%     { opacity: 1;  transform: scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fixed[aria-hidden] * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

function HudCorner({ className = "", rot = 0 }: { className?: string; rot?: number }) {
  return (
    <svg
      className={`absolute h-10 w-10 ${className}`}
      viewBox="0 0 40 40"
      style={{
        transform: `rotate(${rot}deg)`,
        filter: "drop-shadow(0 0 6px rgba(56,225,255,0.6))",
      }}
    >
      <path
        d="M2 14 L2 2 L14 2"
        fill="none"
        stroke="#38E1FF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="2" cy="2" r="1.5" fill="#10B981" />
    </svg>
  );
}

export default HologramOverlay;
