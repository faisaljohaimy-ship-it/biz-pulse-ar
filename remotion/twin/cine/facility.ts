/**
 * المنشأة الإجرائية — محطّة تحويل بأبراج نقل وخزّانات ومبانٍ وكاميرات.
 *
 * كلّها خطوطٌ وأسطحٌ وجسيماتٌ مولَّدة بالكود (لا صورة ولا تقليد لموقع
 * حقيقي): «مشهد توضيحي». تُبنى بوحدات تصميم (DU) ثم تُحوَّل إلى العالم
 * بالمقياس `FS` عند الرسم.
 *
 * التجسّد يُحكم بإحداثيّ مسح `c` لكل قطعة: مستوى الليزر يعبر المنشأة،
 * وما أمامه سحابة نقاط، وما يمرّ به هيكلٌ سلكي، وما خلفه أسطحٌ مكتملة.
 */
import { hash, rng, type V3, v3, vcross, vlen, vnorm, vsub } from "./math";

/** وحدات العالم لكل وحدة تصميم. */
export const FS = 0.25;

export const K = {
  STRUCT: 0,
  FINE: 1,
  GLOW: 2,
  WIRE: 3,
  FENCE: 4,
  PAD: 5,
  PIPE: 6,
  INSUL: 7,
} as const;
export type Kind = (typeof K)[keyof typeof K];

export interface Seg {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  kind: Kind;
  /** وزن السطوع 0…1. */
  w: number;
  /** إحداثيّ المسح للمنتصف. */
  c: number;
  /** صبغة 0 = سماويّ … 1 = زمرديّ. */
  hue: number;
}

export interface Face {
  p: V3[];
  n: V3;
  /** إضاءة قاعدية 0…1. */
  tone: number;
  glow: boolean;
  c: number;
  /** مركز الوجه (للترتيب العمقي). */
  m: V3;
  hue: number;
}

export interface Pipe {
  pts: V3[];
  len: number;
  /** أطوال تراكمية عند كل نقطة. */
  acc: number[];
}

export interface Facility {
  segs: Seg[];
  faces: Face[];
  pipes: Pipe[];
  /** سحابة النقاط: موضع الهدف، إحداثيّ المسح، إزاحة البداية، صنف اللون. */
  cloud: {
    n: number;
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    c: Float32Array;
    ox: Float32Array;
    oy: Float32Array;
    oz: Float32Array;
    cls: Uint8Array;
  };
  cams: { pos: V3; bearing: number; phase: number }[];
  /** مجازات الموصلات بين الأبراج: طرفان وانحناء. */
  spans: { a: V3; b: V3; sag: number }[];
  mast: V3;
  cMin: number;
  cMax: number;
}

/** اتجاه المسح في المسقط: يمينًا مع ميلٍ خفيف. */
const SCAN_ANGLE = (-12 * Math.PI) / 180;
const SD = { x: Math.cos(SCAN_ANGLE), y: Math.sin(SCAN_ANGLE) };
/** حدّا إحداثيّ المسح الفعّالان: ما يقع خارجهما (أبراج الأطراف) يُجسَّد مع أوّل/آخر عنصر. */
const C_LO = -2.9;
const C_HI = 3.1;
export const scanCoord = (x: number, y: number, z: number): number => {
  const c = x * SD.x + y * SD.y + 0.35 * z;
  return c < C_LO ? C_LO : c > C_HI ? C_HI : c;
};
export const SCAN_DIR = SD;

class Builder {
  segs: Seg[] = [];
  faces: Face[] = [];
  pipes: Pipe[] = [];
  cams: Facility["cams"] = [];
  spans: Facility["spans"] = [];
  private maxLen = 0.34;
  /** صبغة العناصر التي تُبنى لاحقًا. */
  hue = 0;

