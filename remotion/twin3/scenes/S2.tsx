/**
 * S2 — مسار الطاقة (8–24 ث): توليد ← رفع الجهد ← نقل ← خفض الجهد ← توزيع. لقطات: 03 · 17 · 19 · 16 · 03 · 17.
 * الأثر الضوئي (نبضاتٌ على الأسلاك المرئية، لمعاتٌ نجمية، حلقات، موجة إضاءة) يُرسم في إحداثيات الصورة فيلتصق
 * بمنشآته؛ مسارات الأسلاك موضوعةٌ يدويًّا (data/paths.ts). نبضةٌ كلّ نصف ثانية على إيقاع الموسيقى.
 */
import React from "react";
import { clamp, easeInOut, easeOut, prog } from "../kit/ease";
import {
  camAt,
  Glint,
  OkMark,
  Over,
  PlateImg,
  Ring,
  Screen,
  Streak,
  toScreen,
  view,
  World,
  type CamKey,
} from "../kit";
import { L03, L16, L16_OCCLUDE, L19, L19_OCCLUDE, ROAD17 } from "../data/paths";

/** غلاف لمعةٍ: صعودٌ سريع ثم خبوٌّ بطيء. */
const env = (t: number, t0: number, rise = 0.12, decay = 0.55): number => {
  if (t < t0) return 0;
  if (t < t0 + rise) return (t - t0) / rise;
  return Math.max(0, 1 - (t - t0 - rise) / decay);
};
const beatPulse = (t: number, t0: number, decay = 6): number =>
  t < t0 ? 0 : Math.exp(-(((t - t0) % 0.5) * decay));

/* ───────── 8–11 توليد الكهرباء (03) ───────── */
export const S2_GEN_KEYS: ReadonlyArray<CamKey> = [
  [7.0, 700, 520, 1.0],
  [11.6, 1000, 500, 1.13],
];
export const S2Gen: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S2_GEN_KEYS, t));
  const b = beatPulse(t, 8.0);
  const lanes: Array<[keyof typeof L03, number]> = [
    ["D", 0],
    ["E", 0.25],
    ["A", 0.1],
    ["B", 0.35],
    ["F", 0.2],
  ];
  const fade = clamp(1 - (t - 10.8) / 0.4);
  return (
    <World v={v}>
      <PlateImg file="p03.jpg" />
      <PlateImg file="p03-glow.jpg" blend="screen" opacity={0.28 + 0.2 * b * prog(t, 8.0, 8.6)} />
      <Over blend="screen">
        {lanes.map(([lane, off], li) =>
          Array.from({ length: 6 }, (_, i) => {
            const tr = L03[lane];
            const t0 = 8.4 + off + i * 0.5;
            return (
              <Streak
                key={`${li}-${i}`}
                tr={tr}
                head={(t - t0) * (tr.total / 2.2)}
                tail={170}
                px={2.3}
                k={v.k}
                color="#7fe6ff"
                alpha={0.95 * fade}
              />
            );
          }),
        )}
      </Over>
    </World>
  );
};

