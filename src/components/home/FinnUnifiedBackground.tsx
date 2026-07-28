/**
 * FinnUnifiedBackground — the single, canonical FINN backdrop.
 *
 * Live "computers + digital wiring + complex automation" scene:
 * dark radial gradient, dense PCB with a central CPU and radiating buses,
 * peripheral chips with pin arrays and vias, animated data packets along
 * every bus, fine digital grid, binary/hex code rain, and automation
 * indicator LEDs pulsing on their own tempo.
 *
 * Pure decorative layer: `aria-hidden`, `pointer-events-none`, absolutely
 * positioned to fill its nearest positioned ancestor.
 */
export const FINN_BG_BASE = "#061525";
export const FINN_BG_CORE = "#0a2036";
export const FINN_BG_EDGE = "#030c17";

/** Bus paths — reused for both stroke rendering and packet motion. */
const BUS_PATHS: { d: string; dur: number; delay?: number }[] = [
  // Left side into CPU
  { d: "M0,80 L60,80 L90,110 L150,110 L170,130 L180,270", dur: 4.4 },
  { d: "M0,150 L50,150 L80,180 L140,180 L170,210 L180,290", dur: 5.2, delay: -1 },
  { d: "M0,240 L60,240 L100,280 L160,280 L180,300", dur: 6.0, delay: -2 },
  { d: "M0,360 L60,360 L100,330 L160,330 L180,320", dur: 5.6, delay: -3 },
  { d: "M0,450 L60,450 L100,420 L150,420 L180,360 L180,330", dur: 6.4, delay: -1.5 },
  { d: "M0,540 L80,540 L120,500 L170,470 L200,400 L200,360", dur: 7.2, delay: -2.5 },
  // Right side into CPU
  { d: "M400,60 L340,60 L310,90 L260,90 L240,120 L230,270", dur: 4.8, delay: -0.5 },
  { d: "M400,150 L340,150 L310,180 L260,180 L240,210 L230,290", dur: 5.4, delay: -2 },
  { d: "M400,250 L340,250 L300,280 L250,280 L230,300", dur: 6.2, delay: -3.5 },
  { d: "M400,360 L340,360 L300,330 L250,330 L230,320", dur: 5.8, delay: -1 },
  { d: "M400,450 L340,450 L300,420 L260,420 L230,360 L230,330", dur: 6.6, delay: -2 },
  { d: "M400,540 L320,540 L280,500 L240,470 L215,400 L215,360", dur: 7.4, delay: -3 },
  // Top / bottom rails through CPU header + footer
  { d: "M120,10 L120,60 L160,90 L240,90 L280,60 L280,10", dur: 6.8, delay: -1.2 },
  { d: "M120,590 L120,540 L170,500 L230,500 L280,540 L280,590", dur: 7.0, delay: -2.2 },
];

/** Peripheral chips: rect + pin group. */
const CHIPS: { x: number; y: number; w: number; h: number; pins: "h" | "v" }[] = [
  { x: 14, y: 60, w: 40, h: 22, pins: "h" },
  { x: 14, y: 220, w: 44, h: 26, pins: "h" },
  { x: 14, y: 420, w: 40, h: 22, pins: "h" },
  { x: 346, y: 100, w: 40, h: 22, pins: "h" },
  { x: 342, y: 240, w: 44, h: 26, pins: "h" },
  { x: 346, y: 440, w: 40, h: 22, pins: "h" },
  { x: 170, y: 4, w: 60, h: 14, pins: "v" },
  { x: 170, y: 582, w: 60, h: 14, pins: "v" },
];

