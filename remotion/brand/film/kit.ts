/**
 * أدوات الفيلم المشتركة — الإحداثيات والمنحنيات والمولّد الثابت البذرة. منقولةٌ كما هي من
 * `SadeedFilm.tsx` قبل R4 حتى تتقاسمها أقسام الفيلم (`Montage.tsx` · `Forge.tsx`) بلا تكرار.
 */
import type { CSSProperties } from "react";
import { Easing, interpolate } from "remotion";

export const W = 2172;
export const H = 724;
export const CX = W / 2;
export const CY = H / 2;
export const TAU = Math.PI * 2;

export const cine = Easing.bezier(0.45, 0, 0.2, 1);
export const outSoft = Easing.bezier(0.16, 1, 0.3, 1);
export const glide = Easing.bezier(0.37, 0, 0.63, 1);

/** 0..1 بين لحظتين، محصورٌ عند الطرفين. */
export function ramp(t: number, a: number, b: number, ease: (x: number) => number = cine): number {
  return interpolate(t, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}

export function frac(x: number): number {
  return x - Math.floor(x);
}

export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** مولّدٌ ثابت البذرة — الإطار نفسه يُرسم كما هو في كل تصيير. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type Pt = { x: number; y: number };

export function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt {
  const v = 1 - u;
  return {
    x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
    y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y,
  };
}

export function quad(p0: Pt, c: Pt, p1: Pt, u: number): Pt {
  const v = 1 - u;
  return {
    x: v * v * p0.x + 2 * v * u * c.x + u * u * p1.x,
    y: v * v * p0.y + 2 * v * u * c.y + u * u * p1.y,
  };
}

export const box = (x: number, y: number, w: number, h: number): CSSProperties => ({
  position: "absolute",
  left: x,
  top: y,
  width: w,
  height: h,
});

/** منحنى كاتمول-روم عبر النقاط، عيّناتٍ متقاربة. */
export function spline(points: readonly Pt[], per = 24): Pt[] {
  const P = [points[0], ...points, points[points.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let j = 0; j < per; j++) {
      const u = j / per;
      const c = (a: number, b: number, c2: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c2) * u +
          (2 * a - 5 * b + 4 * c2 - d) * u * u +
          (-a + 3 * b - 3 * c2 + d) * u * u * u);
      out.push({ x: c(p0.x, p1.x, p2.x, p3.x), y: c(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export type Trace = { pts: Pt[]; lens: number[] };

export function trace(pts: Pt[]): Trace {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, lens };
}

/** النقطة عند كسرٍ من طول المسار. */
export function pointAt(tr: Trace, u: number): Pt {
  const target = Math.max(0, Math.min(1, u)) * tr.lens[tr.lens.length - 1];
  let i = 1;
  while (i < tr.lens.length - 1 && tr.lens[i] < target) i++;
  const f = (target - tr.lens[i - 1]) / (tr.lens[i] - tr.lens[i - 1] || 1);
  return { x: lerp(tr.pts[i - 1].x, tr.pts[i].x, f), y: lerp(tr.pts[i - 1].y, tr.pts[i].y, f) };
}

/** المسار مرسومًا حتى كسرٍ من طوله. */
export function partial(tr: Trace, u: number): string {
  const target = u * tr.lens[tr.lens.length - 1];
  const head = pointAt(tr, u);
  const body = tr.pts.filter((_, i) => tr.lens[i] < target);
  return [...body, head]
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}
