/**
 * S4 — التوأم الرقمي (38–50 ث). الصور الثلاث (07 · 09 · 12) مولَّدةٌ بالذكاء الاصطناعي وفيها خطوط التوأم المضيئة
 * أصلًا؛ المضاف رسومٌ رقيقة: مسحٌ بيضاويّ يكشف الشبكة (الصورة تُعتَّم وتُنزَع ألوانها ثم تعود بالمسح)، حسّاسات
 * تنبض بالترتيب من 41.0 كلّ 0.22 ث، إنذارٌ على عقدةٍ في المحوّل (كهرمانيّ مثلّث 44.0 ← أحمر مثمّن 45.0 مع خطّ إنذار) ثم
 * مساراتٌ منقّطٌ يرسمه التوأم من علامة الحارس إلى العقدة (46.0) حتى تعود خضراء (دائرة ✓ عند 48.0).
 * الشكل لا اللون وحده: دائرة = سليم · مثلّث = تحذير · مثمّن = خطر. بلا أرقامٍ ولا نصوص.
 */
import React from "react";
import { clamp, easeInOut, easeOut, lerp, prog } from "../kit/ease";
import {
  camAt,
  DangerMark,
  OkMark,
  Over,
  PlateImg,
  Ring,
  Screen,
  Streak,
  at,
  toScreen,
  trace,
  traceOf,
  view,
  WarnMark,
  World,
  type CamKey,
  type Pt,
} from "../kit";
import { C } from "../palette";

/* ───────── 38–41 كشف الشبكة (07) ───────── */
export const S4_REVEAL_KEYS: ReadonlyArray<CamKey> = [
  [37.0, 836, 470, 1.0],
  [41.6, 900, 470, 1.1],
];
const REVEAL = { a: 38.9, b: 41.0, cx: 1040, cy: 520 };
export const S4Reveal: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S4_REVEAL_KEYS, t));
  const p = easeInOut(prog(t, REVEAL.a, REVEAL.b));
  const rx = p * 1750;
  const ry = p * 820;
  const mask = `radial-gradient(ellipse ${rx * v.k}px ${ry * v.k}px at ${REVEAL.cx * v.k}px ${REVEAL.cy * v.k}px, #000 62%, rgba(0,0,0,0) 100%)`;
  const dim = "grayscale(0.88) brightness(0.5) contrast(0.95)";
  return (
    <World v={v}>
      <PlateImg file="p07.jpg" filter={dim} />
      <PlateImg file="p07.jpg" mask={p > 0 ? mask : "linear-gradient(transparent, transparent)"} />
      <PlateImg file="p07-glow.jpg" blend="screen" opacity={0.28 * p} />
      <Over blend="screen">
        {p > 0 && p < 1 && (
          <g opacity={1 - prog(t, 40.8, 41.2)}>
            <ellipse
              cx={REVEAL.cx}
              cy={REVEAL.cy}
              rx={rx}
              ry={ry}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={10 / v.k}
              opacity={0.15}
            />
            <ellipse
              cx={REVEAL.cx}
              cy={REVEAL.cy}
              rx={rx}
              ry={ry}
              fill="none"
              stroke="#bff7ff"
              strokeWidth={1.8 / v.k}
              opacity={0.9}
            />
          </g>
        )}
      </Over>
    </World>
  );
};

