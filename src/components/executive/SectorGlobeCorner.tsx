/**
 * SectorGlobeCorner — transparent, living 3D region controller.
 *
 * The controller is physically mounted at the workspace's top-left by
 * AppShell. It keeps the active region bound to the shared RegionContext,
 * colours every halo from the canonical regional palette, and offers both
 * direct region selection and one-tap cycling.
 */
import { Suspense, lazy, useEffect, useState, type CSSProperties } from "react";
import { ChevronDown, Globe2, Layers } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGION_ACCENT_HEX, REGION_ACCENT_RGB, type RegionId } from "@/lib/regions";
import { cn } from "@/lib/utils";
import { REGION_MARKERS } from "./region-markers";
import type SectorGlobeSceneT from "./SectorGlobeScene";

// Client-only: SSR keeps the transparent SVG fallback and excludes the heavy
// Three.js chunk. Capable clients lazy-load the real glass globe.
const SectorGlobeScene = lazy(
  (): Promise<{ default: typeof SectorGlobeSceneT }> =>
    import.meta.env.SSR
      ? Promise.resolve({ default: (() => null) as unknown as typeof SectorGlobeSceneT })
      : import("./SectorGlobeScene"),
);

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

/** Transparent holographic fallback with no Three.js cost. */
function StaticSectorGlobe({
  activeIndex,
  activeColor,
}: {
  readonly activeIndex: number;
  readonly activeColor: string;
}) {
  const dots = [
    { cx: 100, cy: 82 },
    { cx: 72, cy: 107 },
    { cx: 130, cy: 96 },
    { cx: 91, cy: 133 },
  ];

  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full overflow-visible"
      role="img"
      aria-label="كرة المناطق الشفافة"
    >
      <defs>
        <radialGradient id="nx-glass-sphere" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.14" />
          <stop offset="36%" stopColor={activeColor} stopOpacity="0.07" />
          <stop offset="78%" stopColor={activeColor} stopOpacity="0.025" />
          <stop offset="100%" stopColor="#020817" stopOpacity="0.12" />
        </radialGradient>
        <linearGradient id="nx-glass-rim" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="34%" stopColor={activeColor} stopOpacity="0.86" />
          <stop offset="72%" stopColor={activeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.35" />
        </linearGradient>
        <filter id="nx-glass-glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        cx="100"
        cy="100"
        r="82"
        fill="none"
        stroke={activeColor}
        strokeOpacity="0.14"
        strokeWidth="8"
        filter="url(#nx-glass-glow)"
      />
      <circle
        cx="100"
        cy="100"
        r="78"
        fill="url(#nx-glass-sphere)"
        stroke="url(#nx-glass-rim)"
        strokeWidth="1.1"
      />

      {/* Longitude and latitude glass lines create convincing depth. */}
      {[28, 52, 75].map((radius) => (
        <ellipse
          key={`longitude-${radius}`}
          cx="100"
          cy="100"
          rx={radius}
          ry="78"
          fill="none"
          stroke={activeColor}
          strokeOpacity="0.18"
          strokeWidth="0.65"
        />
      ))}
      {[36, 58].map((radius) => (
        <ellipse
          key={`latitude-${radius}`}
          cx="100"
          cy="100"
          rx="76"
          ry={radius}
          fill="none"
          stroke={activeColor}
          strokeOpacity="0.14"
          strokeWidth="0.65"
        />
      ))}
      <ellipse
        cx="100"
        cy="100"
        rx="94"
        ry="36"
        fill="none"
        stroke={activeColor}
        strokeDasharray="3 5"
        strokeOpacity="0.42"
        strokeWidth="0.8"
        transform="rotate(-24 100 100)"
      />

      {dots.map((a, index) =>
        dots
          .slice(index + 1)
          .map((b, connectionIndex) => (
            <line
              key={`${index}-${connectionIndex}`}
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
              stroke={activeColor}
              strokeOpacity="0.28"
              strokeWidth="0.7"
            />
          )),
      )}

      {dots.map((dot, index) => {
        const marker = REGION_MARKERS[index];
        const markerColor = REGION_ACCENT_HEX[marker.id];
        const active = index === activeIndex;
        return (
          <g key={marker.id}>
            {active && (
              <circle
                className="nx-hub-ping"
                cx={dot.cx}
                cy={dot.cy}
                r="10"
                fill="none"
                stroke={markerColor}
                strokeWidth="1.2"
              />
            )}
            <circle
              cx={dot.cx}
              cy={dot.cy}
              r={active ? 8.5 : 5.5}
              fill={markerColor}
              opacity={active ? 0.28 : 0.14}
              filter={active ? "url(#nx-glass-glow)" : undefined}
            />
            <circle cx={dot.cx} cy={dot.cy} r={active ? 3.6 : 2.5} fill={markerColor} />
          </g>
        );
      })}
    </svg>
  );
}

