/** رياضيات صغيرة حتميّة — لا Math.random في أي مكان من الفيلم. */

export const clamp = (x: number, a = 0, b = 1): number => (x < a ? a : x > b ? b : x);
export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (x: number): number => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
/** تدرّج خطّي محصور بين علامتين. */
export const win = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
export const smoothWin = (t: number, a: number, b: number): number => smooth(win(t, a, b));
export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - clamp01(x), 3);
export const easeInCubic = (x: number): number => Math.pow(clamp01(x), 3);
export const easeOutExpo = (x: number): number => {
  const c = clamp01(x);
  return c >= 1 ? 1 : 1 - Math.pow(2, -10 * c);
};
export const easeInOutCubic = (x: number): number => {
  const c = clamp01(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
/** نهوضٌ بتجاوز طفيف ثم استقرار. */
export const outBack = (x: number, s = 1.35): number => {
  const c = clamp01(x) - 1;
  return 1 + (s + 1) * c * c * c + s * c * c;
};
export const frac = (x: number): number => x - Math.floor(x);

/** مولّد عشوائي بذريّ — mulberry32. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** تجزئة عدد صحيح إلى [0,1) — لضجيج القيم. */
export function hash(n: number): number {
  let x = (n | 0) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** ضجيج قيمٍ أحادي البعد ناعم (مدى −1…1). */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i * 374761393 + seed * 668265263) * 2 - 1;
  const b = hash((i + 1) * 374761393 + seed * 668265263) * 2 - 1;
  return a + (b - a) * u;
}

export interface V3 {
  x: number;
  y: number;
  z: number;
}
export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
export const vadd = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
export const vsub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
export const vscale = (a: V3, s: number): V3 => v3(a.x * s, a.y * s, a.z * s);
export const vdot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const vcross = (a: V3, b: V3): V3 =>
  v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const vlen = (a: V3): number => Math.hypot(a.x, a.y, a.z);
export const vnorm = (a: V3): V3 => {
  const l = vlen(a) || 1;
  return v3(a.x / l, a.y / l, a.z / l);
};
export const vlerp = (a: V3, b: V3, t: number): V3 =>
  v3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
