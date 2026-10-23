/**
 * أدوات الأثر الضوئي والـHUD: مساراتٌ ناعمة (كاتمول-روم) بقياس الطول، نبضاتٌ ساطعة على المسار
 * (ثلاث طبقاتٍ بلا مرشّح ضبابية: هالة واسعة ← هالة ← قلبٌ أبيض)، لمعاتٌ نجمية، حلقات، ومخطّطات
 * الأشكال الدلالية (دائرة ✓ = سليم · مثلّث = تحذير · مثمّن = خطر). كلّ دالّةٍ نقيّةٌ في `t`.
 */
import React from "react";
import { clamp, hash1, lerp } from "./ease";

export interface Pt {
  x: number;
  y: number;
}
export type Tr = { pts: Pt[]; lens: number[]; total: number };

/** كاتمول-روم عبر نقاطٍ (per عيّنةً لكلّ مقطع). */
export function spline(points: ReadonlyArray<readonly [number, number]>, per = 14): Pt[] {
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
      out.push({ x: c(p0[0], p1[0], p2[0], p3[0]), y: c(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  const last = points[points.length - 1];
  out.push({ x: last[0], y: last[1] });
  return out;
}

export function trace(pts: Pt[]): Tr {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, lens, total: lens[lens.length - 1] };
}

export const traceOf = (points: ReadonlyArray<readonly [number, number]>, per = 14): Tr =>
  trace(spline(points, per));

/** النقطة عند طولٍ مطلق s. */
export function at(tr: Tr, s: number): Pt {
  const target = clamp(s, 0, tr.total);
  let i = 1;
  while (i < tr.lens.length - 1 && tr.lens[i] < target) i++;
  const f = (target - tr.lens[i - 1]) / (tr.lens[i] - tr.lens[i - 1] || 1);
  return {
    x: lerp(tr.pts[i - 1].x, tr.pts[i].x, f),
    y: lerp(tr.pts[i - 1].y, tr.pts[i].y, f),
  };
}

/** المسار الجزئيّ بين طولين كسلسلة نقاطٍ. */
export function slice(tr: Tr, s0: number, s1: number): Pt[] {
  const a = clamp(Math.min(s0, s1), 0, tr.total);
  const b = clamp(Math.max(s0, s1), 0, tr.total);
  const out: Pt[] = [at(tr, a)];
  for (let i = 0; i < tr.pts.length; i++) {
    if (tr.lens[i] > a && tr.lens[i] < b) out.push(tr.pts[i]);
  }
  out.push(at(tr, b));
  return out;
}

export const d = (pts: Pt[]): string =>
  pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");

/**
 * نبضةٌ ضوئية تجري على مسار: الرأس عند الطول `head` وذيلٌ بطول `tail` (وحدات المصدر)، عرضها
 * `px` بكسل شاشة (تُقسَم على k فتبقى رقيقةً مهما بلغ التكبير). الذيل يخبو بتقطيعه إلى مقاطع.
 * `occlude`: مجالات x يخفت فيها اللمعان (خلف جسم برج).
 */
export const Streak: React.FC<{
  tr: Tr;
  head: number;
  tail: number;
  px: number;
  k: number;
  color?: string;
  alpha?: number;
  /** معامل عرضٍ بحسب x (المنظور: الأبعد أرقّ). */
  persp?: (x: number) => number;
  occlude?: ReadonlyArray<readonly [number, number]>;
}> = ({ tr, head, tail, px, k, color = "#7ae8f7", alpha = 1, persp, occlude }) => {
  if (head < 0 || head - tail > tr.total || alpha <= 0.003) return null;
  const SEG = 8;
  const els: React.ReactNode[] = [];
  for (let i = 0; i < SEG; i++) {
    const s1 = head - (tail * i) / SEG;
    const s0 = head - (tail * (i + 1)) / SEG;
    if (s1 < 0 || s0 > tr.total) continue;
    const pts = slice(tr, s0, s1);
    if (pts.length < 2) continue;
    const mid = pts[Math.floor(pts.length / 2)];
    const f = persp ? persp(mid.x) : 1;
    let a = alpha * Math.pow(1 - i / SEG, 1.6);
    if (occlude) for (const [x0, x1] of occlude) if (mid.x > x0 && mid.x < x1) a *= 0.28;
    const w = (px * f) / k;
    const path = d(pts);
    els.push(
      <g key={i}>
        <path
          d={path}
          stroke={color}
          strokeWidth={w * 5.2}
          opacity={a * 0.16}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={path}
          stroke={color}
          strokeWidth={w * 2.4}
          opacity={a * 0.45}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={path}
          stroke="#ffffff"
          strokeWidth={w * 0.9}
          opacity={a * 0.95}
          fill="none"
          strokeLinecap="round"
        />
      </g>,
    );
  }
  // لمعة الرأس
  const h = at(tr, head);
  const f = persp ? persp(h.x) : 1;
  let ha = alpha;
  if (occlude) for (const [x0, x1] of occlude) if (h.x > x0 && h.x < x1) ha *= 0.28;
  els.push(
    <g key="h">
      <circle cx={h.x} cy={h.y} r={(px * 3.1 * f) / k} fill={color} opacity={ha * 0.22} />
      <circle cx={h.x} cy={h.y} r={(px * 1.5 * f) / k} fill="#fff" opacity={ha * 0.9} />
    </g>,
  );
  return <>{els}</>;
};

/** لمعة نجميّة رباعية الرؤوس (مصدرها بكسلات المصدر؛ r بكسل شاشة). */
export const Glint: React.FC<{
  x: number;
  y: number;
  r: number;
  k: number;
  amount: number;
  rot?: number;
  color?: string;
}> = ({ x, y, r, k, amount, rot = 0, color = "#d9f7ff" }) => {
  if (amount <= 0.01) return null;
  const R = (r * amount) / k;
  const w = R * 0.085;
  const diamond = (len: number) => `M${-len},0 L0,${-w} L${len},0 L0,${w} Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} style={{ mixBlendMode: "screen" }}>
      <circle r={R * 0.42} fill={color} opacity={0.16 * amount} />
      <path d={diamond(R)} fill={color} opacity={0.9 * amount} />
      <path d={diamond(R)} fill={color} opacity={0.9 * amount} transform="rotate(90)" />
      <path d={diamond(R * 0.55)} fill="#fff" opacity={0.8 * amount} transform="rotate(45)" />
      <path d={diamond(R * 0.55)} fill="#fff" opacity={0.8 * amount} transform="rotate(135)" />
      <circle r={R * 0.1} fill="#fff" opacity={amount} />
    </g>
  );
};

/** حلقةٌ تتّسع وتخبو (p ∈ 0..1). */
export const Ring: React.FC<{
  x: number;
  y: number;
  r0: number;
  r1: number;
  p: number;
  px: number;
  k: number;
  color: string;
  a?: number;
}> = ({ x, y, r0, r1, p, px, k, color, a = 0.9 }) => {
  if (p <= 0 || p >= 1) return null;
  const r = lerp(r0, r1, 1 - Math.pow(1 - p, 2.2));
  return (
    <circle
      cx={x}
      cy={y}
      r={r / k}
      fill="none"
      stroke={color}
      strokeWidth={px / k}
      opacity={a * (1 - p) * Math.min(1, p * 8)}
    />
  );
};

/* ───────── أشكال الحالة (إحداثيات الشاشة — وحدات بكسل) ───────── */

/** دائرة ✓ = سليم. */
export const OkMark: React.FC<{
  x: number;
  y: number;
  r: number;
  color: string;
  p?: number;
  fill?: number;
}> = ({ x, y, r, color, p = 1, fill = 0.22 }) => (
  <g opacity={clamp(p * 1.2)} transform={`translate(${x} ${y}) scale(${0.7 + 0.3 * clamp(p)})`}>
    <circle r={r} fill={color} opacity={fill} />
    <circle r={r} fill="none" stroke={color} strokeWidth={Math.max(1.6, r * 0.12)} />
    <path
      d={`M${-r * 0.42},${r * 0.02} L${-r * 0.1},${r * 0.34} L${r * 0.46},${-r * 0.32}`}
      fill="none"
      stroke="#fff"
      strokeWidth={Math.max(1.8, r * 0.16)}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={r * 2}
      strokeDashoffset={(1 - clamp(p * 1.4 - 0.2)) * r * 2}
    />
  </g>
);

/** مثلّث ⚠ = تحذير (حافّة مستديرة قليلًا، علامة تعجّب مرسومة بخطّ ونقطة لا نصّ). */
export const WarnMark: React.FC<{
  x: number;
  y: number;
  r: number;
  color: string;
  p?: number;
  pulse?: number;
}> = ({ x, y, r, color, p = 1, pulse = 0 }) => {
  const pts = [0, 1, 2].map((i) => {
    const a = (-90 + i * 120) * (Math.PI / 180);
    return [Math.cos(a) * r, Math.sin(a) * r + r * 0.12] as const;
  });
  const path = `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]} L${pts[2][0]},${pts[2][1]} Z`;
  return (
    <g
      opacity={clamp(p * 1.2)}
      transform={`translate(${x} ${y}) scale(${(0.7 + 0.3 * clamp(p)) * (1 + pulse * 0.06)})`}
    >
      <path d={path} fill={color} opacity={0.24} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(1.8, r * 0.14)}
        strokeLinejoin="round"
      />
      <path
        d={`M0,${-r * 0.28} L0,${r * 0.22}`}
        stroke="#fff"
        strokeWidth={Math.max(1.8, r * 0.16)}
        strokeLinecap="round"
      />
      <circle cx={0} cy={r * 0.5} r={Math.max(1.4, r * 0.09)} fill="#fff" />
    </g>
  );
};

/** مثمّن = خطر (علامة تعجّب مرسومة). */
export const DangerMark: React.FC<{
  x: number;
  y: number;
  r: number;
  color: string;
  p?: number;
  pulse?: number;
}> = ({ x, y, r, color, p = 1, pulse = 0 }) => {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (22.5 + i * 45) * (Math.PI / 180);
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  });
  const path = `M${pts.join(" L")} Z`;
  return (
    <g
      opacity={clamp(p * 1.2)}
      transform={`translate(${x} ${y}) scale(${(0.7 + 0.3 * clamp(p)) * (1 + pulse * 0.08)})`}
    >
      <path d={path} fill={color} opacity={0.3} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(1.8, r * 0.14)}
        strokeLinejoin="round"
      />
      <path
        d={`M0,${-r * 0.5} L0,${r * 0.12}`}
        stroke="#fff"
        strokeWidth={Math.max(2, r * 0.17)}
        strokeLinecap="round"
      />
      <circle cx={0} cy={r * 0.44} r={Math.max(1.5, r * 0.1)} fill="#fff" />
    </g>
  );
};

/** أقواس HUD في زوايا مستطيل (إحداثيات الشاشة). */
export const Brackets: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  len: number;
  stroke: number;
  color: string;
  opacity?: number;
}> = ({ x, y, w, h, len, stroke, color, opacity = 1 }) => {
  const L = Math.min(len, w / 2, h / 2);
  const c = (px: number, py: number, sx: number, sy: number) =>
    `M${px},${py + sy * L} L${px},${py} L${px + sx * L},${py}`;
  return (
    <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="square" opacity={opacity}>
      <path d={c(x, y, 1, 1)} />
      <path d={c(x + w, y, -1, 1)} />
      <path d={c(x, y + h, 1, -1)} />
      <path d={c(x + w, y + h, -1, -1)} />
    </g>
  );
};

/** موجة ضوضاء ناعمة حتمية لمخطّطات الخطّ. */
export const wave = (x: number, seed: number): number =>
  0.55 * Math.sin(x * 1.0 + seed * 3.1) +
  0.3 * Math.sin(x * 2.3 + seed * 1.7) +
  0.15 * Math.sin(x * 5.1 + hash1(seed) * 6);