function chipPins(c: (typeof CHIPS)[number]) {
  const lines: string[] = [];
  if (c.pins === "h") {
    // Pins on top + bottom of chip
    for (let i = 0; i < 5; i++) {
      const px = c.x + 6 + i * ((c.w - 12) / 4);
      lines.push(`M${px},${c.y} L${px},${c.y - 6}`);
      lines.push(`M${px},${c.y + c.h} L${px},${c.y + c.h + 6}`);
    }
  } else {
    // Pins on left + right of chip
    for (let i = 0; i < 5; i++) {
      const py = c.y + 3 + i * ((c.h - 6) / 4);
      lines.push(`M${c.x},${py} L${c.x - 6},${py}`);
      lines.push(`M${c.x + c.w},${py} L${c.x + c.w + 6},${py}`);
    }
  }
  return lines.join(" ");
}

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
              "radial-gradient(ellipse at 50% 50%, black 40%, rgba(0,0,0,0.55) 72%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 50%, black 40%, rgba(0,0,0,0.55) 72%, transparent 100%)",
          }}
        >
          <svg
            className="absolute inset-0 h-full w-full opacity-75"
            viewBox="0 0 400 600"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="finnBgTrace" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(34,211,238,0.9)" />
                <stop offset="100%" stopColor="rgba(103,232,249,0.35)" />
              </linearGradient>
              <radialGradient id="finnBgNode" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(186,254,255,1)" />
                <stop offset="60%" stopColor="rgba(34,211,238,0.6)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0)" />
              </radialGradient>
              <radialGradient id="finnBgCpu" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(9,32,56,1)" />
                <stop offset="100%" stopColor="rgba(2,12,24,1)" />
              </radialGradient>
              <filter id="finnBgGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Bus traces */}
            <g stroke="url(#finnBgTrace)" strokeWidth="0.9" fill="none" filter="url(#finnBgGlow)" opacity="0.85">
              {BUS_PATHS.map((p, i) => (
                <path key={i} d={p.d} />
              ))}
            </g>

            {/* Peripheral chips */}
            <g fill="rgba(2,15,28,0.92)" stroke="rgba(103,232,249,0.75)" strokeWidth="0.8">
              {CHIPS.map((c, i) => (
                <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} rx="2" />
              ))}
            </g>
            {/* Chip pins */}
            <g stroke="rgba(103,232,249,0.65)" strokeWidth="0.6">
              {CHIPS.map((c, i) => (
                <path key={i} d={chipPins(c)} />
              ))}
            </g>
            {/* Chip inner detail — dot arrays */}
            <g fill="rgba(103,232,249,0.35)">
              {CHIPS.map((c, i) => (
                <g key={i}>
                  <circle cx={c.x + 4} cy={c.y + 4} r="0.9" />
                  <circle cx={c.x + c.w - 4} cy={c.y + 4} r="0.9" />
                  <circle cx={c.x + 4} cy={c.y + c.h - 4} r="0.9" />
                  <circle cx={c.x + c.w - 4} cy={c.y + c.h - 4} r="0.9" />
                </g>
              ))}
            </g>

            {/* Central CPU */}
            <g>
              <rect
                x="160"
                y="260"
                width="80"
                height="80"
                rx="6"
                fill="url(#finnBgCpu)"
                stroke="rgba(103,232,249,0.9)"
                strokeWidth="1.1"
                filter="url(#finnBgGlow)"
              />
              {/* CPU die */}
              <rect
                x="180"
                y="280"
                width="40"
                height="40"
                rx="2"
                fill="rgba(6,26,46,1)"
                stroke="rgba(186,254,255,0.85)"
                strokeWidth="0.6"
              />
              {/* CPU inner circuitry */}
              <g stroke="rgba(103,232,249,0.55)" strokeWidth="0.4" fill="none">
                <path d="M185,285 H215 M185,290 H215 M185,295 H215 M185,300 H215 M185,305 H215 M185,310 H215 M185,315 H215" />
                <path d="M190,282 V318 M195,282 V318 M200,282 V318 M205,282 V318 M210,282 V318" />
              </g>
              {/* CPU label */}
              <text
                x="200"
                y="304"
                textAnchor="middle"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize="6"
                fill="rgba(186,254,255,0.9)"
              >
                FINN-CORE
              </text>
              {/* CPU pins (4 sides) */}
              <g stroke="rgba(103,232,249,0.7)" strokeWidth="0.6">
                {Array.from({ length: 10 }).map((_, i) => {
                  const t = 164 + i * ((80 - 8) / 9);
                  return (
                    <g key={i}>
                      <path d={`M${t},260 L${t},254`} />
                      <path d={`M${t},340 L${t},346`} />
                      <path d={`M160,${264 + i * ((80 - 8) / 9)} L154,${264 + i * ((80 - 8) / 9)}`} />
                      <path d={`M240,${264 + i * ((80 - 8) / 9)} L246,${264 + i * ((80 - 8) / 9)}`} />
                    </g>
                  );
                })}
              </g>
              {/* CPU heartbeat ring */}
              <circle
                cx="200"
                cy="300"
                r="46"
                fill="none"
                stroke="rgba(103,232,249,0.35)"
                strokeWidth="0.6"
                strokeDasharray="2 3"
              >
                <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.2s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Bus solder nodes */}
            <g fill="url(#finnBgNode)">
              <circle cx="90" cy="110" r="2.6" />
              <circle cx="140" cy="180" r="2.6" />
              <circle cx="100" cy="280" r="2.6" />
              <circle cx="100" cy="330" r="2.6" />
              <circle cx="150" cy="420" r="2.6" />
              <circle cx="310" cy="90" r="2.6" />
              <circle cx="260" cy="180" r="2.6" />
              <circle cx="300" cy="280" r="2.6" />
              <circle cx="300" cy="330" r="2.6" />
              <circle cx="260" cy="420" r="2.6" />
            </g>

            {/* Data packets — one per bus */}
            <g fill="rgba(186,254,255,1)" filter="url(#finnBgGlow)">
              {BUS_PATHS.map((p, i) => (
                <circle key={i} r="1.8">
                  <animateMotion
                    dur={`${p.dur}s`}
                    repeatCount="indefinite"
                    path={p.d}
                    begin={`${p.delay ?? 0}s`}
                  />
                </circle>
              ))}
            </g>

            {/* Automation status LEDs — pulse on independent tempos */}
            <g>
              {[
                { cx: 34, cy: 100, c: "rgba(74,222,128,1)", d: "1.6s" },
                { cx: 34, cy: 240, c: "rgba(103,232,249,1)", d: "2.2s" },
                { cx: 34, cy: 440, c: "rgba(250,204,21,1)", d: "1.9s" },
                { cx: 366, cy: 120, c: "rgba(74,222,128,1)", d: "1.4s" },
                { cx: 366, cy: 260, c: "rgba(103,232,249,1)", d: "2.6s" },
                { cx: 366, cy: 460, c: "rgba(248,113,113,1)", d: "1.7s" },
              ].map((led, i) => (
                <g key={i}>
                  <circle cx={led.cx} cy={led.cy} r="1.8" fill={led.c} opacity="0.9">
                    <animate attributeName="opacity" values="0.25;1;0.25" dur={led.d} repeatCount="indefinite" />
                  </circle>
                  <circle cx={led.cx} cy={led.cy} r="4" fill={led.c} opacity="0.15">
                    <animate attributeName="r" values="3;6;3" dur={led.d} repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.05;0.35;0.05" dur={led.d} repeatCount="indefinite" />
                  </circle>
                </g>
              ))}
            </g>

            {/* Vias — through-hole markers scattered on the board */}
            <g fill="none" stroke="rgba(103,232,249,0.4)" strokeWidth="0.5">
              {[
                [70, 60], [70, 200], [70, 380], [70, 520],
                [330, 60], [330, 200], [330, 380], [330, 520],
                [200, 40], [200, 560],
              ].map(([x, y], i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r="2.2" />
                  <circle cx={x} cy={y} r="0.7" fill="rgba(103,232,249,0.6)" />
                </g>
              ))}
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
            <span className="absolute left-[4%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "9s" }}>
              {"01\n10\n11\n00\nA3\nF1\n7C\n0E\n01\n10\nB4\n2D\n01\n10\n11\n00\nA3\nF1\n7C\n0E"}
            </span>
            <span className="absolute left-[16%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "11s", animationDelay: "-2s" }}>
              {"F2\n0A\n1B\n7C\n01\n10\n55\nAE\n01\n00\n11\n10\nD4\n3F\n01\n10\n11\n00\nB8\n21"}
            </span>
            <span className="absolute left-[30%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "12s", animationDelay: "-5s" }}>
              {"3A\n7F\n01\n11\n00\n10\nC2\n88\n01\n10\n11\n5E\n9F\n01\n00\n11\n10\nD1\n42\n0A"}
            </span>
            <span className="absolute right-[30%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "14s", animationDelay: "-1s" }}>
              {"01\n00\n11\n10\nB7\n2E\n5C\n01\n10\n11\n00\nF3\n88\n01\n10\n11\n7A\n2D\n01\nEE"}
            </span>
            <span className="absolute right-[16%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "13s", animationDelay: "-4s" }}>
              {"9C\n01\n10\n11\n4E\nA1\n00\n11\n10\n01\n7B\n2E\n01\n10\nC3\n5F\n01\n10\n11\n00"}
            </span>
            <span className="absolute right-[4%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "10s", animationDelay: "-6s" }}>
              {"01\n11\n00\n10\nAB\n3C\n7E\n01\n10\nF0\n2D\n01\n11\n00\n10\n8B\n4C\n01\n10\n11"}
            </span>
          </span>

          {/* Automation telemetry ticker — subtle top/bottom mono lines */}
          <span className="pointer-events-none absolute inset-x-0 top-2 flex justify-between px-3 font-mono text-[9px] text-cyan-300/40">
            <span>SYS://finn-core</span>
            <span>BUS 0x1A · 12.4 Gb/s</span>
            <span>AUTO-LOOP ✓</span>
          </span>
          <span className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-between px-3 font-mono text-[9px] text-cyan-300/40">
            <span>THREADS 128/128</span>
            <span>PIPE OK · Δ 0.4ms</span>
            <span>NODE 07 · SYNC</span>
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
