/**
 * S3 — الأمن (24–38 ث): نقاط الدخول ← الكاميرات والدوريات ← المسيّرة ← المراقبة والتحكم.
 * كلّ لقطةٍ صورةٌ مولَّدة بالذكاء الاصطناعي (02 · 20 · 14 · 13 · 06 · 04 · 10)؛ لا أشخاص مضافون ولا شخصيات
 * مرسومة — رجال الأمن موجودون في الصور نفسها. الـHUD رقيق (أقواس وأقماع رؤية وعلامات ✓) فوق الصور.
 */
import React from "react";
import { clamp, easeInOut, easeOut, lerp, prog } from "../kit/ease";
import {
  Brackets,
  camAt,
  OkMark,
  Over,
  PlateImg,
  Ring,
  Screen,
  toScreen,
  view,
  World,
  type CamKey,
  type View,
} from "../kit";
import { C } from "../palette";

/** مربّع في إحداثيات الصورة ← إحداثيات الشاشة. */
const sb = (v: View, x: number, y: number, w: number, h: number) => {
  const p = toScreen(v, x, y);
  return { x: p.x, y: p.y, w: w * v.k, h: h * v.k };
};

/* ───────── 24–27 نقاط الدخول (02) ───────── */
export const S3_GATE_KEYS: ReadonlyArray<CamKey> = [
  [23.3, 836, 470, 1.0],
  [27.6, 800, 560, 1.12],
];
export const S3Gate: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S3_GATE_KEYS, t));
  const breathe = 0.22 + 0.06 * Math.sin(t * 2.3);
  const hud = easeOut(prog(t, 25.6, 26.1));
  const gb = sb(v, 838, 428, 124, 396);
  return (
    <>
      <World v={v}>
        <PlateImg file="p02.jpg" />
        <PlateImg file="p02-glow.jpg" blend="screen" opacity={breathe} />
      </World>
      <Screen>
        <g opacity={hud}>
          <Brackets
            x={gb.x - 8}
            y={gb.y - 8}
            w={gb.w + 16}
            h={gb.h + 16}
            len={18}
            stroke={1.8}
            color="#9defff"
            opacity={0.85}
          />
        </g>
      </Screen>
    </>
  );
};

/* ───────── 27–30 تقريبٌ رقميّ على الحارس (20) ───────── */
export const S3_SCAN_KEYS: ReadonlyArray<CamKey> = [
  [26.0, 836, 520, 1.0],
  [30.8, 800, 500, 1.1],
];
export const S3Scan: React.FC<{ t: number }> = ({ t }) => {
  const v0 = view(camAt(S3_SCAN_KEYS, t));
  // تقريبٌ رقميّ: يبدأ مكبَّرًا 1.18× ثم يستقرّ خلال 0.55 ث (27.0 → 27.55)
  const dz = lerp(1.18, 1, easeOut(prog(t, 27.0, 27.55)));
  const hudIn = easeOut(prog(t, 27.15, 27.55));
  const hudOut = 1 - easeInOut(prog(t, 28.7, 29.2));
  const hud = hudIn * hudOut;
  const sweep = prog(t, 27.15, 27.7);
  const gb = sb(v0, 690, 248, 330, 520);
  const tb = sb(v0, 996, 508, 112, 84);
  const okp = prog(t, 27.6, 27.95);
  const scanY = gb.y + gb.h * sweep;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${dz})`,
        transformOrigin: "62% 52%",
      }}
    >
      <World v={v0}>
        <PlateImg file="p20.jpg" />
        <PlateImg file="p20-glow.jpg" blend="screen" opacity={0.2 + 0.05 * Math.sin(t * 2.4)} />
      </World>
      <Screen>
        <defs>
          <linearGradient id="scanFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <g opacity={hud}>
          <rect
            x={gb.x}
            y={gb.y}
            width={gb.w}
            height={gb.h}
            fill="#22d3ee"
            opacity={0.06}
            stroke="#7ae8f7"
            strokeWidth={1}
            strokeOpacity={0.5}
          />
          <Brackets x={gb.x} y={gb.y} w={gb.w} h={gb.h} len={38} stroke={3} color="#d9fbff" />
          <Brackets
            x={tb.x}
            y={tb.y}
            w={tb.w}
            h={tb.h}
            len={14}
            stroke={2.4}
            color="#d9fbff"
            opacity={0.95}
          />
          {sweep > 0 && sweep < 1 && (
            <g>
              <rect x={gb.x} y={scanY - 16} width={gb.w} height={16} fill="url(#scanFade)" />
              <line
                x1={gb.x - 6}
                x2={gb.x + gb.w + 6}
                y1={scanY}
                y2={scanY}
                stroke="#d9fbff"
                strokeWidth={1.6}
              />
            </g>
          )}
          <OkMark x={gb.x + gb.w + 30} y={gb.y + 30} r={24} color={C.emerald} p={okp} fill={0.3} />
        </g>
      </Screen>
    </div>
  );
};

/* ───────── 30–32 الكاميرات (14) ───────── */
export const S3_CAM_KEYS: ReadonlyArray<CamKey> = [
  [29.5, 700, 480, 1.0],
  [32.6, 640, 500, 1.14],
];
const CAMS14 = [
  { x: 190, y: 75, a0: 28, sw: 8, t0: 30.3, len: 640 },
  { x: 318, y: 292, a0: 24, sw: 9, t0: 30.55, len: 520 },
  { x: 418, y: 440, a0: 18, sw: 7, t0: 30.8, len: 420 },
] as const;

const Cone: React.FC<{
  x: number;
  y: number;
  ang: number;
  half: number;
  len: number;
  on: number;
  k: number;
  id: string;
}> = ({ x, y, ang, half, len, on, k, id }) => {
  const pt = (a: number) => {
    const r = (a * Math.PI) / 180;
    return `${x + Math.cos(r) * len * on},${y + Math.sin(r) * len * on}`;
  };
  return (
    <g opacity={on}>
      <defs>
        <linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          x1={x}
          y1={y}
          x2={x + Math.cos((ang * Math.PI) / 180) * len}
          y2={y + Math.sin((ang * Math.PI) / 180) * len}
        >
          <stop offset="0" stopColor="#7ae8f7" stopOpacity="0.5" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path
        d={`M${x},${y} L${pt(ang - half)} L${pt(ang + half)} Z`}
        fill={`url(#${id})`}
        style={{ mixBlendMode: "screen" }}
      />
      <path
        d={`M${pt(ang - half)} L${x},${y} L${pt(ang + half)}`}
        fill="none"
        stroke="#9defff"
        strokeWidth={1.3 / k}
        opacity={0.75}
      />
      <circle cx={x} cy={y} r={9 / k} fill="none" stroke="#9defff" strokeWidth={1.6 / k} />
      <circle cx={x} cy={y} r={2.6 / k} fill="#d9fbff" />
    </g>
  );
};

