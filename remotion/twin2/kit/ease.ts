/**
 * أدوات الزمن والحركة — منحنيات بيزييه (cubic-bezier) كما في CSS، ومفاتيح
 * أحاديّة الرتابة (Fritsch–Carlson). كلّ دالة نقيّة: الإطار f يُنتج الناتج نفسه دائمًا.
 */
export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const mod = (a: number, n: number): number => ((a % n) + n) % n;
export const fract = (x: number): number => x - Math.floor(x);
/** نسبة التقدّم بين a وb مقصورةً على [0,1]. */
export const prog = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));

export type Ease = (x: number) => number;

/** cubic-bezier(x1,y1,x2,y2) بحلّ نيوتن مع احتياط التنصيف. */
export const bezier = (x1: number, y1: number, x2: number, y2: number): Ease => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) break;
      if (e > 0) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
};

export const easeInOut = bezier(0.65, 0, 0.35, 1);
export const easeInOutSoft = bezier(0.45, 0, 0.25, 1);
export const easeOut = bezier(0.16, 1, 0.3, 1);
export const easeOutSoft = bezier(0.22, 0.61, 0.36, 1);
export const easeIn = bezier(0.7, 0, 0.84, 0);
export const easeBack = bezier(0.34, 1.45, 0.64, 1);
export const linear: Ease = (x) => clamp(x);

/** تقدّم مُليَّن: ramp(t, a, b, ease). */
export const ramp = (t: number, a: number, b: number, ease: Ease = easeInOut): number =>
  ease(prog(t, a, b));

/** مفاتيح [زمن، قيمة] بمنحنى هيرميت أحاديّ الرتابة — بلا ارتدادٍ زائد بين المفاتيح. */
export const keyframes = (t: number, keys: ReadonlyArray<readonly [number, number]>): number => {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (i < n - 2 && t > keys[i + 1][0]) i++;
  const [t0, v0] = keys[i];
  const [t1, v1] = keys[i + 1];
  const slope = (j: number) => (keys[j + 1][1] - keys[j][1]) / (keys[j + 1][0] - keys[j][0]);
  const tangent = (j: number): number => {
    if (j === 0 || j === n - 1) return 0; // سرعة صفريّة عند الطرفين
    const a = slope(j - 1);
    const b = slope(j);
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  };
  const h = t1 - t0;
  const u = (t - t0) / h;
  const m0 = tangent(i) * h;
  const m1 = tangent(i + 1) * h;
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1
  );
};

/** مولّد عشوائي حتميّ (mulberry32). */
export const rng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** تجزئة عدديّة حتميّة لقيمة في [0,1). */
export const hash1 = (n: number): number => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);
