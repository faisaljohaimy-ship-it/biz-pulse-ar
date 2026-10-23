/**
 * كاميرا مدارية سينمائية: هدفٌ وسمتٌ وارتفاعٌ زاويّ وبُعدٌ وبُؤرة ولفّ.
 * القنوات التسع تُستكمل بين مفاتيح الزمن بمنحنى هيرميت أحاديّ الرتابة
 * (فريتش–كارلسون): لا تجاوز ولا ارتداد، وتسارعٌ وتباطؤٌ طبيعيّان عند
 * القمم، وسرعةٌ صفريّة عند الطرفين (يبدأ الفيلم ساكنًا ويقف ساكنًا).
 */
import { TWIN_T } from "../timeline";
import { HUBS } from "./map";
import { clamp01, noise1, type V3 } from "./math";

export interface CamKey {
  t: number;
  tx: number;
  ty: number;
  tz: number;
  /** السمت بالدرجات: 0 = الكاميرا جنوب الهدف تنظر شمالًا. */
  az: number;
  /** الارتفاع الزاويّ بالدرجات. */
  el: number;
  dist: number;
  /** البعد البؤري بالبكسل (على عرض 1280). */
  focal: number;
  roll: number;
}

export interface CamState {
  tx: number;
  ty: number;
  tz: number;
  az: number;
  el: number;
  dist: number;
  focal: number;
  roll: number;
}

const CH = ["tx", "ty", "tz", "az", "el", "dist", "focal", "roll"] as const;

/** مماسّات فريتش–كارلسون لقناة واحدة على عُقد زمنٍ غير منتظمة. */
function tangents(ts: number[], ys: number[]): number[] {
  const n = ts.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i += 1) d.push((ys[i + 1] - ys[i]) / (ts[i + 1] - ts[i]));
  const m: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i += 1) {
    if (d[i - 1] * d[i] <= 0) {
      m[i] = 0;
    } else {
      const h0 = ts[i] - ts[i - 1];
      const h1 = ts[i + 1] - ts[i];
      const w1 = 2 * h1 + h0;
      const w2 = h1 + 2 * h0;
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  m[0] = 0;
  m[n - 1] = 0;
  return m;
}

export function buildPath(keys: CamKey[]): (t: number) => CamState {
  const ts = keys.map((k) => k.t);
  const tan: Record<string, number[]> = {};
  for (const c of CH)
    tan[c] = tangents(
      ts,
      keys.map((k) => k[c]),
    );
  return (t: number): CamState => {
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1].t) i += 1;
    const k0 = keys[i];
    const k1 = keys[i + 1];
    const h = k1.t - k0.t;
    const u = clamp01((t - k0.t) / h);
    const u2 = u * u;
    const u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    const out = {} as CamState;
    for (const c of CH) {
      out[c] = h00 * k0[c] + h10 * h * tan[c][i] + h01 * k1[c] + h11 * h * tan[c][i + 1];
    }
    return out;
  };
}

export interface View {
  px: number;
  py: number;
  pz: number;
  rx: number;
  ry: number;
  rz: number;
  ux: number;
  uy: number;
  uz: number;
  fx: number;
  fy: number;
  fz: number;
  focal: number;
  cx: number;
  cy: number;
  near: number;
}

const D2R = Math.PI / 180;

export function makeView(s: CamState, w: number, h: number): View {
  const az = s.az * D2R;
  const el = s.el * D2R;
  const ce = Math.cos(el);
  const px = s.tx + s.dist * Math.sin(az) * ce;
  const py = s.ty - s.dist * Math.cos(az) * ce;
  const pz = s.tz + s.dist * Math.sin(el);
  // الأمام: من الكاميرا إلى الهدف
  let fx = s.tx - px;
  let fy = s.ty - py;
  let fz = s.tz - pz;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // اليمين = الأمام × الأعلى العالمي
  let rx = fy * 1 - fz * 0;
  let ry = fz * 0 - fx * 1;
  let rz = 0;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl;
  ry /= rl;
  rz /= rl;
  // الأعلى = اليمين × الأمام
  let ux = ry * fz - rz * fy;
  let uy = rz * fx - rx * fz;
  let uz = rx * fy - ry * fx;
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul;
  uy /= ul;
  uz /= ul;
  // لفّ حول المحور الأمامي
  const rr = s.roll * D2R;
  if (rr !== 0) {
    const c = Math.cos(rr);
    const sn = Math.sin(rr);
    const nrx = rx * c + ux * sn;
    const nry = ry * c + uy * sn;
    const nrz = rz * c + uz * sn;
    const nux = ux * c - rx * sn;
    const nuy = uy * c - ry * sn;
    const nuz = uz * c - rz * sn;
    rx = nrx;
    ry = nry;
    rz = nrz;
    ux = nux;
    uy = nuy;
    uz = nuz;
  }
  const scale = w / 1280;
  return {
    px,
    py,
    pz,
    rx,
    ry,
    rz,
    ux,
    uy,
    uz,
    fx,
    fy,
    fz,
    focal: s.focal * scale,
    cx: w / 2,
    cy: h / 2,
    near: 0.02,
  };
}