export const S3Cam: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S3_CAM_KEYS, t));
  const lock = easeOut(prog(t, 31.0, 31.9));
  const gb = sb(v, 462 + 4 * (t - 30), 498, 128, 318);
  const size = lerp(1.9, 1, lock);
  const cx = gb.x + gb.w / 2;
  const cy = gb.y + gb.h / 2;
  return (
    <>
      <World v={v}>
        <PlateImg file="p14.jpg" />
        <PlateImg file="p14-glow.jpg" blend="screen" opacity={0.2} />
        <Over>
          {CAMS14.map((c, i) => {
            const on = easeOut(prog(t, c.t0, c.t0 + 0.4));
            const ang = c.a0 + c.sw * Math.sin(t * 1.1 + i * 1.7);
            return (
              <Cone
                key={i}
                x={c.x}
                y={c.y}
                ang={ang}
                half={11}
                len={c.len}
                on={on}
                k={v.k}
                id={`cone14${i}`}
              />
            );
          })}
          {CAMS14.map((c, i) => (
            <Ring
              key={`r${i}`}
              x={c.x}
              y={c.y}
              r0={10}
              r1={46}
              p={((t - c.t0 - 0.2) % 1.6) / 1.6}
              px={1.2}
              k={v.k}
              color="#9defff"
              a={0.5}
            />
          ))}
        </Over>
      </World>
      <Screen>
        <g opacity={prog(t, 31.0, 31.3) * (1 - prog(t, 32.1, 32.4))}>
          <Brackets
            x={cx - (gb.w * size) / 2}
            y={cy - (gb.h * size) / 2}
            w={gb.w * size}
            h={gb.h * size}
            len={20}
            stroke={2}
            color="#d9fbff"
          />
          <OkMark
            x={cx + (gb.w * size) / 2 + 22}
            y={cy - (gb.h * size) / 2 + 12}
            r={15}
            color={C.emerald}
            p={prog(t, 31.9, 32.2)}
            fill={0.3}
          />
        </g>
      </Screen>
    </>
  );
};