  line(a: V3, b: V3, kind: Kind = K.STRUCT, w = 1): void {
    const len = vlen(vsub(b, a));
    const n = Math.max(1, Math.ceil(len / this.maxLen));
    for (let i = 0; i < n; i += 1) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const p0 = v3(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.z + (b.z - a.z) * t0);
      const p1 = v3(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1, a.z + (b.z - a.z) * t1);
      this.segs.push({
        ax: p0.x,
        ay: p0.y,
        az: p0.z,
        bx: p1.x,
        by: p1.y,
        bz: p1.z,
        kind,
        w,
        c: scanCoord((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2),
        hue: this.hue,
      });
    }
  }

  poly(pts: V3[], kind: Kind = K.STRUCT, w = 1, close = false): void {
    for (let i = 0; i + 1 < pts.length; i += 1) this.line(pts[i], pts[i + 1], kind, w);
    if (close && pts.length > 2) this.line(pts[pts.length - 1], pts[0], kind, w);
  }

  face(p: V3[], tone: number, glow = false): void {
    const n = vnorm(vcross(vsub(p[1], p[0]), vsub(p[2], p[0])));
    let mx = 0;
    let my = 0;
    let mz = 0;
    for (const q of p) {
      mx += q.x;
      my += q.y;
      mz += q.z;
    }
    const m = v3(mx / p.length, my / p.length, mz / p.length);
    this.faces.push({ p, n, tone, glow, c: scanCoord(m.x, m.y, m.z), m, hue: this.hue });
  }