/* ───────── 41–44 الحسّاسات تنبض (09) ───────── */
export const S4_PING_KEYS: ReadonlyArray<CamKey> = [
  [40.4, 836, 470, 1.0],
  [44.4, 790, 500, 1.1],
];
/** عُقَد الحسّاسات بترتيب النبض (بكسلات المصدر). */
const NODES09: ReadonlyArray<readonly [number, number]> = [
  [234, 263],
  [511, 211],
  [700, 116],
  [737, 242],
  [674, 442],
  [1116, 526],
  [1389, 158],
  [244, 558],
  [611, 737],
  [1207, 608],
];
export const S4Ping: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S4_PING_KEYS, t));
  return (
    <World v={v}>
      <PlateImg file="p09.jpg" />
      <PlateImg file="p09-glow.jpg" blend="screen" opacity={0.22} />
      <Over blend="screen">
        {NODES09.map((n, i) => {
          if (i === 0) return null;
          const t0 = 41.0 + i * 0.22;
          const a = NODES09[i - 1];
          const u = easeOut(prog(t, t0 - 0.05, t0 + 0.3));
          return (
            <line
              key={`l${i}`}
              x1={a[0]}
              y1={a[1]}
              x2={lerp(a[0], n[0], u)}
              y2={lerp(a[1], n[1], u)}
              stroke="#9defff"
              strokeWidth={1.2 / v.k}
              strokeDasharray={`${6 / v.k} ${5 / v.k}`}
              opacity={0.5 * clamp(1 - (t - 43.9) / 0.5)}
            />
          );
        })}
        {NODES09.map((n, i) => {
          const t0 = 41.0 + i * 0.22;
          const on = easeOut(prog(t, t0, t0 + 0.25));
          return (
            <g key={i}>
              <Ring
                x={n[0]}
                y={n[1]}
                r0={8}
                r1={78}
                p={(t - t0) / 0.95}
                px={1.9}
                k={v.k}
                color="#9defff"
              />
              <g opacity={on * clamp(1 - (t - 43.9) / 0.5)}>
                <circle cx={n[0]} cy={n[1]} r={15 / v.k} fill="rgba(34,211,238,0.16)" />
                <circle
                  cx={n[0]}
                  cy={n[1]}
                  r={9 / v.k}
                  fill="none"
                  stroke="#9defff"
                  strokeWidth={2 / v.k}
                />
                <circle cx={n[0]} cy={n[1]} r={3 / v.k} fill="#fff" />
              </g>
            </g>
          );
        })}
      </Over>
    </World>
  );
};

