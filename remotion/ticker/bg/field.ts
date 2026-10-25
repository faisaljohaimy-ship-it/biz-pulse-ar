/**
 * حقل الشفق (aurora) لخلفية شريط الحالة — دالة خالصة حتمية (لا Math.random؛ بذرة mulberry32).
 * الدورية: مكانيًّا بأعدادٍ صحيحة من الأطوال الموجية عبر العرض W (فتتّصل الحافة اليمنى باليسرى)،
 * وزمنيًّا بأعدادٍ صحيحة من الدورات في الحلقة (فيتّصل الإطار الأخير بالأول).
 * الناتج: مخزن RGBA عائم مسبق الضرب (premultiplied) ثم يُحوَّل إلى بايتات مستقيمة اللون مع حبيبة ±1.
 */
export const W = 1200;
export const H = 96;
export const FRAMES = 64; // × 125 ms = 8.0 ث
export const FPS = 8;

export type Theme = "dark" | "light";
type RGB = readonly [number, number, number];
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

interface Palette {
  base: RGB;
  baseA: number;
  violet: RGB;
  violetA: number;
  emerald: RGB;
  emeraldA: number;
  cyan: RGB;
  cyanA: number;
  core: RGB;
  coreA: number;
  thread: RGB;
  threadA: number;
  packet: RGB;
  packetA: number;
  spark: RGB;
  sparkHalo: RGB;
  sparkA: number;
}

export const PALETTES: Record<Theme, Palette> = {
  dark: {
    base: hex("#0a1530"),
    baseA: 0.2,
    violet: hex("#5568e8"),
    violetA: 0.34,
    emerald: hex("#2fb36d"),
    emeraldA: 0.46,
    cyan: hex("#2fd0e6"),
    cyanA: 0.44,
    core: hex("#8be9f5"),
    coreA: 0.22,
    thread: hex("#6fd3e8"),
    threadA: 0.025,
    packet: hex("#bff4fb"),
    packetA: 0.42,
    spark: hex("#ffffff"),
    sparkHalo: hex("#7fe3f2"),
    sparkA: 0.75,
  },
  light: {
    base: hex("#ffffff"),
    baseA: 0.12,
    violet: hex("#a9b4f0"),
    violetA: 0.3,
    emerald: hex("#7fd9c4"),
    emeraldA: 0.46,
    cyan: hex("#8ccdf0"),
    cyanA: 0.56,
    core: hex("#e9b7a3"),
    coreA: 0.34, // ذهبيّ وردي
    thread: hex("#6aa6c9"),
    threadA: 0.04,
    packet: hex("#4f9cc4"),
    packetA: 0.5,
    spark: hex("#3f9ac6"),
    sparkHalo: hex("#7cc0e0"),
    sparkA: 0.9,
  },
};

const TAU = Math.PI * 2;
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** مسافة التفاف دورية موقّعة في (-W/2, W/2] */
const wrap = (d: number) => ((((d + W / 2) % W) + W) % W) - W / 2;

