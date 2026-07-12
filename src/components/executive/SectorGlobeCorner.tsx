/**
 * SectorGlobeCorner — a compact, always-present cinematic 3D globe that lives
 * in the top-inline-start (top-right in RTL) corner of the windows workspace.
 * It shows all four sectors, PINS the active one (bound to the shared region
 * context), and beneath it exposes a single "change sector" control that
 * switches which sector the windows operate on — so every window in the shell
 * follows the pinned sector.
 *
 * Performance & devices (constitution art. 5):
 *  • Server + first paint render a lightweight static SVG — the Three.js scene
 *    is React.lazy'd and only downloads on capable devices.
 *  • Weak devices (no WebGL / low core-count on a small screen) keep the SVG.
 *  • prefers-reduced-motion freezes the cinematic drift.
 *  • Collapsible so it never blocks content on small screens; ≥44px touch
 *    targets on every control; full RTL.
 */
import { Suspense, lazy, useEffect, useState } from "react";
import { Layers, ChevronDown, Globe2 } from "lucide-react";
import { useRegion } from "@/lib/region-context";
import { REGION_MARKERS } from "./region-markers";
import { REGIONS, type RegionId } from "@/lib/regions";

const SectorGlobeScene = lazy(() => import("./SectorGlobeScene"));

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

/** Compact static SVG globe with the active sector highlighted. Zero 3D cost. */
function StaticSectorGlobe({ activeIndex }: { activeIndex: number }) {
  const dots = [
    { cx: 100, cy: 84 }, // central
    { cx: 74, cy: 108 }, // western
    { cx: 128, cy: 96 }, // eastern
    { cx: 92, cy: 132 }, // southern
  ];
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="كرة القطاعات">
      <defs>
        <radialGradient id="sgc-globe" cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#0d3a5c" />
          <stop offset="70%" stopColor="#071a2e" />
          <stop offset="100%" stopColor="#04111f" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="78" fill="url(#sgc-globe)" stroke="#155e75" strokeWidth="0.6" />
      {[30, 55, 78].map((r) => (
        <ellipse
          key={r}
          cx="100"
          cy="100"
          rx={r}
          ry="78"
          fill="none"
          stroke="#155e75"
          strokeOpacity="0.28"
          strokeWidth="0.5"
        />
      ))}
      {dots.map((a, i) =>
        dots
          .slice(i + 1)
          .map((b, j) => (
            <line
              key={`${i}-${j}`}
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
              stroke="#34D399"
              strokeOpacity="0.32"
              strokeWidth="0.7"
            />
          )),
      )}
      {dots.map((d, i) => {
        const active = i === activeIndex;
        return (
          <g key={i}>
            <circle
              cx={d.cx}
              cy={d.cy}
              r={active ? 8 : 5}
              fill={active ? "#3AE8FF" : "#34D399"}
              opacity={active ? 0.3 : 0.22}
            />
            <circle
              cx={d.cx}
              cy={d.cy}
              r={active ? 3.4 : 2.4}
              fill={active ? "#3AE8FF" : "#34D399"}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function SectorGlobeCorner() {
  const { regionId, region, setRegion, regions } = useRegion();
  const [mode, setMode] = useState<"static" | "scene">("static");
  const [animate, setAnimate] = useState(false);
  // Start collapsed on every device so the widget never covers page headers
  // / primary CTAs (New Incident, New Work Order, New Permit …). Users open
  // it explicitly via the floating globe button.
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
    REGION_MARKERS.findIndex((m) => m.id === regionId),
  );

  const cycleSector = () => {
    const idx = REGIONS.findIndex((r) => r.id === regionId);
    const next = REGIONS[(idx + 1) % REGIONS.length];
    setRegion(next.id as RegionId);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="إظهار كرة القطاعات"
        className="pointer-events-auto grid size-11 place-items-center rounded-full border border-[#3AE8FF]/40 bg-[#04111f]/80 text-[#3AE8FF] shadow-[0_0_22px_rgba(58,232,255,0.35)] backdrop-blur transition hover:bg-[#04111f]/95"
      >
        <Globe2 className="size-5" />
      </button>
    );
  }

  return (
    <div
      dir="rtl"
      className="pointer-events-auto w-[132px] rounded-2xl border border-[#3AE8FF]/25 bg-[#04111f]/75 p-2 shadow-[0_10px_40px_-16px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(58,232,255,0.08)] backdrop-blur-xl sm:w-[156px] sm:p-2.5"
    >
      {/* Header: title + collapse */}
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#3AE8FF]/80">
          <Globe2 className="size-3" />
          القطاعات
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="إخفاء كرة القطاعات"
          className="grid size-6 place-items-center rounded-md text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {/* Globe */}
      <div className="relative aspect-square w-full">
        {mode === "static" ? (
          <StaticSectorGlobe activeIndex={activeIndex} />
        ) : (
          <Suspense fallback={<StaticSectorGlobe activeIndex={activeIndex} />}>
            <SectorGlobeScene animate={animate} activeIndex={activeIndex} />
          </Suspense>
        )}
      </div>

      {/* Pinned sector label */}
      <div className="mt-1 text-center">
        <div className="text-[8px] uppercase tracking-[0.2em] text-emerald-300/80">
          القطاع المثبَّت
        </div>
        <div className="truncate text-[11px] font-bold text-white" title={region.shortAr}>
          {region.shortAr}
        </div>
      </div>

      {/* Sector position dots */}
      <div className="mt-1 flex items-center justify-center gap-1">
        {regions.map((r) => (
          <span
            key={r.id}
            aria-hidden
            className={
              r.id === regionId
                ? "h-1.5 w-1.5 rounded-full bg-[#3AE8FF] shadow-[0_0_6px_#3AE8FF]"
                : "h-1.5 w-1.5 rounded-full bg-white/25"
            }
          />
        ))}
      </div>

      {/* Change-sector control (drives which windows are shown) */}
      <button
        type="button"
        onClick={cycleSector}
        aria-label="تغيير القطاع"
        className="mt-1.5 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-2 text-[11px] font-semibold text-[#3AE8FF] transition hover:bg-[#3AE8FF]/20 active:scale-[0.98]"
      >
        <Layers className="size-4" />
        تغيير النافذة
      </button>
    </div>
  );
}

export default SectorGlobeCorner;
