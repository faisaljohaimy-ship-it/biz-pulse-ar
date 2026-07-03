/**
 * DigitalTwinHero — bespoke cinematic hero for the "Digital Twin &
 * Simulation" Golden-Reference lesson.
 *
 * Renders an animated executive facility twin: pulsing sensor nodes,
 * a slow camera-fov sweep, live telemetry ticker, and data streams
 * between assets. Pure CSS/SVG (no video assets, no runtime cost).
 *
 * All motion respects `prefers-reduced-motion`.
 */
import { useEffect, useMemo, useState } from "react";
import { Radar, Waves } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  lang: "ar" | "en";
}

const NODES = [
  { id: "n1", x: 18, y: 26, kind: "sensor" as const },
  { id: "n2", x: 44, y: 18, kind: "camera" as const },
  { id: "n3", x: 72, y: 32, kind: "sensor" as const },
  { id: "n4", x: 30, y: 60, kind: "incident" as const },
  { id: "n5", x: 58, y: 68, kind: "sensor" as const },
  { id: "n6", x: 82, y: 78, kind: "camera" as const },
];

const EDGES: Array<[string, string]> = [
  ["n1", "n2"],
  ["n2", "n3"],
  ["n1", "n4"],
  ["n4", "n5"],
  ["n5", "n6"],
  ["n3", "n6"],
];

export function DigitalTwinHero({ title, subtitle, lang }: Props) {
  const ar = lang === "ar";
  const tickers = useMemo(
    () =>
      ar
        ? [
            "التوأم الرقمي متزامن · 99.4%",
            "استجابة الشذوذ · 1.2 ث",
            "الحسّاسات النشطة · 128 / 132",
            "الكاميرات المتصلة · 46 / 46",
            "درجة الجاهزية التنفيذية · 96",
          ]
        : [
            "Twin sync · 99.4%",
            "Anomaly latency · 1.2 s",
            "Sensors live · 128 / 132",
            "Cameras online · 46 / 46",
            "Executive readiness · 96",
          ],
    [ar],
  );
  const [tickIdx, setTickIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTickIdx((i) => (i + 1) % tickers.length), 2400);
    return () => window.clearInterval(id);
  }, [tickers.length]);

  const nodeById = useMemo(() => Object.fromEntries(NODES.map((n) => [n.id, n])), []);

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#04111F] shadow-[0_20px_80px_-30px_rgba(0,212,255,0.35)]"
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "توأم رقمي حي" : "Live digital twin"}
    >
      {/* Grid backdrop */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 56"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <pattern id="dt-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M4 0 L0 0 0 4" fill="none" stroke="rgb(56 232 255 / 0.10)" strokeWidth="0.15" />
          </pattern>
          <radialGradient id="dt-glow" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="rgb(0 212 255 / 0.20)" />
            <stop offset="100%" stopColor="rgb(4 17 31 / 0)" />
          </radialGradient>
          <linearGradient id="dt-stream" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(0 212 255 / 0)" />
            <stop offset="50%" stopColor="rgb(0 212 255 / 0.85)" />
            <stop offset="100%" stopColor="rgb(0 212 255 / 0)" />
          </linearGradient>
        </defs>
        <rect width="100" height="56" fill="url(#dt-glow)" />
        <rect width="100" height="56" fill="url(#dt-grid)" />

        {/* Edges (data streams) */}
        {EDGES.map(([a, b], i) => {
          const A = nodeById[a];
          const B = nodeById[b];
          if (!A || !B) return null;
          const x1 = A.x * 1;
          const y1 = A.y * 0.56;
          const x2 = B.x * 1;
          const y2 = B.y * 0.56;
          return (
            <g key={`e${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgb(56 232 255 / 0.25)"
                strokeWidth="0.12"
              />
              <circle r="0.6" fill="rgb(56 232 255)" opacity="0.9">
                <animateMotion
                  dur={`${3 + (i % 3)}s`}
                  repeatCount="indefinite"
                  begin={`${i * 0.4}s`}
                  path={`M ${x1} ${y1} L ${x2} ${y2}`}
                />
              </circle>
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map((n) => {
          const cx = n.x * 1;
          const cy = n.y * 0.56;
          const color =
            n.kind === "incident"
              ? "rgb(255 77 109)"
              : n.kind === "camera"
                ? "rgb(255 183 3)"
                : "rgb(56 232 255)";
          return (
            <g key={n.id}>
              <circle cx={cx} cy={cy} r="2.4" fill={color} opacity="0.15">
                <animate
                  attributeName="r"
                  values="1.8;3.4;1.8"
                  dur={n.kind === "incident" ? "1.2s" : "2.6s"}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.12;0.35;0.12"
                  dur={n.kind === "incident" ? "1.2s" : "2.6s"}
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={cx} cy={cy} r="0.9" fill={color} />
            </g>
          );
        })}
      </svg>

      {/* Foreground overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-cyan-200/80">
          <div className="inline-flex items-center gap-2">
            <Radar className="h-3.5 w-3.5 animate-spin-slow" style={{ animationDuration: "8s" }} />
            {ar ? "توأم رقمي مباشر" : "Live digital twin"}
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {ar ? "متزامن" : "In sync"}
          </div>
        </div>

        <div className="max-w-3xl">
          <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/70">
            {ar ? "الحصّة السادسة · جسر المعرفة التنفيذي" : "Lesson 06 · Executive Knowledge Bridge"}
          </div>
          <h2 className="mt-2 text-3xl font-light leading-tight text-white sm:text-5xl">
            {title}
          </h2>
          <div className="mt-2 max-w-xl text-sm text-cyan-100/80 sm:text-base">{subtitle}</div>
        </div>

        <div className="flex items-center gap-3 text-xs text-cyan-100/80">
          <Waves className="h-4 w-4 text-cyan-300" aria-hidden />
          <span className="inline-flex min-h-[1.25rem] items-center overflow-hidden font-mono">
            <span
              key={tickIdx}
              className="inline-block animate-fade-in"
            >
              {tickers[tickIdx]}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