export interface P2 {
  x: number;
  y: number;
  /** العمق في فضاء الكاميرا. */
  d: number;
  /** بكسل لكل وحدة عالم عند هذه النقطة. */
  k: number;
}

/** إسقاط نقطة؛ يُرجع null خلف مستوى القصّ القريب. */
export function proj(v: View, x: number, y: number, z: number): P2 | null {
  const dx = x - v.px;
  const dy = y - v.py;
  const dz = z - v.pz;
  const d = dx * v.fx + dy * v.fy + dz * v.fz;
  if (d < v.near) return null;
  const k = v.focal / d;
  return {
    x: v.cx + (dx * v.rx + dy * v.ry + dz * v.rz) * k,
    y: v.cy - (dx * v.ux + dy * v.uy + dz * v.uz) * k,
    d,
    k,
  };
}

/** إسقاط قطعة مع قصّها على المستوى القريب. */
export function projSeg(v: View, a: V3, b: V3): [P2, P2] | null {
  const da = (a.x - v.px) * v.fx + (a.y - v.py) * v.fy + (a.z - v.pz) * v.fz;
  const db = (b.x - v.px) * v.fx + (b.y - v.py) * v.fy + (b.z - v.pz) * v.fz;
  if (da < v.near && db < v.near) return null;
  let ax = a.x;
  let ay = a.y;
  let az = a.z;
  let bx = b.x;
  let by = b.y;
  let bz = b.z;
  if (da < v.near) {
    const t = (v.near - da) / (db - da);
    ax = a.x + (b.x - a.x) * t;
    ay = a.y + (b.y - a.y) * t;
    az = a.z + (b.z - a.z) * t;
  } else if (db < v.near) {
    const t = (v.near - db) / (da - db);
    bx = b.x + (a.x - b.x) * t;
    by = b.y + (a.y - b.y) * t;
    bz = b.z + (a.z - b.z) * t;
  }
  const pa = proj(v, ax, ay, az);
  const pb = proj(v, bx, by, bz);
  if (!pa || !pb) return null;
  return [pa, pb];
}

export function viewPos(v: View): V3 {
  return { x: v.px, y: v.py, z: v.pz };
}

/* ── مسار الفيلم ────────────────────────────────────────────────────── */

/** الموضع العالمي للمنصّة الشرقية وارتفاع سطحها — تُحسب في scene؛ هنا ثوابت الكاميرا. */
export const HUB_E = HUBS.eastern;
export const SLAB_H = 0.55;
const z0 = SLAB_H;

const K = (
  t: number,
  tx: number,
  ty: number,
  tz: number,
  az: number,
  el: number,
  dist: number,
  focal = 1000,
  roll = 0,
): CamKey => ({ t, tx, ty, tz, az, el, dist, focal, roll });

