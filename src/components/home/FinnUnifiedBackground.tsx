/**
 * FinnUnifiedBackground — the single, canonical FINN backdrop.
 *
 * Used behind every FINN surface across the app so the visual identity
 * (dark radial gradient + softly-masked circuit board + digital grid +
 * code rain + scanline) stays identical on home, theater, situation room
 * and any other FINN card. If you tweak FINN's look, tweak it here.
 *
 * Pure decorative layer: `aria-hidden`, `pointer-events-none`, absolutely
 * positioned to fill its nearest positioned ancestor.
 */
export const FINN_BG_BASE = "#061525";
export const FINN_BG_CORE = "#0a2036";
export const FINN_BG_EDGE = "#030c17";

export function FinnUnifiedBackground() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{
          background: `radial-gradient(ellipse at 50% 45%, ${FINN_BG_CORE} 0%, ${FINN_BG_BASE} 45%, ${FINN_BG_EDGE} 100%)`,
        }}
      >
        {/* Circuit board — softened with a radial mask so traces dissolve into the dark backdrop */}
        <span
          className="absolute inset-0"
          style={{
            maskImage:
              "radial-gradient(ellipse at 50% 50%, black 35%, rgba(0,0,0,0.5) 70%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 50%, black 35%, rgba(0,0,0,0.5) 70%, transparent 100%)",
          }}
        >
          <svg
            className="absolute inset-0 h-full w-full opacity-70"
            viewBox="0 0 400 600"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="finnBgTrace" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(34,211,238,0.85)" />
                <stop offset="100%" stopColor="rgba(103,232,249,0.35)" />
              </linearGradient>
              <radialGradient id="finnBgNode" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(186,254,255,1)" />
                <stop offset="60%" stopColor="rgba(34,211,238,0.6)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0)" />
              </radialGradient>
              <filter id="finnBgGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g stroke="url(#finnBgTrace)" strokeWidth="0.9" fill="none" filter="url(#finnBgGlow)" opacity="0.85">
              <path d="M0,80 L60,80 L80,100 L80,180 L120,220" />
              <path d="M0,140 L40,140 L60,160 L60,260 L100,300 L100,360" />
              <path d="M0,220 L50,220 L70,240 L70,320 L30,360 L30,440" />
              <path d="M0,320 L80,320 L110,350 L110,420 L60,470 L60,560" />
              <path d="M0,420 L40,420 L60,440 L60,520 L110,560 L200,560" />
              <path d="M400,60 L340,60 L320,80 L320,160 L280,200 L280,280" />
              <path d="M400,140 L360,140 L340,160 L340,240 L300,280 L300,360" />
              <path d="M400,240 L340,240 L320,260 L320,340 L370,380 L370,460" />
              <path d="M400,340 L360,340 L340,360 L340,440 L300,480 L300,560" />
              <path d="M400,440 L350,440 L330,460 L330,540 L250,570" />
              <path d="M120,10 L120,60 L160,90 L240,90 L280,60 L280,10" />
              <path d="M120,590 L120,540 L170,500 L230,500 L280,540 L280,590" />
            </g>

            <g fill="rgba(2,15,28,0.9)" stroke="rgba(103,232,249,0.75)" strokeWidth="0.8">
              <rect x="14" y="60" width="30" height="18" rx="2" />
              <rect x="14" y="300" width="34" height="22" rx="2" />
              <rect x="356" y="120" width="30" height="18" rx="2" />
              <rect x="352" y="420" width="34" height="22" rx="2" />
              <rect x="170" y="4" width="60" height="14" rx="2" />
              <rect x="170" y="582" width="60" height="14" rx="2" />
            </g>
            <g stroke="rgba(103,232,249,0.6)" strokeWidth="0.6">
              <path d="M18,60 L18,54 M24,60 L24,54 M30,60 L30,54 M36,60 L36,54 M42,60 L42,54" />
              <path d="M18,78 L18,84 M24,78 L24,84 M30,78 L30,84 M36,78 L36,84 M42,78 L42,84" />
              <path d="M360,120 L360,114 M366,120 L366,114 M372,120 L372,114 M378,120 L378,114 M384,120 L384,114" />
              <path d="M360,138 L360,144 M366,138 L366,144 M372,138 L372,144 M378,138 L378,144 M384,138 L384,144" />
            </g>

            <g fill="url(#finnBgNode)">
              <circle cx="80" cy="100" r="3.2" />
              <circle cx="120" cy="220" r="3.2" />
              <circle cx="100" cy="360" r="3.2" />
              <circle cx="60" cy="470" r="3.2" />
              <circle cx="320" cy="80" r="3.2" />
              <circle cx="280" cy="280" r="3.2" />
              <circle cx="370" cy="460" r="3.2" />
              <circle cx="300" cy="480" r="3.2" />
              <circle cx="200" cy="90" r="3.2" />
              <circle cx="200" cy="500" r="3.2" />
            </g>

            <g fill="rgba(186,254,255,1)" filter="url(#finnBgGlow)">
              <circle r="1.8"><animateMotion dur="4.2s" repeatCount="indefinite" path="M0,80 L60,80 L80,100 L80,180 L120,220" /></circle>
              <circle r="1.8"><animateMotion dur="5.6s" repeatCount="indefinite" path="M0,140 L40,140 L60,160 L60,260 L100,300 L100,360" /></circle>
              <circle r="1.8"><animateMotion dur="6.4s" repeatCount="indefinite" path="M0,320 L80,320 L110,350 L110,420 L60,470 L60,560" /></circle>
              <circle r="1.8"><animateMotion dur="5.2s" repeatCount="indefinite" path="M400,60 L340,60 L320,80 L320,160 L280,200 L280,280" /></circle>
              <circle r="1.8"><animateMotion dur="6s" repeatCount="indefinite" path="M400,240 L340,240 L320,260 L320,340 L370,380 L370,460" /></circle>
              <circle r="1.8"><animateMotion dur="4.8s" repeatCount="indefinite" path="M400,340 L360,340 L340,360 L340,440 L300,480 L300,560" /></circle>
              <circle r="1.8"><animateMotion dur="7s" repeatCount="indefinite" path="M120,10 L120,60 L160,90 L240,90 L280,60 L280,10" /></circle>
            </g>
          </svg>

          {/* Fine digital grid */}
          <span
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(103,232,249,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,0.18) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 90%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 90%)",
            }}
          />

          {/* Binary / hex code rain */}
          <span
            className="absolute inset-0 opacity-25 font-mono text-[10px] leading-[12px] text-cyan-200"
            style={{
              maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            }}
          >
            <span className="absolute left-[6%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "9s" }}>
              {"01\n10\n11\n00\nA3\nF1\n7C\n0E\n01\n10\nB4\n2D\n01\n10\n11\n00\nA3\nF1\n7C\n0E"}
            </span>
            <span className="absolute left-[18%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "11s", animationDelay: "-2s" }}>
              {"F2\n0A\n1B\n7C\n01\n10\n55\nAE\n01\n00\n11\n10\nD4\n3F\n01\n10\n11\n00\nB8\n21"}
            </span>
            <span className="absolute right-[16%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "13s", animationDelay: "-4s" }}>
              {"9C\n01\n10\n11\n4E\nA1\n00\n11\n10\n01\n7B\n2E\n01\n10\nC3\n5F\n01\n10\n11\n00"}
            </span>
            <span className="absolute right-[6%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "10s", animationDelay: "-6s" }}>
              {"01\n11\n00\n10\nAB\n3C\n7E\n01\n10\nF0\n2D\n01\n11\n00\n10\n8B\n4C\n01\n10\n11"}
            </span>
          </span>
        </span>
      </span>

      <style>{`
        @keyframes finnBgRain { 0%{transform:translateY(-40%)} 100%{transform:translateY(110%)} }
        .finn-rain-col { animation-name: finnBgRain; animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) {
          .finn-rain-col { animation: none !important; }
        }
        [data-nx-frozen="true"] .finn-rain-col { animation-play-state: paused !important; }
      `}</style>
    </>
  );
}

export default FinnUnifiedBackground;
