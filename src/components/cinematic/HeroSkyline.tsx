import { useEffect, useState } from "react";

/**
 * Cinematic Riyadh skyline + executive holograms.
 * - SVG silhouette with iconic landmarks (Kingdom Centre arch, Al Faisaliah pyramid, PIF tower).
 * - Volumetric light beams + twinkling city lights.
 * - Floating glass KPI holograms with live counters.
 * Identity-preserving: amber accents, dark navy base, no new colors.
 */
export function HeroSkyline({ isAr }: { isAr: boolean }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 2200);
    return () => clearInterval(i);
  }, []);

  // live, gently drifting KPI values
  const drift = (base: number, amp: number) =>
    (base + Math.sin(t * 0.9) * amp + Math.cos(t * 0.4) * amp * 0.5).toFixed(1);

  const kpis = [
    {
      label: isAr ? "إيرادات / ث" : "Revenue · sec",
      value: `$${drift(48.2, 1.4)}K`,
      sub: isAr ? "محرّك أريا" : "ARIA engine",
      tone: "text-emerald-300",
    },
    {
      label: isAr ? "قرارات تنفيذية" : "Exec Decisions",
      value: `${(1284 + (t % 7)).toLocaleString()}`,
      sub: isAr ? "آخر ٢٤س" : "last 24h",
      tone: "text-amber-300",
    },
    {
      label: isAr ? "مؤشر المخاطر" : "Risk Index",
      value: `${drift(2.4, 0.3)}`,
      sub: isAr ? "منخفض" : "low",
      tone: "text-cyan-300",
    },
    {
      label: isAr ? "ثقة النموذج" : "Model Confidence",
      value: `${drift(94.2, 0.8)}%`,
      sub: "ARIA v7",
      tone: "text-fuchsia-300",
    },
  ];

  return (
    <>
      {/* ============ VOLUMETRIC LIGHT BEAMS ============ */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[70%] overflow-hidden">
        {[18, 32, 50, 68, 84].map((x, i) => (
          <div
            key={i}
            className="absolute bottom-0 w-[140px] origin-bottom"
            style={{
              left: `${x}%`,
              height: "85%",
              background: `linear-gradient(to top, rgba(245,180,84,${0.18 - i * 0.02}) 0%, rgba(245,180,84,0.05) 35%, transparent 100%)`,
              filter: "blur(22px)",
              transform: `translateX(-50%) skewX(${(i - 2) * 1.4}deg)`,
              animation: `hero-beam ${7 + i}s ease-in-out ${i * 0.6}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* ============ RIYADH SKYLINE (SVG, sharp) ============ */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[42%]">
        {/* deep base haze */}
        <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-[#04060d] via-[#04060d]/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,rgba(245,180,84,0.18),transparent_70%)]" />

        <svg
          viewBox="0 0 1600 420"
          preserveAspectRatio="xMidYEnd slice"
          className="absolute inset-x-0 bottom-0 h-full w-full"
        >
          <defs>
            <linearGradient id="skyFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a1530" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#04060d" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="skyMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d1a3a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#03050c" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="skyNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#02030a" stopOpacity="1" />
              <stop offset="100%" stopColor="#000" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="kingdomGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(245,180,84,0.9)" />
              <stop offset="100%" stopColor="rgba(245,180,84,0)" />
            </linearGradient>
            <radialGradient id="windowGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,210,140,0.9)" />
              <stop offset="100%" stopColor="rgba(255,210,140,0)" />
            </radialGradient>
          </defs>

          {/* FAR LAYER — small distant buildings */}
          <g fill="url(#skyFar)" opacity="0.85">
            <path d="M0,420 L0,300 L40,300 L40,260 L90,260 L90,290 L140,290 L140,240 L190,240 L190,270 L240,270 L240,300 L300,300 L300,250 L360,250 L360,290 L420,290 L420,260 L480,260 L480,300 L540,300 L540,270 L620,270 L620,300 L700,300 L700,280 L780,280 L780,310 L860,310 L860,260 L940,260 L940,300 L1020,300 L1020,270 L1100,270 L1100,300 L1180,300 L1180,250 L1260,250 L1260,290 L1340,290 L1340,260 L1420,260 L1420,300 L1500,300 L1500,280 L1600,280 L1600,420 Z" />
          </g>
          {/* far-layer window dots */}
          <g fill="rgba(255,210,140,0.45)">
            {Array.from({ length: 60 }).map((_, i) => (
              <rect
                key={`fw-${i}`}
                x={20 + i * 26 + (i % 3) * 3}
                y={260 + ((i * 7) % 60)}
                width="1.4"
                height="1.4"
                opacity={0.3 + ((i * 13) % 7) / 10}
              >
                {i % 9 === 0 && (
                  <animate attributeName="opacity" values="0.2;0.9;0.2" dur={`${3 + (i % 5)}s`} repeatCount="indefinite" />
                )}
              </rect>
            ))}
          </g>

          {/* MID LAYER */}
          <g fill="url(#skyMid)">
            {/* Al Faisaliah-style pyramid tower */}
            <path d="M170,420 L170,230 L210,230 L210,180 L215,178 L215,150 L220,148 L220,110 L228,108 L228,148 L233,150 L233,178 L238,180 L238,230 L278,230 L278,420 Z" />
            {/* generic mid buildings */}
            <path d="M0,420 L0,260 L60,260 L60,220 L120,220 L120,250 L160,250 L160,260 L300,260 L300,230 L360,230 L360,260 L440,260 L440,200 L500,200 L500,260 L560,260 L560,240 L640,240 L640,260 L720,260 L720,210 L800,210 L800,260 L900,260 L900,230 L980,230 L980,260 L1080,260 L1080,200 L1160,200 L1160,260 L1240,260 L1240,230 L1340,230 L1340,260 L1440,260 L1440,210 L1520,210 L1520,260 L1600,260 L1600,420 Z" />
          </g>

          {/* mid-layer windows */}
          <g fill="url(#windowGlow)">
            {Array.from({ length: 90 }).map((_, i) => {
              const col = i % 9;
              const row = Math.floor(i / 9);
              const blockX = 60 + col * 170;
              const blockY = 230 + row * 18;
              return (
                <rect key={`mw-${i}`} x={blockX} y={blockY} width="2.5" height="2.5" opacity={0.4 + ((i * 7) % 5) / 10}>
                  {i % 6 === 0 && (
                    <animate attributeName="opacity" values="0.2;1;0.2" dur={`${2.5 + (i % 4)}s`} repeatCount="indefinite" />
                  )}
                </rect>
              );
            })}
          </g>

          {/* NEAR LAYER — hero landmarks */}
          {/* PIF / Burj Rafal-style tall slim tower */}
          <g fill="url(#skyNear)">
            <path d="M1080,420 L1080,90 L1095,80 L1110,72 L1115,68 L1118,62 L1120,55 L1122,62 L1125,68 L1130,72 L1145,80 L1160,90 L1160,420 Z" />
          </g>
          {/* PIF antenna */}
          <line x1="1120" y1="55" x2="1120" y2="30" stroke="rgba(245,180,84,0.7)" strokeWidth="1" />
          <circle cx="1120" cy="30" r="2.5" fill="#f5b454">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" repeatCount="indefinite" />
          </circle>

          {/* KINGDOM CENTRE — iconic arched opening */}
          <g fill="url(#skyNear)">
            <path d="M700,420
                     L700,150
                     L720,130
                     L760,120
                     L800,118
                     L840,120
                     L880,130
                     L900,150
                     L900,420
                     Z" />
          </g>
          {/* Kingdom Centre arched opening */}
          <path
            d="M745,420 L745,260 Q800,170 855,260 L855,420 Z"
            fill="#04060d"
          />
          {/* arch glow rim */}
          <path
            d="M745,260 Q800,170 855,260"
            fill="none"
            stroke="rgba(245,180,84,0.65)"
            strokeWidth="1.4"
          />
          <path
            d="M745,260 Q800,170 855,260"
            fill="none"
            stroke="rgba(245,180,84,0.25)"
            strokeWidth="6"
            filter="blur(3px)"
          />
          {/* Kingdom Centre crown lights */}
          {[755, 770, 785, 800, 815, 830, 845].map((x, i) => (
            <rect key={`kc-${i}`} x={x} y={148} width="2" height="6" fill="#f5b454" opacity="0.85">
              <animate attributeName="opacity" values="0.4;1;0.4" dur={`${1.6 + (i % 3) * 0.4}s`} repeatCount="indefinite" />
            </rect>
          ))}

          {/* Kingdom windows grid */}
          <g fill="url(#windowGlow)">
            {Array.from({ length: 40 }).map((_, i) => {
              const col = i % 5;
              const row = Math.floor(i / 5);
              return (
                <rect
                  key={`kw-${i}`}
                  x={720 + col * 14}
                  y={170 + row * 12}
                  width="3"
                  height="3"
                  opacity={0.55 + ((i * 11) % 4) / 10}
                >
                  {i % 5 === 0 && <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2 + (i % 3)}s`} repeatCount="indefinite" />}
                </rect>
              );
            })}
          </g>

          {/* near-layer foreground silhouette */}
          <g fill="url(#skyNear)">
            <path d="M0,420 L0,310 L80,310 L80,280 L150,280 L150,310 L260,310 L260,260 L330,260 L330,310 L420,310 L420,290 L520,290 L520,310 L640,310 L640,280 L700,280 L700,420 Z" />
            <path d="M900,420 L900,290 L960,290 L960,260 L1040,260 L1040,290 L1080,290 L1080,420 Z" />
            <path d="M1160,420 L1160,290 L1240,290 L1240,260 L1320,260 L1320,300 L1420,300 L1420,270 L1500,270 L1500,310 L1600,310 L1600,420 Z" />
          </g>

          {/* aircraft warning beacons */}
          <circle cx="225" cy="108" r="1.8" fill="#ff5a5a">
            <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="800" cy="118" r="2" fill="#ff5a5a">
            <animate attributeName="opacity" values="0;1;0" dur="2.4s" repeatCount="indefinite" />
          </circle>

          {/* ground glow strip */}
          <rect x="0" y="416" width="1600" height="4" fill="url(#kingdomGlow)" opacity="0.5" />
        </svg>
      </div>

      {/* ============ EXECUTIVE HOLOGRAM KPIs ============ */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[6] hidden -translate-y-1/2 px-8 lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* LEFT column */}
          <div className="flex flex-col gap-3">
            {kpis.slice(0, 2).map((k, i) => (
              <HoloKpi key={i} k={k} side="left" />
            ))}
          </div>
          {/* RIGHT column */}
          <div className="flex flex-col gap-3">
            {kpis.slice(2, 4).map((k, i) => (
              <HoloKpi key={i} k={k} side="right" />
            ))}
          </div>
        </div>
      </div>

      {/* ============ CINEMATIC VIGNETTE ============ */}
      <div className="pointer-events-none absolute inset-0 z-[7] bg-[radial-gradient(ellipse_at_50%_45%,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
      {/* anamorphic lens flare streak */}
      <div
        className="pointer-events-none absolute left-1/2 top-[58%] z-[7] h-[2px] w-[60%] -translate-x-1/2 opacity-50"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(180,210,255,0.55), rgba(245,180,84,0.65), rgba(180,210,255,0.55), transparent)",
          filter: "blur(2px)",
          animation: "hero-flare 9s ease-in-out infinite alternate",
        }}
      />

      <style>{`
        @keyframes hero-beam {
          0%   { opacity: 0.55; transform: translateX(-50%) skewX(0deg) scaleY(1); }
          100% { opacity: 0.95; transform: translateX(-50%) skewX(2deg) scaleY(1.05); }
        }
        @keyframes hero-flare {
          0%   { opacity: 0.25; transform: translate(-50%, 0) scaleX(0.9); }
          100% { opacity: 0.7;  transform: translate(-50%, 0) scaleX(1.05); }
        }
        @keyframes hero-holo-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-scan {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
}

function HoloKpi({
  k,
  side,
}: {
  k: { label: string; value: string; sub: string; tone: string };
  side: "left" | "right";
}) {
  return (
    <div
      className="group relative w-[220px] overflow-hidden rounded-xl border border-white/15 bg-white/[0.04] p-3 backdrop-blur-xl"
      style={{
        animation: "hero-holo-in 0.6s ease-out both",
        boxShadow:
          "0 20px 60px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 40px -10px rgba(245,180,84,0.25)",
      }}
    >
      {/* scan line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent"
        style={{ animation: "hero-scan 4s linear infinite" }}
      />
      {/* corner ticks */}
      <span className={`absolute top-1 h-2 w-2 border-amber-300/60 ${side === "left" ? "left-1 border-l border-t" : "right-1 border-r border-t"}`} />
      <span className={`absolute bottom-1 h-2 w-2 border-amber-300/60 ${side === "left" ? "left-1 border-l border-b" : "right-1 border-r border-b"}`} />

      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.28em] text-white/55">{k.label}</span>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      </div>
      <div className={`mt-1.5 text-2xl font-bold tabular-nums ${k.tone}`}>{k.value}</div>
      <div className="text-[10px] text-white/40">{k.sub}</div>
      <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="h-full w-2/3 bg-gradient-to-r from-amber-300/70 to-transparent" />
      </div>
    </div>
  );
}

export default HeroSkyline;