/* ───────── 11–14 رفع الجهد (17: بوشنغ المحوّلات) ───────── */
export const S2_STEP_KEYS: ReadonlyArray<CamKey> = [
  [10.2, 760, 520, 1.22],
  [14.6, 940, 500, 1.08],
];
const BUSHINGS_R: ReadonlyArray<readonly [number, number]> = [
  [990, 470],
  [1022, 466],
  [1058, 480],
  [1091, 476],
  [1127, 480],
  [1160, 470],
  [1196, 468],
  [1253, 470],
];
const BUSHINGS_L: ReadonlyArray<readonly [number, number]> = [
  [378, 432],
  [412, 426],
  [455, 420],
  [492, 430],
  [510, 446],
];
export const S2Step: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S2_STEP_KEYS, t));
  return (
    <World v={v}>
      <PlateImg file="p17.jpg" />
      <PlateImg file="p17-glow.jpg" blend="screen" opacity={0.22 + 0.08 * Math.sin(t * 2.1)} />
      <Over blend="screen">
        {BUSHINGS_L.map(([x, y], i) => (
          <Glint
            key={`l${i}`}
            x={x}
            y={y}
            r={34}
            k={v.k}
            amount={env(t, 11.0 + i * 0.07, 0.1, 0.7)}
            rot={8 * i}
          />
        ))}
        {BUSHINGS_R.map(([x, y], i) => (
          <Glint
            key={`r${i}`}
            x={x}
            y={y}
            r={38}
            k={v.k}
            amount={env(t, 11.0 + i * 0.06, 0.1, 0.75)}
            rot={-7 * i}
          />
        ))}
        <Ring
          x={1125}
          y={485}
          r0={10}
          r1={180}
          p={(t - 11.0) / 1.0}
          px={1.6}
          k={v.k}
          color="#9defff"
        />
        <Ring
          x={1125}
          y={485}
          r0={10}
          r1={180}
          p={(t - 11.3) / 1.0}
          px={1.2}
          k={v.k}
          color="#9defff"
          a={0.6}
        />
        <Ring
          x={455}
          y={440}
          r0={10}
          r1={140}
          p={(t - 11.15) / 1.0}
          px={1.2}
          k={v.k}
          color="#9defff"
          a={0.6}
        />
      </Over>
    </World>
  );
};

/* ───────── 14–17.8 النقل عبر الأسلاك (19) ───────── */
export const S2_TR1_KEYS: ReadonlyArray<CamKey> = [
  [13.2, 760, 470, 1.0],
  [18.4, 900, 480, 1.12],
];
const INSUL19: ReadonlyArray<readonly [number, number]> = [
  [430, 126],
  [461, 274],
  [453, 389],
  [777, 432],
  [765, 505],
  [765, 568],
  [882, 426],
  [895, 495],
];
export const S2Tr1: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S2_TR1_KEYS, t));
  const lanes: Array<[keyof typeof L19, number]> = [
    ["W1", 0],
    ["W2", 0.17],
    ["W3", 0.33],
  ];
  return (
    <World v={v}>
      <PlateImg file="p19.jpg" />
      <PlateImg file="p19-glow.jpg" blend="screen" opacity={0.3 + 0.1 * beatPulse(t, 14.0)} />
      <Over blend="screen">
        {lanes.map(([lane, off], li) =>
          Array.from({ length: 8 }, (_, i) => {
            const tr = L19[lane];
            const t0 = 14.0 + off + i * 0.5;
            return (
              <Streak
                key={`${li}-${i}`}
                tr={tr}
                head={(t - t0) * (tr.total / 2.4)}
                tail={150}
                px={2.2}
                k={v.k}
                color="#aef3ff"
                alpha={0.95}
                occlude={L19_OCCLUDE}
              />
            );
          }),
        )}
        {INSUL19.map(([x, y], i) => (
          <Glint
            key={i}
            x={x}
            y={y}
            r={22}
            k={v.k}
            amount={0.55 * beatPulse(t, 14.2 + i * 0.06)}
            rot={10 * i}
          />
        ))}
      </Over>
    </World>
  );
};

/* ───────── 17.8–20 النقل (16: الأسلاك المضيئة) ───────── */
export const S2_TR2_KEYS: ReadonlyArray<CamKey> = [
  [17.0, 1060, 380, 1.0],
  [20.8, 1180, 400, 1.14],
];
export const S2Tr2: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S2_TR2_KEYS, t));
  const lanes: Array<[keyof typeof L16, number]> = [
    ["A", 0],
    ["B", 0.2],
    ["D", 0.38],
  ];
  return (
    <World v={v}>
      <PlateImg file="p16.jpg" />
      <PlateImg file="p16-glow.jpg" blend="screen" opacity={0.25 + 0.12 * beatPulse(t, 17.5)} />
      <Over blend="screen">
        {lanes.map(([lane, off], li) =>
          Array.from({ length: 5 }, (_, i) => {
            const tr = L16[lane];
            const t0 = 17.9 + off + i * 0.5;
            return (
              <Streak
                key={`${li}-${i}`}
                tr={tr}
                head={(t - t0) * (tr.total / 1.9)}
                tail={200}
                px={2.0}
                k={v.k}
                color="#dff6ff"
                alpha={0.9}
                occlude={L16_OCCLUDE}
              />
            );
          }),
        )}
      </Over>
    </World>
  );
};

