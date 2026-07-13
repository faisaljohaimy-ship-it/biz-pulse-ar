/**
 * RegionGlobe — client-only wrapper around the Three.js region globe.
 *
 * Performance-first:
 *  • Server + first paint render the lightweight static SVG fallback — the
 *    heavy 3D scene is React.lazy'd, so its Three.js chunk never touches app
 *    startup and only downloads when this globe is actually shown.
 *  • Weak devices (no WebGL, or low core-count on a small screen) keep the
 *    static SVG — no 3D at all.
 *  • prefers-reduced-motion freezes the globe's rotation (passed to the scene,
 *    which also drops to an on-demand render loop).
 */
import { Suspense, lazy, useEffect, useState } from "react";
import { REGION_MARKERS } from "./region-markers";
import type RegionGlobeSceneT from "./RegionGlobeScene";

// Client-only: on the server the ternary's `import()` is dead code, so Vite
// tree-shakes the entire Three.js chunk out of the SSR/serverless bundle
// (keeps Vercel's build memory well under its container limit). The scene is
// WebGL — it can only render in the browser anyway; SSR shows the SVG fallback.
const RegionGlobeScene = lazy(
  (): Promise<{ default: typeof RegionGlobeSceneT }> =>
    import.meta.env.SSR
      ? Promise.resolve({ default: (() => null) as unknown as typeof RegionGlobeSceneT })
      : import("./RegionGlobeScene"),
);

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

/** Static SVG globe — the fallback + Suspense placeholder. Zero 3D cost. */
function StaticGlobe() {
  // Fixed positions around a circle, faithful to the four regions' layout.
  const dots = [
    { ar: "الوسطى", cx: 100, cy: 84 },
    { ar: "الغربية", cx: 74, cy: 108 },
    { ar: "الشرقية", cx: 128, cy: 96 },
    { ar: "الجنوبية", cx: 92, cy: 132 },
  ];
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full"
      role="img"
      aria-label="خريطة القطاعات الأربعة"
    >
      <defs>
        <radialGradient id="rg-globe" cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#0d3a5c" />
          <stop offset="70%" stopColor="#071a2e" />
          <stop offset="100%" stopColor="#04111f" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="78" fill="url(#rg-globe)" stroke="#155e75" strokeWidth="0.6" />
      {/* latitude/longitude */}
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
      {[40, 78, 116].map((rx) => (
        <ellipse
          key={rx}
          cx="100"
          cy="100"
          rx="78"
          ry={rx}
          fill="none"
          stroke="#155e75"
          strokeOpacity="0.2"
          strokeWidth="0.5"
          transform="rotate(90 100 100)"
        />
      ))}
      {/* connecting arcs */}
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
              strokeOpacity="0.35"
              strokeWidth="0.7"
            />
          )),
      )}
      {/* region markers */}
      {dots.map((d) => (
        <g key={d.ar}>
          <circle cx={d.cx} cy={d.cy} r="5" fill="#34D399" opacity="0.25" />
          <circle cx={d.cx} cy={d.cy} r="2.4" fill="#34D399" />
        </g>
      ))}
    </svg>
  );
}

export function RegionGlobe() {
  const [mode, setMode] = useState<"static" | "scene">("static");
  const [animate, setAnimate] = useState(false);

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

  return (
    <div className="relative aspect-square w-full max-w-[360px]">
      {mode === "static" ? (
        <StaticGlobe />
      ) : (
        <Suspense fallback={<StaticGlobe />}>
          <RegionGlobeScene animate={animate} />
        </Suspense>
      )}
    </div>
  );
}

export default RegionGlobe;