export const CAM_KEYS: CamKey[] = [
  // ① الظلام والشرارة: كاميرا منخفضة تنظر إلى الأفق، دفعٌ بطيء
  K(0.0, 0, 0, 0.0, 0, 3.0, 46, 1040),
  K(2.0, 0, 0, 0.0, 0, 3.6, 39, 1040),
  K(4.0, 0, 0, 0.0, -3, 12, 33, 1010),
  // ② رافعة: من الأفق إلى الإطلالة الجوّية على المملكة
  K(6.0, 0, -0.2, 0.1, -10, 38, 29, 1000),
  K(8.0, 0.3, -1.0, 0.5, -4, 54, 29, 1000, 0.5),
  K(10.0, 1.0, -1.2, 0.6, 3, 55, 27.5, 1000, 0),
  // ③ الانقضاض نحو المنصّة الشرقية: انعطافةٌ على شكل S ثم هبوطٌ ناعم
  K(10.9, 4.2, -1.4, 0.55, 22, 41, 9.8, 1000, -1.4),
  K(11.9, HUB_E.x - 0.05, HUB_E.y + 0.05, z0 + 0.25, -2, 22, 3.4, 1000, 1.0),
  K(13.2, HUB_E.x - 0.1, HUB_E.y, z0 + 0.15, -28, 13, 1.6, 1000, 0.5),
  // مسار الدوران حول المنشأة أثناء المسح
  K(15.2, HUB_E.x + 0.04, HUB_E.y + 0.03, z0 + 0.17, -4, 16, 1.5, 1000, -0.6),
  K(17.0, HUB_E.x + 0.08, HUB_E.y, z0 + 0.2, 22, 21, 1.8, 1000, 0),
  // ④ سريان البيانات: دورانٌ أوسع وخفضٌ ثم صعودٌ مع الشعاع
  K(18.2, HUB_E.x + 0.04, HUB_E.y + 0.06, z0 + 0.2, 36, 25, 1.62, 1000, 0.5),
  K(19.4, HUB_E.x - 0.02, HUB_E.y + 0.1, z0 + 0.3, 50, 19, 1.9, 1000, -0.3),
  K(20.6, HUB_E.x, HUB_E.y + 0.1, z0 + 0.65, 46, 13, 2.6, 1000, 0),
  K(22.0, HUB_E.x - 0.1, HUB_E.y + 0.1, z0 + 2.2, 36, 6, 3.4, 1000, -0.8),
  // ⑤ الارتداد إلى الشبكة الوطنية
  K(23.6, 3.4, -1.2, 2.4, 22, 20, 12, 1000, 1.0),
  K(25.2, 0.6, -0.9, 1.8, 8, 40, 26, 1000, 0),
  K(27.0, 0.1, -0.7, 1.6, -4, 51, 29.5, 1000, 0),
  // ⑥ الاستقرار
  K(28.4, 0.0, -0.6, 1.4, -6, 52, 29.5, 1000, 0),
  K(30.0, 0.0, -0.6, 1.4, -6, 52, 29.5, 1000, 0),
];

export const camPath = buildPath(CAM_KEYS);

/** تمايلٌ يدويّ خفيف — ضجيجٌ ناعم يخبو إلى الصفر مع استقرار الكاميرا. */
export function handheld(t: number, s: CamState): CamState {
  const rest = 1 - clamp01((t - 26.5) / (TWIN_T.camRest - 26.5));
  const near = clamp01(1.2 / Math.max(s.dist, 0.1));
  const amp = (0.35 + 0.65 * near) * rest;
  const out = { ...s };
  out.az += noise1(t * 0.31, 11) * 0.9 * amp;
  out.el += noise1(t * 0.27, 23) * 0.55 * amp;
  out.roll += noise1(t * 0.23, 37) * 0.28 * amp;
  const q = s.dist * 0.0016 * amp;
  out.tx += noise1(t * 0.41, 41) * q;
  out.ty += noise1(t * 0.37, 53) * q;
  out.tz += noise1(t * 0.43, 67) * q * 0.7;
  return out;
}

/** ارتجاجٌ خفيف مخمَّد على النبضات المفصلية. */
const KICKS: { t: number; amp: number }[] = [
  { t: TWIN_T.rise.central, amp: 0.5 },
  { t: TWIN_T.rise.western, amp: 0.4 },
  { t: TWIN_T.rise.eastern, amp: 0.55 },
  { t: TWIN_T.rise.southern, amp: 0.4 },
  { t: 17.0, amp: 0.7 },
  { t: TWIN_T.uplink, amp: 0.6 },
  { t: TWIN_T.shock, amp: 1.0 },
];

export function kick(t: number, s: CamState): CamState {
  let k = 0;
  for (const e of KICKS) {
    const dt = t - e.t;
    if (dt > 0 && dt < 0.9) k += e.amp * Math.exp(-dt * 7.5) * Math.sin(dt * 2 * Math.PI * 5.5);
  }
  if (k === 0) return s;
  const out = { ...s };
  out.el += k * 0.22;
  out.az += k * 0.1;
  out.dist *= 1 - k * 0.0035;
  return out;
}