/* ───────── 20–22 خفض الجهد في المحطة (03: قاطع/خزانة الريليه) ───────── */
export const S2_RELAY_KEYS: ReadonlyArray<CamKey> = [
  [19.4, 560, 700, 1.12],
  [22.6, 560, 735, 1.25],
];
const CAB = { x: 548, y: 782, w: 96, h: 74 };
export const S2Relay: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S2_RELAY_KEYS, t));
  const on = easeOut(prog(t, 20.0, 20.45));
  const flick = 0.88 + 0.12 * Math.sin(t * 9);
  const p = toScreen(v, CAB.x + CAB.w / 2, CAB.y);
  return (
    <>
      <World v={v}>
        <PlateImg file="p03.jpg" />
        <PlateImg file="p03-glow.jpg" blend="screen" opacity={0.3} />
        <Over blend="screen">
          <defs>
            <radialGradient id="cabGlow">
              <stop offset="0" stopColor="#7ff3d2" stopOpacity="0.85" />
              <stop offset="0.45" stopColor="#38d6e0" stopOpacity="0.3" />
              <stop offset="1" stopColor="#38d6e0" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse
            cx={CAB.x + CAB.w / 2}
            cy={CAB.y + CAB.h / 2}
            rx={150}
            ry={110}
            fill="url(#cabGlow)"
            opacity={on * 0.7 * flick}
          />
          <rect
            x={CAB.x}
            y={CAB.y}
            width={CAB.w}
            height={CAB.h}
            rx={3}
            fill="none"
            stroke="#9ff5e0"
            strokeWidth={1.6 / v.k}
            opacity={on * 0.9}
          />
          <Ring
            x={CAB.x + CAB.w / 2}
            y={CAB.y + CAB.h / 2}
            r0={30}
            r1={220}
            p={(t - 20.0) / 1.0}
            px={1.8}
            k={v.k}
            color="#8ff5dd"
          />
          <Ring
            x={CAB.x + CAB.w / 2}
            y={CAB.y + CAB.h / 2}
            r0={30}
            r1={220}
            p={(t - 20.35) / 1.0}
            px={1.2}
            k={v.k}
            color="#8ff5dd"
            a={0.6}
          />
        </Over>
      </World>
      <Screen>
        <OkMark
          x={p.x + 8}
          y={p.y - 44}
          r={22}
          color="#22c55e"
          p={prog(t, 20.25, 20.75)}
          fill={0.32}
        />
      </Screen>
    </>
  );
};

/* ───────── 22–24 التوزيع إلى المدن (17: الأفق) ───────── */
export const S2_CITY_KEYS: ReadonlyArray<CamKey> = [
  [21.4, 1120, 360, 1.18],
  [24.9, 940, 440, 1.0],
];
export const S2City: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S2_CITY_KEYS, t));
  const p = easeInOut(prog(t, 22.0, 23.7));
  const R = 80 + p * 1500;
  const mask = `radial-gradient(ellipse ${R * v.k}px ${R * 0.55 * v.k}px at ${960 * v.k}px ${560 * v.k}px, #000 50%, rgba(0,0,0,0) 100%)`;
  return (
    <World v={v}>
      <PlateImg file="p17.jpg" filter={`brightness(${(0.82 + 0.18 * p).toFixed(3)})`} />
      <PlateImg
        file="p17-glow.jpg"
        blend="screen"
        opacity={0.8}
        mask={p > 0 ? mask : "linear-gradient(transparent, transparent)"}
      />
      <PlateImg
        file="p17-glow.jpg"
        blend="screen"
        opacity={0.2 * p * (0.8 + 0.2 * Math.sin(t * 5))}
      />
      <Over blend="screen">
        {Array.from({ length: 5 }, (_, i) => (
          <Streak
            key={i}
            tr={ROAD17}
            head={(t - (22.6 + i * 0.5)) * 520}
            tail={190}
            px={2.4}
            k={v.k}
            color="#ff9a6a"
            alpha={0.85 * p}
          />
        ))}
      </Over>
    </World>
  );
};