/** ملء مخزن [W*H*4] مسبق الضرب لإطارٍ واحد (phi ∈ [0,1) جزء الحلقة). */
export function renderField(theme: Theme, frame: number, buf: Float32Array) {
  const P = PALETTES[theme];
  const phi = (frame % FRAMES) / FRAMES;
  const dark = theme === "dark";

  // ثوابت الشرائط: [مركز/H، سعة1، دورات مكانية1، دورات زمنية1، طور1، سعة2، دورات2، زمن2، طور2، سيغما/H، تعديل-سطوع (دورات مكانية، زمنية، طور)]
  const R = {
    violet: {
      c: 0.5,
      a1: 0.16,
      p1: 1,
      m1: 1,
      f1: 0.6,
      a2: 0.07,
      p2: 3,
      m2: -1,
      f2: 2.1,
      s: 0.3,
      bp: 1,
      bm: 1,
      bf: 1.9,
    },
    emerald: {
      c: 0.64,
      a1: 0.14,
      p1: 2,
      m1: -1,
      f1: 4.0,
      a2: 0.06,
      p2: 4,
      m2: 1,
      f2: 0.9,
      s: 0.19,
      bp: 2,
      bm: -1,
      bf: 0.4,
    },
    cyan: {
      c: 0.4,
      a1: 0.15,
      p1: 1,
      m1: 1,
      f1: 3.1,
      a2: 0.07,
      p2: 3,
      m2: 2,
      f2: 5.0,
      s: 0.2,
      bp: 3,
      bm: 1,
      bf: 2.6,
    },
    core: {
      c: 0.4,
      a1: 0.15,
      p1: 1,
      m1: 1,
      f1: 3.1,
      a2: 0.07,
      p2: 3,
      m2: 2,
      f2: 5.0,
      s: 0.055,
      bp: 2,
      bm: 1,
      bf: 4.4,
    },
  };
  type Rib = (typeof R)["cyan"];
  const ribbon = (r: Rib, x: number, y: number) => {
    const u = x / W;
    const yc =
      H *
      (r.c +
        r.a1 * Math.sin(TAU * (r.p1 * u - r.m1 * phi) + r.f1) +
        r.a2 * Math.sin(TAU * (r.p2 * u - r.m2 * phi) + r.f2));
    const sg = H * r.s * (0.8 + 0.25 * Math.sin(TAU * (r.p1 * u - r.m1 * phi + 0.25) + r.f2));
    const d = (y - yc) / sg;
    const prof = Math.exp(-d * d);
    const b = 0.5 + 0.5 * Math.sin(TAU * (r.bp * u - r.bm * phi) + r.bf);
    const bright = 0.18 + 0.82 * b * b * (3 - 2 * b); // أقصى 1، أدنى 0.18 — تدفّقٌ لا وميض
    // خطوط عمودية رقيقة جدًّا تعطي إحساس ستارة الشفق
    const ray = 0.95 + 0.05 * Math.sin(TAU * (5 * u - 1 * phi) + 3 * Math.sin(TAU * (2 * u + phi)));
    return prof * bright * ray;
  };

  const over = (i: number, r: number, g: number, b: number, a: number) => {
    // مصدر مستقيم (r,g,b,a) فوق الوجهة المسبقة الضرب في i
    const k = 1 - a;
    buf[i] = r * a + buf[i] * k;
    buf[i + 1] = g * a + buf[i + 1] * k;
    buf[i + 2] = b * a + buf[i + 2] * k;
    buf[i + 3] = a + buf[i + 3] * k;
  };

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    const env = sstep(0, 0.2, v) * sstep(1, 0.8, v); // يتلاشى عند الحدّين العلوي والسفلي
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      buf[i] = P.base[0] * P.baseA;
      buf[i + 1] = P.base[1] * P.baseA;
      buf[i + 2] = P.base[2] * P.baseA;
      buf[i + 3] = P.baseA;
      const xx = x + 0.5,
        yy = y + 0.5;
      const e = 0.35 + 0.65 * env;
      let w = ribbon(R.violet, xx, yy) * P.violetA * e;
      over(i, P.violet[0], P.violet[1], P.violet[2], w);
      w = ribbon(R.emerald, xx, yy) * P.emeraldA * e;
      over(i, P.emerald[0], P.emerald[1], P.emerald[2], w);
      w = ribbon(R.cyan, xx, yy) * P.cyanA * e;
      over(i, P.cyan[0], P.cyan[1], P.cyan[2], w);
      w = ribbon(R.core, xx, yy) * P.coreA * e;
      over(i, P.core[0], P.core[1], P.core[2], w);
    }
  }

  // خيوط البيانات: صفّ ثابت + حزم تتحرّك بسرعتين (بارالاكس): بعيدة = عرضٌ واحد/حلقة، قريبة = عرضان/حلقة
  const threads = [
    { y: 31.5, n: 1, len: 70, th: 0.95, a: 0.55, k: 2, seed: 11 },
    { y: 41.5, n: 2, len: 46, th: 1.1, a: 0.8, k: 2, seed: 23 },
    { y: 55.5, n: 1, len: 80, th: 0.95, a: 0.55, k: 1, seed: 37 },
    { y: 66.5, n: 2, len: 52, th: 1.1, a: 0.8, k: 2, seed: 41 },
  ];
  for (const t of threads) {
    const rnd = mulberry32(t.seed);
    const heads: number[] = [];
    for (let k = 0; k < t.k; k++) heads.push(rnd() * W);
    const y0 = Math.max(0, Math.floor(t.y - 4)),
      y1 = Math.min(H - 1, Math.ceil(t.y + 4));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - t.y) / t.th;
      const line = Math.exp(-dy * dy);
      if (line < 0.003) continue;
      const envY = sstep(0, 0.2, (y + 0.5) / H) * sstep(1, 0.8, (y + 0.5) / H);
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        let pk = 0;
        for (const h0 of heads) {
          const hx = h0 - t.n * W * phi; // يتحرّك يسارًا
          const d = wrap(x + 0.5 - hx); // d>0 ⇒ خلف الرأس (ذيل)
          pk += d >= 0 ? Math.exp(-d / t.len) : Math.exp(-(d * d) / 9);
        }
        const e = 0.5 + 0.5 * envY;
        const a = line * (P.threadA * t.a + P.packetA * t.a * Math.min(1, pk)) * e;
        const mix = Math.min(1, pk);
        over(
          i,
          P.thread[0] + (P.packet[0] - P.thread[0]) * mix,
          P.thread[1] + (P.packet[1] - P.thread[1]) * mix,
          P.thread[2] + (P.packet[2] - P.thread[2]) * mix,
          a,
        );
      }
    }
  }

  // بريق صغير يتلألأ ببطء: 22 نقطة بذرية، دورة أو دورتان في الحلقة (4–8 ث)
  const rs = mulberry32(2026);
  for (let s = 0; s < 22; s++) {
    const sx = rs() * W,
      sy = 22 + rs() * (H - 44),
      ph = rs() * TAU,
      cyc = rs() < 0.5 ? 1 : 2,
      size = 1.2 + rs() * 0.8;
    const tw = Math.pow(0.5 + 0.5 * Math.sin(TAU * cyc * phi + ph), 6);
    if (tw < 0.02) continue;
    const envY = sstep(0, 0.2, sy / H) * sstep(1, 0.8, sy / H);
    const amp = tw * (0.4 + 0.6 * envY);
    const x0 = Math.floor(sx) - 9,
      x1 = Math.floor(sx) + 9,
      y0 = Math.max(0, Math.floor(sy) - 6),
      y1 = Math.min(H - 1, Math.floor(sy) + 6);
    for (let y = y0; y <= y1; y++)
      for (let xr = x0; xr <= x1; xr++) {
        const x = ((xr % W) + W) % W;
        const dx = xr + 0.5 - sx,
          dy = y + 0.5 - sy;
        const core = Math.exp(-(dx * dx + dy * dy) / (2 * size * size));
        const halo = 0.16 * Math.exp(-(dx * dx + dy * dy) / (2 * 4.2 * 4.2));
        const arm =
          0.28 *
          (Math.exp(-(dy * dy) / 0.5 - Math.abs(dx) / 3.2) +
            Math.exp(-(dx * dx) / 0.5 - Math.abs(dy) / 2.4));
        const i = (y * W + x) * 4;
        const mixc = Math.min(1, core * 1.2);
        const cr = P.sparkHalo[0] + (P.spark[0] - P.sparkHalo[0]) * mixc;
        const cg = P.sparkHalo[1] + (P.spark[1] - P.sparkHalo[1]) * mixc;
        const cb = P.sparkHalo[2] + (P.spark[2] - P.sparkHalo[2]) * mixc;
        const a = Math.min(1, core + halo + arm) * P.sparkA * amp * (dark ? 1 : 0.85);
        if (a > 0.002) over(i, cr, cg, cb, a);
      }
  }
}

/** مخزن عائم → بايتات RGBA مستقيمة مع حبيبة حتمية ±1 مستوى (تكسر التدرّج). */
export function toBytes(
  theme: Theme,
  frame: number,
  buf: Float32Array,
  out: Uint8ClampedArray,
  grain = true,
) {
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    const a = buf[i + 3];
    // هاش صحيح حتميّ (مستقلّ عن الإطار ⇒ حبيبة ثابتة لا تومض)
    let h = (p * 374761393 + 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    const n = grain ? ((h & 0xff) / 255 - 0.5) * 2 : 0; // [-1,1]
    const inv = a > 1e-4 ? 1 / a : 0;
    out[i] = Math.round(Math.min(1, buf[i] * inv) * 255 + n * 0.9);
    out[i + 1] = Math.round(Math.min(1, buf[i + 1] * inv) * 255 + n * 0.9);
    out[i + 2] = Math.round(Math.min(1, buf[i + 2] * inv) * 255 + n * 0.9);
    out[i + 3] = a < 0.002 ? 0 : Math.round(Math.min(1, a) * 255 + n * 0.6);
  }
}