/* ───────── 32–34 دوريّة حارسَين (13) ───────── */
export const S3_PAT_KEYS: ReadonlyArray<CamKey> = [
  [31.6, 836, 480, 1.0],
  [34.6, 800, 500, 1.1],
];
export const S3Pat: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S3_PAT_KEYS, t));
  const on = easeOut(prog(t, 32.4, 32.9)) * (1 - prog(t, 33.8, 34.2));
  const g1 = sb(v, 408 + 14 * (t - 32), 362, 214, 522);
  const g2 = sb(v, 690 + 14 * (t - 32), 412, 176, 462);
  return (
    <>
      <World v={v}>
        <PlateImg file="p13.jpg" />
        <PlateImg file="p13-glow.jpg" blend="screen" opacity={0.2} />
        <Over>
          <Cone
            x={1504}
            y={52}
            ang={158}
            half={13}
            len={700}
            on={easeOut(prog(t, 32.3, 32.8))}
            k={v.k}
            id="cone13a"
          />
          <Cone
            x={860}
            y={262}
            ang={118}
            half={13}
            len={560}
            on={easeOut(prog(t, 32.5, 33.0))}
            k={v.k}
            id="cone13b"
          />
        </Over>
      </World>
      <Screen>
        <g opacity={on}>
          <Brackets x={g1.x} y={g1.y} w={g1.w} h={g1.h} len={26} stroke={2} color="#d9fbff" />
          <Brackets x={g2.x} y={g2.y} w={g2.w} h={g2.h} len={24} stroke={2} color="#d9fbff" />
          <OkMark
            x={g1.x + g1.w + 18}
            y={g1.y + 14}
            r={14}
            color={C.emerald}
            p={prog(t, 33.0, 33.3)}
            fill={0.3}
          />
          <OkMark
            x={g2.x + g2.w + 18}
            y={g2.y + 14}
            r={14}
            color={C.emerald}
            p={prog(t, 33.15, 33.45)}
            fill={0.3}
          />
        </g>
      </Screen>
    </>
  );
};

/* ───────── 34–36 المسيّرة (06) ───────── */
export const S3_DRONE_KEYS: ReadonlyArray<CamKey> = [
  [33.4, 1000, 460, 1.0],
  [36.6, 1130, 380, 1.2],
];
export const S3Drone: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S3_DRONE_KEYS, t));
  const on = easeOut(prog(t, 34.55, 35.05)) * (1 - prog(t, 35.8, 36.2));
  const dr = sb(v, 1010, 86, 330, 126);
  const gA = sb(v, 1286, 636, 46, 90);
  const gB = sb(v, 1352, 648, 46, 90);
  return (
    <>
      <World v={v}>
        <PlateImg file="p06.jpg" />
        <PlateImg file="p06-glow.jpg" blend="screen" opacity={0.22 + 0.06 * Math.sin(t * 3)} />
        <Over blend="screen">
          <Ring
            x={1168}
            y={190}
            r0={14}
            r1={120}
            p={((t - 34.6) % 1.2) / 1.2}
            px={1.4}
            k={v.k}
            color="#9defff"
            a={0.55}
          />
        </Over>
      </World>
      <Screen>
        <g opacity={on}>
          <Brackets x={dr.x} y={dr.y} w={dr.w} h={dr.h} len={22} stroke={2} color="#d9fbff" />
          <Brackets x={gA.x} y={gA.y} w={gA.w} h={gA.h} len={12} stroke={1.8} color="#d9fbff" />
          <Brackets x={gB.x} y={gB.y} w={gB.w} h={gB.h} len={12} stroke={1.8} color="#d9fbff" />
          <OkMark
            x={dr.x + dr.w + 20}
            y={dr.y + 14}
            r={14}
            color={C.emerald}
            p={prog(t, 35.1, 35.4)}
            fill={0.3}
          />
        </g>
      </Screen>
    </>
  );
};

/* ───────── 36–37.6 المراقبة (04) ───────── */
export const S3_CTRL_KEYS: ReadonlyArray<CamKey> = [
  [35.4, 836, 470, 1.0],
  [38.0, 960, 360, 1.13],
];
const TILES04 = [
  { x: 690, y: 84, w: 182, h: 128, t0: 36.25 },
  { x: 544, y: 226, w: 146, h: 126, t0: 36.5 },
  { x: 690, y: 226, w: 182, h: 126, t0: 36.75 },
] as const;
export const S3Ctrl: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S3_CTRL_KEYS, t));
  const scan = (t * 0.5) % 1;
  return (
    <>
      <World v={v}>
        <PlateImg file="p04.jpg" />
      </World>
      <Screen>
        <line
          x1={0}
          x2={1280}
          y1={scan * 720}
          y2={scan * 720}
          stroke="rgba(122,232,247,0.12)"
          strokeWidth={1.4}
        />
        {TILES04.map((b, i) => {
          const p = sb(v, b.x, b.y, b.w, b.h);
          const o = easeOut(prog(t, b.t0, b.t0 + 0.3));
          return (
            <g key={i} opacity={o}>
              <Brackets x={p.x} y={p.y} w={p.w} h={p.h} len={16} stroke={1.8} color="#9defff" />
              <OkMark
                x={p.x + p.w - 4}
                y={p.y - 14}
                r={11}
                color={C.emerald}
                p={prog(t, b.t0 + 0.3, b.t0 + 0.65)}
                fill={0.3}
              />
            </g>
          );
        })}
      </Screen>
    </>
  );
};

/* ───────── 37.2–38.9 الدخول إلى شاشة التوأم (10) ───────── */
export const S3_WALL_KEYS: ReadonlyArray<CamKey> = [
  [37.0, 836, 470, 1.0],
  [38.9, 730, 250, 1.24],
];
export const S3Wall: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S3_WALL_KEYS, t));
  return (
    <World v={v}>
      <PlateImg file="p10.jpg" />
    </World>
  );
};
