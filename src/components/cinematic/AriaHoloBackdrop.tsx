import ariaHoloBg from "@/assets/aria-holo-bg.png.asset.json";

/**
 * AriaHoloBackdrop — full-presence holographic ARIA behind the hero.
 * Pure CSS/GPU animations: breathing, head sway, subtle hand float,
 * shoulder shimmer, procedural blink band. No layout impact.
 */
export function AriaHoloBackdrop({ opacity = 0.9 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      style={{ opacity }}
    >
      {/* soft cyan aura behind figure */}
      <div
        className="absolute left-1/2 top-[6%] h-[92%] w-[120%] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(0,212,255,0.28) 0%, rgba(58,232,255,0.10) 32%, transparent 62%)",
          filter: "blur(12px)",
          animation: "aria-bg-aura 6s ease-in-out infinite",
        }}
      />

      {/* main figure — full height, centered, breathing + micro sway */}
      <div
        className="absolute left-1/2 top-0 h-full -translate-x-1/2"
        style={{
          aspectRatio: "1024 / 1536",
          animation: "aria-bg-breathe 6.5s ease-in-out infinite",
          transformOrigin: "50% 60%",
          willChange: "transform",
        }}
      >
        {/* head layer — top ~42%, gentle yaw/pitch */}
        <div
          className="absolute inset-0"
          style={{
            animation: "aria-bg-head 8s ease-in-out infinite",
            transformOrigin: "50% 22%",
            willChange: "transform",
          }}
        >
          <img
            src={ariaHoloBg.url}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain object-top select-none"
            style={{
              filter:
                "drop-shadow(0 0 42px rgba(0,212,255,0.45)) drop-shadow(0 0 90px rgba(58,232,255,0.28)) brightness(1.02) contrast(1.02) saturate(1.08)",
              mixBlendMode: "screen",
            }}
          />
        </div>

        {/* hand region — bottom-right, extra float */}
        <div
          className="absolute inset-0"
          style={{
            animation: "aria-bg-hand 5.5s ease-in-out infinite",
            transformOrigin: "72% 62%",
            willChange: "transform",
            clipPath: "polygon(55% 45%, 100% 45%, 100% 85%, 55% 85%)",
          }}
        >
          <img
            src={ariaHoloBg.url}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain object-top select-none"
            style={{
              filter: "drop-shadow(0 0 24px rgba(58,232,255,0.55)) brightness(1.08) saturate(1.15)",
              mixBlendMode: "screen",
              opacity: 0.55,
            }}
          />
        </div>

        {/* procedural blink band across eyes (~top 32%) */}
        <div
          className="absolute left-[28%] right-[28%] top-[27%] h-[2.2%] rounded-full"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(6,26,46,0.9) 50%, transparent 100%)",
            animation: "aria-bg-blink 5.2s ease-in-out infinite",
            transformOrigin: "50% 50%",
          }}
        />

        {/* neural shimmer overlay */}
        <div
          className="absolute inset-0 mix-blend-screen"
          style={{
            background:
              "repeating-linear-gradient(115deg, transparent 0 10px, rgba(124,92,255,0.10) 10px 11px)",
            animation: "aria-bg-shimmer 3.4s linear infinite",
            opacity: 0.35,
          }}
        />
      </div>

      {/* bottom vignette so hero copy stays legible */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.92) 100%)",
        }}
      />
      {/* top vignette */}
      <div
        className="absolute inset-x-0 top-0 h-[18%]"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)",
        }}
      />

      <style>{`
        @keyframes aria-bg-breathe {
          0%,100% { transform: translate3d(0,0,0) scale(1); }
          50%     { transform: translate3d(0,-6px,0) scale(1.012); }
        }
        @keyframes aria-bg-head {
          0%,100% { transform: rotate(-1.2deg) translateX(-2px); }
          50%     { transform: rotate(1.4deg)  translateX(3px); }
        }
        @keyframes aria-bg-hand {
          0%,100% { transform: translate3d(0,0,0) rotate(-2deg); }
          50%     { transform: translate3d(4px,-6px,0) rotate(2.4deg); }
        }
        @keyframes aria-bg-blink {
          0%,92%,100% { transform: scaleY(0); opacity: 0; }
          94%,96%     { transform: scaleY(1); opacity: 1; }
        }
        @keyframes aria-bg-aura {
          0%,100% { opacity: .55 } 50% { opacity: .95 }
        }
        @keyframes aria-bg-shimmer {
          0% { background-position: 0 0 } 100% { background-position: 90px 0 }
        }
        @media (prefers-reduced-motion: reduce) {
          [aria-hidden] :where([style*="aria-bg-"]) { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default AriaHoloBackdrop;