  box(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    tone = 0.5,
    w = 1,
    kind: Kind = K.STRUCT,
  ): void {
    const P = (x: number, y: number, z: number) => v3(x, y, z);
    // جوانب (ترتيبها يجعل الناظم للخارج)
    this.face([P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], tone); // جنوب -y
    this.face([P(x1, y1, z0), P(x0, y1, z0), P(x0, y1, z1), P(x1, y1, z1)], tone * 0.7); // شمال +y
    this.face([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], tone * 0.85); // شرق
    this.face([P(x0, y1, z0), P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1)], tone * 0.75); // غرب
    this.face(
      [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
      Math.min(1, tone * 1.35),
    ); // سقف
    const top = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
    const bot = [P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)];
    this.poly(top, kind, w, true);
    this.poly(bot, kind, w * 0.7, true);
    for (let i = 0; i < 4; i += 1) this.line(bot[i], top[i], kind, w);
  }

  prism(
    cx: number,
    cy: number,
    r: number,
    z0: number,
    z1: number,
    n: number,
    tone: number,
    ribEvery = 2,
    rings = 0,
    w = 1,
  ): V3[][] {
    const ring = (z: number) =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return v3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z);
      });
    const b = ring(z0);
    const t = ring(z1);
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      this.face(
        [b[i], b[j], t[j], t[i]],
        tone * (0.55 + 0.45 * Math.max(0, Math.cos(((i + 0.5) / n) * Math.PI * 2 + 0.7))),
      );
    }
    this.poly(t, K.STRUCT, w, true);
    this.poly(b, K.STRUCT, w * 0.7, true);
    for (let i = 0; i < n; i += ribEvery) this.line(b[i], t[i], K.FINE, w * 0.8);
    for (let k = 1; k <= rings; k += 1) {
      const z = z0 + ((z1 - z0) * k) / (rings + 1);
      this.poly(ring(z), K.FINE, w * 0.6, true);
    }
    return [b, t];
  }

  cone(
    cx: number,
    cy: number,
    r: number,
    z0: number,
    z1: number,
    n: number,
    tone: number,
    w = 1,
  ): void {
    const ring = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return v3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z0);
    });
    const apex = v3(cx, cy, z1);
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      this.face(
        [ring[i], ring[j], apex],
        tone * (0.7 + 0.3 * Math.max(0, Math.cos(((i + 0.5) / n) * Math.PI * 2 + 0.7))),
      );
    }
    for (let i = 0; i < n; i += 4) this.line(ring[i], apex, K.FINE, w * 0.7);
  }

  pylon(cx: number, cy: number, H: number): { tips: V3[] } {
    const levels = [0, 0.25, 0.5, 0.74, 0.95, 1.1].map((v) => (v * H) / 1.7);
    const half = (z: number): number => {
      const zw = (1.1 * H) / 1.7;
      return z <= zw ? 0.25 - (0.25 - 0.055) * (z / zw) : 0.055 - 0.04 * ((z - zw) / (H - zw));
    };
    const corner = (z: number, i: number): V3 => {
      const h = half(z);
      return v3(cx + (i === 0 || i === 3 ? -h : h), cy + (i < 2 ? -h : h), z);
    };
    for (let l = 0; l < levels.length; l += 1) {
      const loop = [0, 1, 2, 3].map((i) => corner(levels[l], i));
      // 0:(-,-) 1:(-,+) 2:(+,+) 3:(+,-)  → حلقة بترتيب سليم
      this.poly([loop[0], loop[1], loop[2], loop[3]], K.STRUCT, 0.85, true);
      if (l > 0) {
        for (let i = 0; i < 4; i += 1) {
          this.line(corner(levels[l - 1], i), corner(levels[l], i), K.STRUCT, 1);
          const j = (i + 1) % 4;
          // قُطرا الوجه
          this.line(corner(levels[l - 1], i), corner(levels[l], j), K.FINE, 0.8);
          this.line(corner(levels[l - 1], j), corner(levels[l], i), K.FINE, 0.8);
        }
      }
    }
    // الجزء العلوي: ساق مضيّقة
    const zTop = H;
    const mid = [(1.1 * H) / 1.7, (1.28 * H) / 1.7, (1.5 * H) / 1.7, zTop];
    for (let l = 1; l < mid.length; l += 1) {
      for (let i = 0; i < 4; i += 1)
        this.line(corner(mid[l - 1], i), corner(mid[l], i), K.STRUCT, 1);
      const loop = [0, 1, 2, 3].map((i) => corner(mid[l], i));
      this.poly(loop, K.FINE, 0.8, true);
      if (l < mid.length - 1) {
        for (let i = 0; i < 4; i += 1) {
          const j = (i + 1) % 4;
          this.line(corner(mid[l - 1], i), corner(mid[l], j), K.FINE, 0.7);
        }
      }
    }
    // الأذرع والعوازل
    const tips: V3[] = [];
    const arm = (z: number, reach: number): void => {
      const zz = (z * H) / 1.7;
      const L = v3(cx, cy - reach, zz);
      const R = v3(cx, cy + reach, zz);
      this.line(L, R, K.STRUCT, 1);
      this.line(v3(cx, cy - reach, zz), v3(cx, cy - 0.05, zz + 0.16), K.FINE, 0.8);
      this.line(v3(cx, cy + reach, zz), v3(cx, cy + 0.05, zz + 0.16), K.FINE, 0.8);
      for (const yy of [-reach, reach]) {
        const top = v3(cx, cy + yy, zz);
        const bot = v3(cx, cy + yy, zz - 0.14);
        this.line(top, bot, K.INSUL, 0.9);
        tips.push(bot);
      }
    };
    arm(1.22, 0.5);
    arm(1.44, 0.42);
    tips.push(v3(cx, cy, H));
    return { tips };
  }
}

