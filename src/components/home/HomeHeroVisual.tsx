/**
 * HomeHeroVisual — فن الصفحة الرئيسية الحي
 *
 * تصوّر تفاعلي للمناطق الأربع بتدفّق بيانات حيّ، يعمل كعامل تصميم أساسي.
 * كل منطقة بلونها وحركتها الخاصة، متصلة بنقطة مركزية توقظ على التدفق الحيّ.
 */
import { useMemo } from "react";
import { REGIONS, REGION_ACCENT_HEX } from "@/lib/regions";

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function HomeHeroVisual() {
  const regionData = useMemo(() => {
    return REGIONS.map((r, i) => ({
      id: r.id,
      name: r.shortEn,
      color: REGION_ACCENT_HEX[r.id],
      rgb: hexToRgbTriplet(REGION_ACCENT_HEX[r.id]),
      angle: (i * 360) / 4,
      delay: i * 0.15,
    }));
  }, []);

  return (
    <div
      className="relative mx-auto w-full max-w-2xl aspect-square overflow-hidden rounded-3xl"
      aria-hidden
    >
      {/* خلفية شبكية دقيقة */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.03]" preserveAspectRatio="none">
        <defs>
          <pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      {/* الحلقات المركزية */}
      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="center-glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.4)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>

          {regionData.map((r) => (
            <radialGradient key={`grad-${r.id}`} id={`grad-${r.id}`} cx="50%" cy="50%">
              <stop offset="0%" stopColor={r.color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={r.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* الحلقات الخلفية الثابتة */}
        <circle
          cx="200"
          cy="200"
          r="180"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.1"
        />
        <circle
          cx="200"
          cy="200"
          r="120"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.1"
        />
        <circle
          cx="200"
          cy="200"
          r="60"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.1"
        />

        {/* المناطق الأربع مع التوهّج */}
        {regionData.map((region) => {
          const rad = (region.angle * Math.PI) / 180;
          const x = 200 + 130 * Math.cos(rad);
          const y = 200 + 130 * Math.sin(rad);

          return (
            <g key={region.id}>
              {/* توهّج المنطقة */}
              <circle
                cx={x}
                cy={y}
                r="50"
                fill={`url(#grad-${region.id})`}
                opacity="0.6"
                style={{
                  animation: `pulse-glow 3s ease-in-out infinite`,
                  animationDelay: `${region.delay}s`,
                  animationPlayState: "running",
                }}
              />

              {/* الحلقة الرئيسية */}
              <circle
                cx={x}
                cy={y}
                r="35"
                fill="none"
                stroke={region.color}
                strokeWidth="2"
                opacity="0.8"
                style={{
                  animation: `ring-pulse 2s ease-out infinite`,
                  animationDelay: `${region.delay}s`,
                  transformOrigin: `${x}px ${y}px`,
                }}
              />

              {/* النقطة المركزية للمنطقة */}
              <circle
                cx={x}
                cy={y}
                r="6"
                fill={region.color}
                style={{
                  animation: `dot-float 4s ease-in-out infinite`,
                  animationDelay: `${region.delay}s`,
                  transformOrigin: `${x}px ${y}px`,
                }}
              />

              {/* الخطوط المتصلة بالمركز */}
              <line
                x1="200"
                y1="200"
                x2={x}
                y2={y}
                stroke={region.color}
                strokeWidth="1"
                opacity="0.3"
                style={{
                  animation: `line-pulse 3s ease-in-out infinite`,
                  animationDelay: `${region.delay}s`,
                  strokeDasharray: "60",
                  strokeDashoffset: 0,
                }}
              />
            </g>
          );
        })}

        {/* المركز المتوهّج */}
        <circle cx="200" cy="200" r="40" fill="url(#center-glow)" />
        <circle
          cx="200"
          cy="200"
          r="8"
          fill="rgba(34,211,238,0.9)"
          style={{
            animation: `pulse 2s ease-in-out infinite`,
            transformOrigin: "200px 200px",
          }}
        />
      </svg>

      {/* أسماء المناطق حول الحواف */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {regionData.map((region) => {
          const rad = (region.angle * Math.PI) / 180;
          const x = 50 + 42 * Math.cos(rad);
          const y = 50 + 42 * Math.sin(rad);

          return (
            <div
              key={region.id}
              className="absolute text-center"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className="text-xs font-black tracking-wide uppercase opacity-70 transition-opacity duration-300"
                style={{
                  color: region.color,
                }}
              >
                {region.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* التدرجات الحية عند الزوايا */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-20 pointer-events-none">
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `radial-gradient(circle, ${regionData[1].color}44 0%, transparent 70%)`,
            filter: "blur(40px)",
          }}
        />
      </div>

      <div className="absolute bottom-0 left-0 w-80 h-80 opacity-20 pointer-events-none">
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `radial-gradient(circle, ${regionData[3].color}44 0%, transparent 70%)`,
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* الأنماط المتحركة الدقيقة */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; r: 50; }
          50% { opacity: 0.8; r: 65; }
        }

        @keyframes ring-pulse {
          0% { r: 35; stroke-width: 2; opacity: 1; }
          100% { r: 50; stroke-width: 1; opacity: 0; }
        }

        @keyframes dot-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes line-pulse {
          0%, 100% { stroke-dashoffset: 0; opacity: 0.3; }
          50% { stroke-dashoffset: -60; opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