/* ───────── 44–50 إنذار وتوجيه (12) ───────── */
export const S4_ALERT_KEYS: ReadonlyArray<CamKey> = [
  [43.4, 900, 520, 1.12],
  [50.8, 900, 500, 1.04],
];
const NODE = { x: 1160, y: 560 };
const GUARD1 = { x: 640, y: 690 };
const ALERT_LINE = traceOf(
  [
    [NODE.x, NODE.y],
    [1010, 560],
    [850, 590],
    [700, 610],
    [650, 600],
  ],
  10,
);
const GUIDE = traceOf(
  [
    [GUARD1.x, GUARD1.y],
    [720, 645],
    [830, 618],
    [940, 612],
    [1040, 625],
    [1110, 632],
    [1160, 628],
  ],
  12,
);
const pathD = (pts: Pt[]) =>
  pts.map((q, j) => `${j ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join("");

const RingS: React.FC<{
  x: number;
  y: number;
  p: number;
  color: string;
  r0?: number;
  r1?: number;
  w?: number;
}> = ({ x, y, p, color, r0 = 22, r1 = 78, w = 2 }) => {
  if (p <= 0 || p >= 1) return null;
  const r = lerp(r0, r1, 1 - Math.pow(1 - p, 2));
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={w}
      opacity={0.8 * (1 - p) * Math.min(1, p * 6)}
    />
  );
};

export const S4Alert: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S4_ALERT_KEYS, t));
  const fs: "ok0" | "warn" | "danger" | "ok" =
    t < 44.0 ? "ok0" : t < 45.0 ? "warn" : t < 48.0 ? "danger" : "ok";
  const np = toScreen(v, NODE.x, NODE.y);
  const pulse = 0.5 + 0.5 * Math.sin(t * 9);
  const alertP = easeInOut(prog(t, 45.0, 45.7));
  const alertFade = 1 - easeInOut(prog(t, 48.0, 48.5));
  const guideP = easeInOut(prog(t, 46.0, 47.95));
  const guideFade = 1 - prog(t, 48.8, 49.4);
  const mk = at(GUIDE, GUIDE.total * clamp((t - 46.3) / 1.7));
  const mp = toScreen(v, mk.x, mk.y);
  const mOn = easeOut(prog(t, 46.0, 46.35));
  const mOut = 1 - prog(t, 49.0, 49.6);
  // نقاط التوجيه
  const N = 36;
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    if (u > guideP) break;
    const q = at(GUIDE, u * GUIDE.total);
    const fresh = clamp(1 - (guideP - u) * 5);
    dots.push(
      <circle
        key={`g${i}`}
        cx={q.x}
        cy={q.y}
        r={(8 + fresh * 4) / v.k}
        fill="#7ae8f7"
        opacity={0.18 + 0.25 * fresh}
      />,
    );
    dots.push(
      <circle
        key={`d${i}`}
        cx={q.x}
        cy={q.y}
        r={(3.4 + fresh * 2) / v.k}
        fill="#e8fdff"
        opacity={0.9}
      />,
    );
  }
  return (
    <>
      <World v={v}>
        <PlateImg file="p12.jpg" />
        <PlateImg file="p12-glow.jpg" blend="screen" opacity={0.22} />
        <Over>
          {alertP > 0 && (
            <g opacity={alertFade}>
              <path
                d={pathD(ALERT_LINE.pts)}
                fill="none"
                stroke="#ff4d4d"
                strokeWidth={7 / v.k}
                opacity={0.18 * alertP}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={pathD(ALERT_LINE.pts)}
                fill="none"
                stroke="#ff8a8a"
                strokeWidth={2.4 / v.k}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={`${alertP} 1`}
                opacity={0.9}
              />
              {Array.from({ length: 6 }, (_, i) => (
                <Streak
                  key={i}
                  tr={ALERT_LINE}
                  head={(t - (45.0 + i * 0.5)) * 520}
                  tail={170}
                  px={3.4}
                  k={v.k}
                  color="#ff5c5c"
                  alpha={1}
                />
              ))}
            </g>
          )}
          {guideP > 0 && <g opacity={guideFade}>{dots}</g>}
        </Over>
      </World>
      <Screen>
        {fs === "warn" && (
          <>
            <circle cx={np.x} cy={np.y} r={36 + pulse * 6} fill="rgba(245,158,11,0.13)" />
            <WarnMark
              x={np.x}
              y={np.y - 2}
              r={30}
              color={C.amber}
              p={prog(t, 44.0, 44.3)}
              pulse={pulse}
            />
          </>
        )}
        {fs === "danger" && (
          <>
            <circle cx={np.x} cy={np.y} r={48 + pulse * 8} fill="rgba(239,68,68,0.15)" />
            <DangerMark
              x={np.x}
              y={np.y}
              r={31}
              color={C.danger}
              p={prog(t, 45.0, 45.25)}
              pulse={pulse}
            />
          </>
        )}
        {fs === "ok" && (
          <OkMark x={np.x} y={np.y} r={29} color={C.emerald} p={prog(t, 48.0, 48.4)} fill={0.34} />
        )}
        {[0, 1].map((i) => (
          <RingS key={`w${i}`} x={np.x} y={np.y} p={(t - (44.0 + i * 0.5)) / 0.9} color={C.amber} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <RingS
            key={`d${i}`}
            x={np.x}
            y={np.y}
            p={(t - (45.0 + i * 0.5)) / 0.9}
            color={C.danger}
          />
        ))}
        <RingS x={np.x} y={np.y} p={(t - 48.0) / 1.0} color={C.emerald} r1={96} />
        {/* علامة الحارس على التوأم: دبّوسٌ ضوئيّ (ليست شخصًا) */}
        {mOn > 0 && mOut > 0 && (
          <g opacity={mOn * mOut}>
            <circle cx={mp.x} cy={mp.y} r={20 + 3 * pulse} fill="rgba(34,211,238,0.18)" />
            <circle
              cx={mp.x}
              cy={mp.y}
              r={11}
              fill="rgba(4,14,30,0.7)"
              stroke="#9defff"
              strokeWidth={2.2}
            />
            <circle cx={mp.x} cy={mp.y} r={4} fill="#fff" />
            {[0, 1, 2].map((i) => (
              <RingS
                key={`r${i}`}
                x={mp.x}
                y={mp.y}
                p={(t - (48.1 + i * 0.4)) / 1.0}
                color="#bff7ff"
                r0={18}
                r1={70}
                w={1.6}
              />
            ))}
          </g>
        )}
      </Screen>
    </>
  );
};
void trace;