export function buildFacility(): Facility {
  const b = new Builder();
  const P = v3;

  /* ── الأرضية والسياج ──────────────────────────────────────────────── */
  b.hue = 0.9;
  const PX = 2.4;
  const PY = 1.6;
  b.face([P(-PX, -PY, 0), P(PX, -PY, 0), P(PX, PY, 0), P(-PX, PY, 0)], 0.1);
  b.poly([P(-PX, -PY, 0), P(PX, -PY, 0), P(PX, PY, 0), P(-PX, PY, 0)], K.PAD, 1.2, true);
  b.poly(
    [
      P(-PX + 0.08, -PY + 0.08, 0),
      P(PX - 0.08, -PY + 0.08, 0),
      P(PX - 0.08, PY - 0.08, 0),
      P(-PX + 0.08, PY - 0.08, 0),
    ],
    K.PAD,
    0.5,
    true,
  );
  // السياج: أعمدةٌ وسكّتان
  const fp: V3[] = [
    P(-PX + 0.16, -PY + 0.16, 0),
    P(PX - 0.16, -PY + 0.16, 0),
    P(PX - 0.16, PY - 0.16, 0),
    P(-PX + 0.16, PY - 0.16, 0),
  ];
  for (let s = 0; s < 4; s += 1) {
    const a = fp[s];
    const c = fp[(s + 1) % 4];
    const len = vlen(vsub(c, a));
    const n = Math.round(len / 0.4);
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const x = a.x + (c.x - a.x) * t;
      const y = a.y + (c.y - a.y) * t;
      b.line(P(x, y, 0), P(x, y, 0.13), K.FENCE, 0.7);
    }
    b.line(P(a.x, a.y, 0.13), P(c.x, c.y, 0.13), K.FENCE, 0.8);
    b.line(P(a.x, a.y, 0.07), P(c.x, c.y, 0.07), K.FENCE, 0.5);
  }

  b.hue = 0;
  /* ── المبنى الرئيسي والمستودع ─────────────────────────────────────── */
  b.box(-0.4, 0.5, 0, 0.7, 1.15, 0.32, 0.55, 1);
  b.box(-0.05, 0.62, 0.32, 0.4, 0.95, 0.4, 0.5, 0.8); // وحدة السقف
  for (let i = 0; i < 6; i += 1) {
    const x0 = -0.3 + i * 0.16;
    b.face(
      [P(x0, 0.499, 0.17), P(x0 + 0.1, 0.499, 0.17), P(x0 + 0.1, 0.499, 0.25), P(x0, 0.499, 0.25)],
      1,
      true,
    );
  }
  b.hue = 0.75;
  b.box(1.0, 0.55, 0, 2.1, 1.15, 0.26, 0.45, 0.9);
  for (let i = 1; i < 6; i += 1)
    b.line(P(1.0 + i * 0.1833, 0.55, 0.26), P(1.0 + i * 0.1833, 1.15, 0.26), K.FINE, 0.5);
  b.hue = 0;
  // الصاري
  const mastBase = P(0.62, 1.05, 0.32);
  const mastTop = P(0.62, 1.05, 1.08);
  b.line(mastBase, mastTop, K.STRUCT, 1.1);
  for (let z = 0.45; z < 1.0; z += 0.16) {
    b.line(P(0.62 - 0.04, 1.05, z), P(0.62 + 0.04, 1.05, z + 0.08), K.FINE, 0.7);
    b.line(P(0.62 + 0.04, 1.05, z), P(0.62 - 0.04, 1.05, z + 0.08), K.FINE, 0.7);
  }
  b.line(P(0.62 - 0.1, 1.05, 0.98), P(0.62 + 0.1, 1.05, 0.98), K.STRUCT, 0.9);
  b.line(P(0.62, 1.05 - 0.1, 0.9), P(0.62, 1.05 + 0.1, 0.9), K.STRUCT, 0.9);

  /* ── الخزّانات ──────────────────────────────────────────────────── */
  const tanks: [number, number, number, number][] = [
    [1.0, -0.88, 0.34, 0.5],
    [1.78, -0.88, 0.3, 0.42],
    [1.4, -0.1, 0.27, 0.56],
  ];
  b.hue = 0.85;
  for (const [x, y, r, h] of tanks) {
    b.prism(x, y, r, 0, h, 16, 0.55, 2, 2);
    b.cone(x, y, r, h, h + r * 0.38, 16, 0.6);
    b.line(P(x, y, h + r * 0.38), P(x, y, h + r * 0.38 + 0.1), K.STRUCT, 0.8);
    // سلّم حلزوني خفيف
    const st = 10;
    for (let i = 0; i < st; i += 1) {
      const a0 = 0.6 + (i / st) * 2.6;
      const a1 = 0.6 + ((i + 1) / st) * 2.6;
      b.line(
        P(x + Math.cos(a0) * (r + 0.02), y + Math.sin(a0) * (r + 0.02), (h * i) / st),
        P(x + Math.cos(a1) * (r + 0.02), y + Math.sin(a1) * (r + 0.02), (h * (i + 1)) / st),
        K.FINE,
        0.6,
      );
    }
  }

  b.hue = 0;
  /* ── محوّلات ومحطة التحويل ───────────────────────────────────────── */
  const trafos: [number, number][] = [
    [-1.72, -0.82],
    [-0.98, -0.82],
    [-1.35, -0.1],
  ];
  for (const [x, y] of trafos) {
    b.box(x - 0.26, y - 0.17, 0.04, x + 0.26, y + 0.17, 0.3, 0.55, 1);
    // مبرّدات
    for (let i = 0; i < 6; i += 1) {
      const xx = x - 0.2 + i * 0.08;
      b.line(P(xx, y + 0.17, 0.06), P(xx, y + 0.24, 0.06), K.FINE, 0.5);
      b.line(P(xx, y + 0.24, 0.06), P(xx, y + 0.24, 0.26), K.FINE, 0.55);
      b.line(P(xx, y + 0.24, 0.26), P(xx, y + 0.17, 0.26), K.FINE, 0.5);
    }
    // خزّان التمدد
    b.prism(x, y - 0.02, 0.07, 0.3, 0.37, 8, 0.5, 1, 0, 0.8);
    // الجلبات
    for (let i = -1; i <= 1; i += 1) {
      const bx = x + i * 0.13;
      b.line(P(bx, y - 0.08, 0.3), P(bx, y - 0.08, 0.5), K.STRUCT, 1);
      for (let r = 0; r < 4; r += 1) {
        const z = 0.34 + r * 0.045;
        const ring = Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2;
          return P(bx + Math.cos(a) * 0.028, y - 0.08 + Math.sin(a) * 0.028, z);
        });
        b.poly(ring, K.FINE, 0.6, true);
      }
    }
  }
  // بوّابتا القضبان
  const gantry = (x0: number, x1: number, y: number): void => {
    const h = 0.56;
    for (const x of [x0, x1]) {
      for (const dx of [-0.03, 0.03]) b.line(P(x + dx, y, 0), P(x + dx * 0.4, y, h), K.STRUCT, 0.9);
      for (let z = 0; z < h - 0.1; z += 0.12) {
        b.line(
          P(x - 0.03 + (z / h) * 0.018, y, z),
          P(x + 0.03 - (z / h) * 0.018, y, z + 0.12),
          K.FINE,
          0.55,
        );
      }
    }
    b.line(P(x0 - 0.12, y, h), P(x1 + 0.12, y, h), K.STRUCT, 1);
    b.line(P(x0 - 0.12, y, h - 0.06), P(x1 + 0.12, y, h - 0.06), K.FINE, 0.6);
    for (let x = x0 + 0.1; x < x1; x += 0.28) b.line(P(x, y, h), P(x, y, h - 0.12), K.INSUL, 0.9);
    // قضبان التجميع
    for (const dy of [-0.05, 0, 0.05])
      b.line(P(x0 - 0.12, y + dy, h - 0.13), P(x1 + 0.12, y + dy, h - 0.13), K.WIRE, 0.8);
  };
  gantry(-2.05, -0.62, 0.36);
  gantry(-2.05, -0.62, -1.28);

  /* ── أبراج النقل والموصلات ───────────────────────────────────────── */
  const PY_LINE = 1.98;
  const px = [-4.2, -1.4, 1.4, 4.2];
  const tipsList = px.map((x) => b.pylon(x, PY_LINE, 1.7).tips);
  for (let s = 0; s + 1 < px.length; s += 1) {
    for (let t = 0; t < tipsList[s].length; t += 1) {
      const a = tipsList[s][t];
      const c = tipsList[s + 1][t];
      const sag = 0.1;
      const n = 16;
      b.spans.push({ a, b: c, sag });
      let prev = a;
      for (let i = 1; i <= n; i += 1) {
        const u = i / n;
        const q = P(
          a.x + (c.x - a.x) * u,
          a.y + (c.y - a.y) * u,
          a.z + (c.z - a.z) * u - sag * 4 * u * (1 - u),
        );
        b.line(prev, q, K.WIRE, t === tipsList[s].length - 1 ? 0.6 : 0.9);
        prev = q;
      }
    }
  }
  // امتداد الموصلات خارج الإطار (يتلاشى في الأفق)
  for (const dir of [-1, 1]) {
    const endIdx = dir < 0 ? 0 : px.length - 1;
    for (const a of tipsList[endIdx]) {
      let prev = a;
      for (let i = 1; i <= 18; i += 1) {
        const u = i / 18;
        const q = P(
          a.x + dir * u * 14,
          a.y + u * 1.5,
          a.z - 0.1 * 4 * Math.min(u * 3, 1) * (1 - Math.min(u * 3, 1)) - u * 0.2,
        );
        b.line(prev, q, K.WIRE, 0.45);
        prev = q;
      }
    }
  }

  /* ── الأنابيب ───────────────────────────────────────────────────── */
  b.hue = 0.5;
  const pipeDefs: V3[][] = [
    [
      P(0.15, 0.5, 0.08),
      P(0.15, -0.45, 0.08),
      P(-0.98, -0.45, 0.08),
      P(-1.72, -0.45, 0.08),
      P(-1.72, -0.65, 0.08),
    ],
    [P(-0.98, -0.45, 0.08), P(-0.98, -0.65, 0.08)],
    [P(0.15, -0.45, 0.08), P(1.0, -0.45, 0.08), P(1.78, -0.45, 0.08), P(1.78, -0.58, 0.08)],
    [P(1.0, -0.45, 0.08), P(1.0, -0.54, 0.08)],
    [P(1.4, -0.45, 0.08), P(1.4, -0.37, 0.08)],
    [P(0.7, 0.8, 0.08), P(1.0, 0.8, 0.08)],
    [P(-0.35, 0.5, 0.08), P(-0.35, 0.2, 0.08), P(-1.35, 0.2, 0.08), P(-1.35, 0.07, 0.08)],
  ];
  for (const pts of pipeDefs) {
    const acc = [0];
    for (let i = 1; i < pts.length; i += 1) acc.push(acc[i - 1] + vlen(vsub(pts[i], pts[i - 1])));
    b.pipes.push({ pts, len: acc[acc.length - 1], acc });
    for (let i = 0; i + 1 < pts.length; i += 1) {
      const d = vnorm(vsub(pts[i + 1], pts[i]));
      const o = P(-d.y * 0.022, d.x * 0.022, 0);
      b.line(
        P(pts[i].x + o.x, pts[i].y + o.y, pts[i].z),
        P(pts[i + 1].x + o.x, pts[i + 1].y + o.y, pts[i + 1].z),
        K.PIPE,
        0.8,
      );
      b.line(
        P(pts[i].x - o.x, pts[i].y - o.y, pts[i].z),
        P(pts[i + 1].x - o.x, pts[i + 1].y - o.y, pts[i + 1].z),
        K.PIPE,
        0.8,
      );
    }
    for (let i = 0; i + 1 < pts.length; i += 1) {
      const len = vlen(vsub(pts[i + 1], pts[i]));
      const n = Math.floor(len / 0.5);
      for (let k = 0; k <= n; k += 1) {
        const t = n === 0 ? 0 : k / n;
        const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t;
        const y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
        b.line(P(x, y, 0), P(x, y, 0.08), K.FINE, 0.45);
      }
    }
  }

  b.hue = 0;
  /* ── الكاميرات الأمنية ──────────────────────────────────────────── */
  const camPosts: [number, number, number][] = [
    [-2.24, -1.44, 0.8],
    [2.24, -1.44, 2.1],
    [-2.24, 1.44, 3.3],
    [2.24, 1.44, 4.6],
  ];
  for (const [x, y, ph] of camPosts) {
    b.line(P(x, y, 0), P(x, y, 0.5), K.STRUCT, 1);
    b.box(x - 0.045, y - 0.07, 0.5, x + 0.045, y + 0.07, 0.57, 0.6, 0.8);
    b.cams.push({ pos: P(x, y, 0.55), bearing: Math.atan2(-y, -x), phase: ph });
  }

  /* ── سحابة النقاط ───────────────────────────────────────────────── */
  const r = rng(90210);
  const px_: number[] = [];
  const py_: number[] = [];
  const pz_: number[] = [];
  const pc_: number[] = [];
  const cls_: number[] = [];
  for (const s of b.segs) {
    if (s.kind === K.PAD) continue;
    const len = Math.hypot(s.bx - s.ax, s.by - s.ay, s.bz - s.az);
    const n = Math.max(1, Math.round(len / 0.1));
    for (let i = 0; i < n; i += 1) {
      const t = (i + r()) / n;
      px_.push(s.ax + (s.bx - s.ax) * t);
      py_.push(s.ay + (s.by - s.ay) * t);
      pz_.push(s.az + (s.bz - s.az) * t);
      pc_.push(s.c);
      cls_.push(s.kind === K.WIRE || s.kind === K.PIPE ? 1 : 0);
    }
  }
  for (const f of b.faces) {
    // مثلثات مروحية
    let area = 0;
    for (let i = 1; i + 1 < f.p.length; i += 1)
      area += vlen(vcross(vsub(f.p[i], f.p[0]), vsub(f.p[i + 1], f.p[0]))) / 2;
    const n = Math.min(60, Math.round(area * (f.glow ? 600 : 230)));
    for (let k = 0; k < n; k += 1) {
      const tri = 1 + Math.floor(r() * (f.p.length - 2));
      let u = r();
      let v = r();
      if (u + v > 1) {
        u = 1 - u;
        v = 1 - v;
      }
      const a = f.p[0];
      const bb = f.p[tri];
      const c = f.p[tri + 1];
      px_.push(a.x + (bb.x - a.x) * u + (c.x - a.x) * v);
      py_.push(a.y + (bb.y - a.y) * u + (c.y - a.y) * v);
      pz_.push(a.z + (bb.z - a.z) * u + (c.z - a.z) * v);
      pc_.push(f.c);
      cls_.push(f.glow ? 2 : 3);
    }
  }
  const N = px_.length;
  const cloud: Facility["cloud"] = {
    n: N,
    x: Float32Array.from(px_),
    y: Float32Array.from(py_),
    z: Float32Array.from(pz_),
    c: Float32Array.from(pc_),
    ox: new Float32Array(N),
    oy: new Float32Array(N),
    oz: new Float32Array(N),
    cls: Uint8Array.from(cls_),
  };
  for (let i = 0; i < N; i += 1) {
    // مطرُ نقاطٍ من الأعلى: إزاحةٌ رأسيّة غالبة وانحرافٌ جانبيٌّ صغير
    const ang = hash(i * 7 + 1) * Math.PI * 2;
    const rad = 0.05 + hash(i * 7 + 2) * 0.55;
    const hgt = hash(i * 7 + 3);
    cloud.ox[i] = Math.cos(ang) * rad;
    cloud.oy[i] = Math.sin(ang) * rad;
    cloud.oz[i] = 0.25 + 1.7 * hgt * hgt + 0.2 * hgt;
  }

  let cMin = Infinity;
  let cMax = -Infinity;
  for (const s of b.segs) {
    cMin = Math.min(cMin, s.c);
    cMax = Math.max(cMax, s.c);
  }

  return {
    segs: b.segs,
    faces: b.faces,
    pipes: b.pipes,
    cloud,
    cams: b.cams,
    spans: b.spans,
    mast: mastTop,
    cMin,
    cMax,
  };
}