export function SectorGlobeCorner() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { regionId, region, setRegion, regions } = useRegion();
  const [mode, setMode] = useState<"static" | "scene">("static");
  const [animate, setAnimate] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    const small = window.matchMedia("(max-width: 640px)").matches;
    const weak = !hasWebGL() || (cores <= 4 && small);
    if (!weak) {
      setAnimate(!reduced);
      setMode("scene");
    }
  }, []);

  const activeIndex = Math.max(
    0,
    REGION_MARKERS.findIndex((marker) => marker.id === regionId),
  );
  const activeColor = REGION_ACCENT_HEX[regionId];

  const cycleRegion = () => {
    const index = regions.findIndex((item) => item.id === regionId);
    const next = regions[(index + 1) % regions.length];
    setRegion(next.id as RegionId);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={ar ? "إظهار محدد المناطق ثلاثي الأبعاد" : "Show 3D region selector"}
        className="nx-region-control nx-region-control-active group pointer-events-auto relative grid size-14 place-items-center rounded-full border bg-[#020817]/35 backdrop-blur-xl transition duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 active:scale-95"
        style={
          {
            "--region-control-rgb": REGION_ACCENT_RGB[regionId],
          } as CSSProperties
        }
      >
        <span
          aria-hidden
          className="nx-holo-globe-pulse pointer-events-none absolute inset-1 rounded-full border"
          style={{ borderColor: `${activeColor}55` }}
        />
        <span className="relative size-12 transition-transform duration-500 group-hover:rotate-6">
          <StaticSectorGlobe activeIndex={activeIndex} activeColor={activeColor} />
        </span>
        <span
          aria-hidden
          className="absolute bottom-0.5 right-0.5 size-2 rounded-full border border-[#020817]"
          style={{ backgroundColor: activeColor, boxShadow: `0 0 9px ${activeColor}` }}
        />
      </button>
    );
  }

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      className="pointer-events-auto w-[184px] overflow-hidden rounded-[22px] border bg-[#020817]/48 p-2.5 backdrop-blur-2xl sm:w-[196px] sm:p-3"
      style={{
        borderColor: `${activeColor}66`,
        background: `linear-gradient(145deg, ${activeColor}12, rgba(2,8,23,0.62) 42%, rgba(2,8,23,0.4))`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 30px ${activeColor}12, 0 16px 46px -18px rgba(0,0,0,0.92), 0 0 32px -8px ${activeColor}88`,
      }}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span
          className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: activeColor }}
        >
          <Globe2 className="size-3.5" />
          {ar ? "محدد المناطق" : "REGIONS"}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={ar ? "تصغير محدد المناطق" : "Collapse region selector"}
          className="grid size-7 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2"
          style={{ outlineColor: activeColor }}
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {/* The globe itself is a large control: tapping it cycles the region. */}
      <button
        type="button"
        onClick={cycleRegion}
        aria-label={ar ? "تغيير المنطقة التالية" : "Select next region"}
        className="nx-region-control nx-region-control-active group relative block aspect-square w-full rounded-full border focus-visible:outline-none focus-visible:ring-2"
        style={
          {
            "--region-control-rgb": REGION_ACCENT_RGB[regionId],
            outlineColor: activeColor,
          } as CSSProperties
        }
      >
        <span
          aria-hidden
          className="nx-holo-globe-pulse pointer-events-none absolute inset-[7%] rounded-full border"
          style={{ borderColor: `${activeColor}45` }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[13%] rounded-full border border-dashed opacity-45 motion-safe:animate-[spin_18s_linear_infinite]"
          style={{ borderColor: activeColor }}
        />
        <span className="pointer-events-none absolute inset-[4%]">
          {mode === "static" ? (
            <StaticSectorGlobe activeIndex={activeIndex} activeColor={activeColor} />
          ) : (
            <Suspense
              fallback={<StaticSectorGlobe activeIndex={activeIndex} activeColor={activeColor} />}
            >
              <SectorGlobeScene
                animate={animate}
                activeIndex={activeIndex}
                activeColor={activeColor}
              />
            </Suspense>
          )}
        </span>
      </button>

      <div className="-mt-1 text-center">
        <div className="text-[8px] uppercase tracking-[0.2em] text-white/45">
          {ar ? "المنطقة النشطة" : "ACTIVE REGION"}
        </div>
        <div className="mt-0.5 flex items-center justify-center gap-1.5">
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ backgroundColor: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
          />
          <span className="truncate text-[12px] font-bold text-white" title={region.shortAr}>
            {ar ? region.shortAr : region.shortEn}
          </span>
        </div>
      </div>

      {/* Direct selection keeps the visual identity and operating context in sync. */}
      <div
        className="mt-2 grid grid-cols-2 gap-1.5"
        role="group"
        aria-label={ar ? "المناطق" : "Regions"}
      >
        {regions.map((item, index) => {
          const selected = item.id === regionId;
          const color = REGION_ACCENT_HEX[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setRegion(item.id)}
              aria-pressed={selected}
              className={cn(
                "nx-region-control relative flex min-h-11 items-center justify-center gap-1.5 overflow-hidden rounded-xl border px-2 text-[10px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 active:scale-[0.97]",
                selected && "nx-region-control-active",
                selected ? "text-white" : "border-white/10 text-white/58 hover:text-white",
              )}
              style={
                {
                  "--region-control-rgb": REGION_ACCENT_RGB[item.id],
                  "--region-control-delay": `${-(index * 0.55)}s`,
                  background: selected
                    ? `linear-gradient(145deg, ${color}30, ${color}0A)`
                    : "rgba(255,255,255,0.025)",
                  outlineColor: color,
                } as CSSProperties
              }
            >
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", selected && "animate-pulse")}
                style={{
                  backgroundColor: color,
                  boxShadow: selected ? `0 0 8px ${color}` : undefined,
                }}
              />
              <span className="truncate">{ar ? item.shortAr : item.shortEn}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={cycleRegion}
        aria-label={ar ? "التبديل إلى المنطقة التالية" : "Switch to the next region"}
        className="nx-region-control nx-region-control-active mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-semibold transition duration-200 hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98]"
        style={
          {
            "--region-control-rgb": REGION_ACCENT_RGB[regionId],
            color: activeColor,
            background: `linear-gradient(135deg, ${activeColor}1F, ${activeColor}08)`,
            outlineColor: activeColor,
          } as CSSProperties
        }
      >
        <Layers className="size-4" />
        {ar ? "تغيير منطقة العمل" : "Change work region"}
      </button>
    </div>
  );
}

export default SectorGlobeCorner;
