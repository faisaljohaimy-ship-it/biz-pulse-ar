/**
 * فيلم بانر سَدِيد — حلقةٌ سينمائية 24 ث بلا نصّ (النصّ HTML فوقها في الصفحة).
 *
 * أمر المالك ٢٠٢٦/١٠/١٨ («SADEED AI OS — CINEMATIC MOTION GRAPHICS VIDEO ENGINE»): ستّة مشاهد
 * في موضع البانر نفسه، حلقةٌ بلا قفزة، والنصّ المهمّ HTML لا مخبوزًا في الإطارات.
 *
 * مدخل الملفّ هو المشهد السادس مستقرًّا (اللوحة نفسها بلا نصّ) — فالإطار 0 هو الملصق، والقصّة
 * تجري في دورةٍ: سكون ← المشهد ١ ← … ← ٥ ← سكون. كل حركةٍ دائمة دوريّةٌ على 720 إطارًا
 * (أعدادٌ صحيحة من الدورات) فالإطار 720 هو الإطار 0.
 *
 * الإحداثيات كلّها بكسلات اللوحة الأمّ 2172×724، والحاوية تُصغَّر إلى إطار التركيب.
 * لا رقم ولا اسم ولا «بثّ حيّ»: المدن نقاطٌ توضيحية والألوان من `regions.ts` (المادة ٢٧).
 */
import type { CSSProperties, FC } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";
import {
  ARABIA_VIEWBOX,
  NEIGHBOUR_LAND_PATH,
  SAUDI_BORDER_PATH,
  SAUDI_PROVINCES,
  projectArabia,
} from "@/components/map/arabia-geometry";
import { Landscape } from "./SadeedFilmLandscape";

export const FILM_FPS = 30;
export const FILM_SECONDS = 24;
export const FILM_FRAMES = FILM_FPS * FILM_SECONDS;

const W = 2172;
const H = 724;
const CX = W / 2;
const CY = H / 2;

/** الرمز في اللوحة: مقطوعٌ مربّعًا 483px مركزه (1760.5، 362.5) — موضع الهبوط في المشهد ٥. */
const EMBLEM = { x: 1519, y: 121, size: 483, cx: 1760.5, cy: 362.5 } as const;

/** حدود المشاهد بالثواني — والصفحة تقرأ الحدّين الأوّل والأخير لتزامن النصّ. */
export const ACT = {
  holdEnd: 7.5,
  dimEnd: 8.6,
  s1End: 11.0,
  s2End: 14.2,
  s3End: 17.6,
  s4End: 20.6,
  s5End: 22.4,
} as const;

const TAU = Math.PI * 2;
const cine = Easing.bezier(0.45, 0, 0.2, 1);
const outSoft = Easing.bezier(0.16, 1, 0.3, 1);

function ramp(t: number, a: number, b: number, ease: (x: number) => number = cine): number {
  return interpolate(t, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}

/** موجةٌ دوريّة على الحلقة كلّها: `cycles` عددٌ صحيح فتلتقي البداية بالنهاية. */
function wave(t: number, cycles: number, phase = 0): number {
  return 0.5 + 0.5 * Math.sin((TAU * (cycles * t)) / FILM_SECONDS + phase);
}

function frac(x: number): number {
  return x - Math.floor(x);
}

/** مولّدٌ ثابت البذرة — الإطار نفسه يُرسم كما هو في كل تصيير. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Pt = { x: number; y: number };

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt {
  const v = 1 - u;
  return {
    x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
    y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y,
  };
}

function quad(p0: Pt, c: Pt, p1: Pt, u: number): Pt {
  const v = 1 - u;
  return {
    x: v * v * p0.x + 2 * v * u * c.x + u * u * p1.x,
    y: v * v * p0.y + 2 * v * u * c.y + u * u * p1.y,
  };
}

/** مسدّسٌ رأسه للأعلى (كإطار الرمز) — نقاطه، ومحيطه للتتبّع. */
function hexPoints(cx: number, cy: number, r: number): Pt[] {
  return Array.from({ length: 6 }, (_, k) => ({
    x: cx + r * Math.cos(TAU * (k / 6) - Math.PI / 2),
    y: cy + r * Math.sin(TAU * (k / 6) - Math.PI / 2),
  }));
}

function pointOnPolygon(pts: Pt[], u: number): Pt {
  const n = pts.length;
  const seg = (u * n) % n;
  const i = Math.floor(seg);
  const f = seg - i;
  const a = pts[i];
  const b = pts[(i + 1) % n];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

const box = (x: number, y: number, w: number, h: number): CSSProperties => ({
  position: "absolute",
  left: x,
  top: y,
  width: w,
  height: h,
});

/* ───────────────────────────── البيئة الزرقاء ───────────────────────────── */

const DeepBlue: FC<{ t: number }> = ({ t }) => {
  const bx = 50 + 16 * Math.sin((TAU * t) / FILM_SECONDS);
  const by = 46 + 8 * Math.cos((TAU * 2 * t) / FILM_SECONDS);
  return (
    <div
      style={{
        ...box(0, 0, W, H),
        background: `radial-gradient(62% 90% at ${bx}% ${by}%, #10408f 0%, #0a2a68 34%, #061a46 64%, #030d27 100%)`,
      }}
    />
  );
};

/* ───────────────────────── اللوحة وحياتها الدائمة ───────────────────────── */

const HIGHWAY = {
  p0: { x: 236, y: 387 },
  p1: { x: 292, y: 390 },
  p2: { x: 336, y: 405 },
  p3: { x: 376, y: 452 },
};

const BEACONS: ReadonlyArray<Pt & { phase: number }> = [
  { x: 266, y: 149, phase: 0 },
  { x: 183, y: 201, phase: 1.3 },
  { x: 130, y: 221, phase: 2.2 },
  { x: 312, y: 291, phase: 0.7 },
  { x: 356, y: 301, phase: 3.1 },
  { x: 1545, y: 409, phase: 1.9 },
  { x: 1370, y: 489, phase: 2.7 },
  { x: 1426, y: 489, phase: 0.4 },
];

const FLARE = { x: 1525, y: 303 };

/** ذرّات الضوء: دوريّة على الحلقة، خافتة فوق منطقة النصّ. */
const MOTES = (() => {
  const rnd = seeded(41);
  return Array.from({ length: 44 }, () => ({
    x0: rnd() * W,
    y0: 60 + rnd() * (H - 120),
    k: rnd() < 0.7 ? 1 : 2,
    m: 1 + Math.floor(rnd() * 3),
    r: 1.1 + rnd() * 1.9,
    a: 0.22 + rnd() * 0.4,
    ph: rnd() * TAU,
  }));
})();

function inTextZone(x: number, y: number): boolean {
  return x > 320 && x < 1560 && y > 200 && y < 540;
}

/** حضور نصّ الصفحة فوق الفيلم (0..1): ظاهرٌ في السكون وبعد الكشف — فتخفت فوقه الذرّات. */
function textPresence(t: number): number {
  return t < 14 ? 1 - ramp(t, 7.4, 7.9) : ramp(t, 21.2, 21.8);
}

/** الحياة الدائمة في فضاء اللوحة: ضوء الطريق، ومنارات الأبراج، وحافة الزجاج، وتنفّس الرمز. */
const Ambient: FC<{ t: number }> = ({ t }) => {
  const text = textPresence(t);
  const perimeter = 2 * (2080 - 116) + 2 * (548 - 116) + TAU * 58;
  const edge = 260;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={box(0, 0, W, H)}>
      <defs>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="softer" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <radialGradient id="breath">
          <stop offset="0%" stopColor="#9fdcff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#5fb2ff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#5fb2ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="edgeLight" x1="0" x2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#e8fbff" stopOpacity="1" />
          <stop offset="100%" stopColor="#7fe3ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* تنفّس الرمز: ستّ دورات في الحلقة */}
      <circle
        cx={EMBLEM.cx}
        cy={EMBLEM.cy}
        r={300}
        fill="url(#breath)"
        opacity={0.35 + 0.45 * wave(t, 6)}
        style={{ mixBlendMode: "screen" }}
      />

      {/* حافة الزجاج: ضوءٌ يدور مرّةً في الحلقة */}
      <rect
        x={48}
        y={74}
        width={2080}
        height={548}
        rx={58}
        fill="none"
        stroke="#f2fdff"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${edge} ${perimeter - edge}`}
        strokeDashoffset={-perimeter * (t / FILM_SECONDS)}
        filter="url(#soft)"
        opacity={0.75}
        style={{ mixBlendMode: "screen" }}
      />

      {/* ضوء الطريق: ستّ ومضات، ثلاث مرّات في الحلقة */}
      {Array.from({ length: 6 }, (_, i) => {
        const u0 = frac(i / 6 + (3 * t) / FILM_SECONDS);
        const pts = Array.from({ length: 7 }, (_, j) =>
          bezier(HIGHWAY.p0, HIGHWAY.p1, HIGHWAY.p2, HIGHWAY.p3, Math.min(1, u0 + j * 0.02)),
        );
        const fade = Math.sin(Math.PI * u0);
        const warm = i % 2 === 0;
        return (
          <polyline
            key={i}
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={warm ? "#fff1d0" : "#ff5a52"}
            strokeWidth={warm ? 3.2 : 2.6}
            strokeLinecap="round"
            opacity={0.9 * fade}
            filter="url(#soft)"
          />
        );
      })}

      {/* منارات الأبراج ومداخن المصفاة: ومضةٌ حادّة كل ثانيتين */}
      {BEACONS.map((b, i) => {
        const blink = Math.pow(
          Math.max(0, Math.sin((TAU * (12 * t)) / FILM_SECONDS + b.phase)),
          10,
        );
        return (
          <g key={i} opacity={0.2 + 0.8 * blink}>
            <circle cx={b.x} cy={b.y} r={7} fill="#ff4b42" filter="url(#soft)" />
            <circle cx={b.x} cy={b.y} r={2.4} fill="#ffe2df" />
          </g>
        );
      })}

      {/* شعلة المصفاة: تتنفّس لا تومض */}
      <circle
        cx={FLARE.x}
        cy={FLARE.y}
        r={11 + 5 * wave(t, 8, 1)}
        fill="#ffb24d"
        opacity={0.35 + 0.35 * wave(t, 8, 1)}
        filter="url(#softer)"
        style={{ mixBlendMode: "screen" }}
      />

      {/* ذرّات ضوء دقيقة — أخفت فوق النصّ وأظهر في المشاهد الزرقاء */}
      {MOTES.map((m, i) => {
        const x = frac(m.x0 / W + (m.k * t) / FILM_SECONDS) * W;
        const y = m.y0 + 14 * Math.sin((TAU * m.m * t) / FILM_SECONDS + m.ph);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={m.r}
            fill="#e9f7ff"
            opacity={
              m.a *
              (inTextZone(x, y) ? 1 - 0.78 * text : 1) *
              (0.55 + 0.45 * wave(t, m.m * 2, m.ph))
            }
          />
        );
      })}
    </svg>
  );
};

const PlateLayer: FC<{ t: number }> = ({ t }) => {
  // سكونٌ تامّ ← «إطفاءٌ» هادئ إلى الأزرق (خفوتٌ وتبريدٌ وتمويهٌ ودفعٌ خفيف) ← غائبةٌ في القصّة ← تعود.
  const dim = ramp(t, ACT.holdEnd, ACT.dimEnd);
  const back = ramp(t, ACT.s4End, ACT.s4End + 1.5);
  const opacity = t < ACT.holdEnd ? 1 : t < ACT.s4End ? 1 - ramp(dim, 0.45, 1, (x) => x) : back;
  const s = t < ACT.s4End ? 1 + 0.045 * dim : 1 + 0.06 * (1 - ramp(t, ACT.s4End, ACT.s5End - 0.2));
  const filter =
    t >= ACT.holdEnd && t < ACT.s4End && dim > 0
      ? `brightness(${1 - 0.62 * dim}) saturate(${1 + 0.5 * dim}) blur(${(2.5 * dim).toFixed(2)}px)`
      : undefined;
  // في الهبوط: ثقبٌ ليّن حول رمز اللوحة يُغلق حين يستقرّ الرمز البطل في مكانه — فلا رمزان.
  const hole = t >= ACT.s4End ? 215 * (1 - ramp(t, ACT.s4End + 0.95, ACT.s5End - 0.1)) : 0;
  const mask =
    hole > 1
      ? `radial-gradient(circle at ${EMBLEM.cx}px ${EMBLEM.cy}px, rgba(0,0,0,0) ${hole * 0.9}px, rgba(0,0,0,1) ${hole}px)`
      : undefined;
  if (opacity <= 0) return null;
  return (
    <div
      style={{
        ...box(0, 0, W, H),
        opacity,
        filter,
        transform: `scale(${s})`,
        transformOrigin: "50% 50%",
      }}
    >
      {/* تحت الثقب: اللوحة نفسها ممسوحةً — مقبسٌ مضيء ينتظر الرمز، لا فجوةٌ زرقاء */}
      {mask ? (
        <Img
          src={staticFile("sadeed-banner-clean.webp")}
          style={{ ...box(0, 0, W, H), filter: "blur(34px) brightness(1.12)" }}
        />
      ) : null}
      <div style={{ ...box(0, 0, W, H), maskImage: mask, WebkitMaskImage: mask }}>
        <Img src={staticFile("sadeed-banner-clean.webp")} style={box(0, 0, W, H)} />
        <Ambient t={t} />
      </div>
      {dim > 0 && t < ACT.s4End ? (
        <div
          style={{
            ...box(0, 0, W, H),
            background: "#1b4fb0",
            mixBlendMode: "multiply",
            opacity: 0.75 * dim,
          }}
        />
      ) : null}
    </div>
  );
};

/* ─────────────────────── المشهد ١ — انبثاق ذكيّ ─────────────────────── */

const Rays: FC<{ cx: number; cy: number; t: number; opacity: number; size?: number }> = ({
  cx,
  cy,
  t,
  opacity,
  size = 1500,
}) => {
  if (opacity <= 0) return null;
  const spin = (t / FILM_SECONDS) * 36;
  return (
    <div
      style={{
        ...box(cx - size / 2, cy - size / 2, size, size),
        opacity,
        borderRadius: "50%",
        background:
          "repeating-conic-gradient(from 0deg, rgba(120,210,255,0.0) 0deg 9deg, rgba(150,225,255,0.20) 12deg, rgba(120,210,255,0.0) 15deg 26deg)",
        maskImage:
          "radial-gradient(closest-side, rgba(0,0,0,0.95) 8%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 100%)",
        WebkitMaskImage:
          "radial-gradient(closest-side, rgba(0,0,0,0.95) 8%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 100%)",
        transform: `rotate(${spin}deg)`,
        mixBlendMode: "screen",
        filter: "blur(2px)",
      }}
    />
  );
};

const Emergence: FC<{ t: number }> = ({ t }) => {
  if (t < ACT.dimEnd - 0.3 || t > ACT.s1End + 0.6) return null;
  const glassIn = ramp(t, ACT.dimEnd - 0.2, ACT.dimEnd + 0.9, outSoft);
  const out = ramp(t, ACT.s1End - 0.4, ACT.s1End + 0.5);
  const traceA = ramp(t, 9.0, 10.15);
  const traceB = ramp(t, 9.25, 10.35);
  const emb = ramp(t, 9.85, 10.7, outSoft);
  const R = 238;
  const hexA = hexPoints(CX, CY, R);
  const hexB = hexPoints(CX, CY, R - 26);
  const lenA = 6 * R;
  const lenB = 6 * (R - 26);
  const headA = pointOnPolygon(hexA, traceA);
  const headB = pointOnPolygon(hexB, traceB);
  const size = 470 * (0.94 + 0.06 * emb) * (1 + 0.1 * out);
  return (
    <div style={{ ...box(0, 0, W, H), opacity: 1 - out }}>
      {/* سطح الزجاج المضيء */}
      <div
        style={{
          ...box(CX - 900, CY - 285, 1800, 570),
          borderRadius: 60,
          opacity: glassIn,
          transform: `scale(${0.94 + 0.06 * glassIn + 0.08 * out})`,
          background:
            "linear-gradient(180deg, rgba(235,246,255,0.20) 0%, rgba(150,200,255,0.08) 46%, rgba(120,180,255,0.14) 100%)",
          border: "2px solid rgba(170,230,255,0.55)",
          boxShadow:
            "inset 0 2px 0 rgba(255,255,255,0.55), inset 0 0 90px rgba(90,170,255,0.32), 0 0 120px rgba(60,150,255,0.35)",
        }}
      />
      <Rays cx={CX} cy={CY} t={t} opacity={0.75 * ramp(t, 9.5, 10.4) * (1 - out)} />
      {/* تتبّع الحافّة بضوءٍ سماويّ ثم يتجسّد الرمز */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={box(0, 0, W, H)}>
        <defs>
          <filter id="trace" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {[
          { pts: hexA, len: lenA, p: traceA, head: headA, w: 4 },
          { pts: hexB, len: lenB, p: traceB, head: headB, w: 2.5 },
        ].map((h, i) =>
          h.p > 0 ? (
            <g key={i} opacity={1 - emb * 0.65}>
              <polygon
                points={h.pts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#62e6ff"
                strokeWidth={h.w * 3}
                strokeLinejoin="round"
                strokeDasharray={`${h.len * h.p} ${h.len}`}
                filter="url(#trace)"
                opacity={0.8}
              />
              <polygon
                points={h.pts.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#e6fbff"
                strokeWidth={h.w}
                strokeLinejoin="round"
                strokeDasharray={`${h.len * h.p} ${h.len}`}
              />
              {h.p < 1 ? (
                <>
                  <circle
                    cx={h.head.x}
                    cy={h.head.y}
                    r={22}
                    fill="#7feaff"
                    opacity={0.7}
                    filter="url(#trace)"
                  />
                  <circle cx={h.head.x} cy={h.head.y} r={5} fill="#ffffff" />
                </>
              ) : null}
            </g>
          ) : null,
        )}
      </svg>
      {emb > 0 ? (
        <>
          <Img
            src={staticFile("sadeed-emblem.webp")}
            style={{
              ...box(CX - size / 2, CY - size / 2, size, size),
              opacity: 0.85 * emb,
              filter: "blur(22px) brightness(1.6)",
              mixBlendMode: "screen",
            }}
          />
          <Img
            src={staticFile("sadeed-emblem.webp")}
            style={{
              ...box(CX - size / 2, CY - size / 2, size, size),
              opacity: emb,
              filter: `brightness(${1 + 0.7 * (1 - ramp(t, 9.85, 11.0))})`,
            }}
          />
        </>
      ) : null}
    </div>
  );
};

/* ─────────────────── المشهد ٣ — شبكة الذكاء على الخريطة ─────────────────── */

type City = { lat: number; lng: number; region: RegionId };

/** نقاطٌ توضيحية لمدنٍ صناعية — لا بيانات ولا أعداد (المادة ٢٧). */
const CITIES: readonly City[] = [
  { lat: 21.49, lng: 39.19, region: "western" },
  { lat: 21.39, lng: 39.86, region: "western" },
  { lat: 24.52, lng: 39.57, region: "western" },
  { lat: 24.09, lng: 38.06, region: "western" },
  { lat: 26.42, lng: 50.09, region: "eastern" },
  { lat: 27.0, lng: 49.65, region: "eastern" },
  { lat: 25.38, lng: 49.59, region: "eastern" },
  { lat: 18.22, lng: 42.51, region: "southern" },
  { lat: 16.89, lng: 42.55, region: "southern" },
  { lat: 17.49, lng: 44.13, region: "southern" },
  { lat: 26.36, lng: 43.98, region: "central" },
  { lat: 24.15, lng: 47.31, region: "central" },
];
const CORE = { lat: 24.71, lng: 46.68 };
const REGION_ORDER: readonly RegionId[] = ["central", "western", "eastern", "southern"];

const MAP_SCALE = 660 / ARABIA_VIEWBOX.height;
const MAP_X = CX - (ARABIA_VIEWBOX.width * MAP_SCALE) / 2 + 30;
const MAP_Y = CY - (ARABIA_VIEWBOX.height * MAP_SCALE) / 2 + 2;

function toMap(lat: number, lng: number): Pt {
  const p = projectArabia(lat, lng);
  return { x: MAP_X + p.x * MAP_SCALE, y: MAP_Y + p.y * MAP_SCALE };
}

const NetworkMap: FC<{ t: number }> = ({ t }) => {
  const a = ACT.s2End - 0.3;
  if (t < a || t > ACT.s3End + 0.6) return null;
  const vis = ramp(t, a, a + 0.6);
  const converge = ramp(t, ACT.s3End - 0.75, ACT.s3End + 0.25, Easing.in(Easing.cubic));
  const border = ramp(t, a + 0.1, a + 1.4);
  const core = toMap(CORE.lat, CORE.lng);
  const sc = 1 - 0.55 * converge;
  return (
    <div
      style={{
        ...box(0, 0, W, H),
        opacity: vis * (1 - converge),
        transform: `scale(${sc})`,
        transformOrigin: `${core.x}px ${core.y}px`,
      }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={box(0, 0, W, H)}>
        <defs>
          <filter id="mapGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="nodeGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <radialGradient id="mapHalo">
            <stop offset="0%" stopColor="#3f9bff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3f9bff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* شبكة إحداثياتٍ خافتة تنساب — طابع «غرفة الذكاء» */}
        <g opacity={0.5 * vis}>
          {Array.from({ length: 23 }, (_, i) => {
            const x = ((i * 100 + t * 14) % 2300) - 60;
            return (
              <line
                key={`v${i}`}
                x1={x}
                y1={0}
                x2={x}
                y2={H}
                stroke="rgba(120,190,255,0.10)"
                strokeWidth={1}
              />
            );
          })}
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * 100 + 12}
              x2={W}
              y2={i * 100 + 12}
              stroke="rgba(120,190,255,0.10)"
              strokeWidth={1}
            />
          ))}
          <ellipse cx={CX} cy={CY} rx={620} ry={330} fill="url(#mapHalo)" />
        </g>
        <g transform={`translate(${MAP_X} ${MAP_Y}) scale(${MAP_SCALE})`}>
          <path
            d={NEIGHBOUR_LAND_PATH}
            fill="none"
            stroke="rgba(140,200,255,0.16)"
            strokeWidth={1.1}
          />
          {SAUDI_PROVINCES.map((p) => {
            const idx = REGION_ORDER.indexOf(p.region);
            const fill = ramp(t, a + 0.7 + idx * 0.3, a + 1.4 + idx * 0.3);
            const breath = 0.75 + 0.25 * wave(t, 12, idx * 1.4);
            return (
              <path
                key={p.id}
                d={p.d}
                fill={REGION_ACCENT_HEX[p.region]}
                fillOpacity={0.46 * fill * breath}
                style={{ mixBlendMode: "screen" }}
                stroke="rgba(190,235,255,0.55)"
                strokeWidth={1.3}
                strokeOpacity={fill}
              />
            );
          })}
          <path
            d={SAUDI_BORDER_PATH}
            fill="none"
            stroke="#5fe3ff"
            strokeWidth={9}
            pathLength={1}
            strokeDasharray={`${border} 1`}
            filter="url(#mapGlow)"
            opacity={0.75}
          />
          <path
            d={SAUDI_BORDER_PATH}
            fill="none"
            stroke="#e8fcff"
            strokeWidth={2.6}
            pathLength={1}
            strokeDasharray={`${border} 1`}
          />
        </g>
        {CITIES.map((c, i) => {
          const p = toMap(c.lat, c.lng);
          const color = REGION_ACCENT_HEX[c.region];
          const on = ramp(t, a + 0.9 + i * 0.07, a + 1.3 + i * 0.07);
          const arc = ramp(t, a + 1.25 + i * 0.06, a + 2.05 + i * 0.06);
          const ctrl = { x: (p.x + core.x) / 2, y: Math.min(p.y, core.y) - 70 - (i % 3) * 18 };
          const n = 28;
          const pts = Array.from({ length: n + 1 }, (_, j) => quad(p, ctrl, core, (j / n) * arc));
          const comet = frac((t - (a + 2.0)) / 1.3 + i * 0.083);
          const showComet = t > a + 2.0 ? 1 : 0;
          const cp = quad(p, ctrl, core, comet);
          const ring = frac(t / 1.6 + i * 0.13);
          return (
            <g key={i} opacity={on}>
              {arc > 0 ? (
                <polyline
                  points={pts.map((q) => `${q.x},${q.y}`).join(" ")}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.85}
                  strokeWidth={2.8}
                  strokeDasharray="6 6"
                />
              ) : null}
              {showComet ? (
                <>
                  <circle
                    cx={cp.x}
                    cy={cp.y}
                    r={12}
                    fill={color}
                    opacity={0.8}
                    filter="url(#nodeGlow)"
                  />
                  <circle cx={cp.x} cy={cp.y} r={3.6} fill="#ffffff" />
                </>
              ) : null}
              <circle
                cx={p.x}
                cy={p.y}
                r={6 + 22 * ring}
                fill="none"
                stroke={color}
                strokeWidth={1.6}
                opacity={0.7 * (1 - ring)}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={14}
                fill={color}
                opacity={0.85}
                filter="url(#nodeGlow)"
              />
              <circle cx={p.x} cy={p.y} r={4.8} fill="#ffffff" />
            </g>
          );
        })}
        {/* نواة الذكاء: حلقاتٌ هادئة ومسدّسٌ يدور — جسرٌ إلى المشهد ٤ */}
        <g opacity={ramp(t, a + 1.0, a + 1.6)}>
          {[0, 1, 2].map((k) => {
            const r = frac(t / 1.8 + k / 3);
            return (
              <circle
                key={k}
                cx={core.x}
                cy={core.y}
                r={14 + 70 * r}
                fill="none"
                stroke="#9feaff"
                strokeWidth={2}
                opacity={0.75 * (1 - r)}
              />
            );
          })}
          <polygon
            points={hexPoints(core.x, core.y, 30 + 18 * converge)
              .map((q) => `${q.x},${q.y}`)
              .join(" ")}
            fill="rgba(110,200,255,0.18)"
            stroke="#e6fbff"
            strokeWidth={2.4}
            transform={`rotate(${(t / FILM_SECONDS) * 360} ${core.x} ${core.y})`}
          />
          <circle
            cx={core.x}
            cy={core.y}
            r={18 + 50 * converge}
            fill="#9feaff"
            opacity={0.55}
            filter="url(#nodeGlow)"
          />
        </g>
      </svg>
    </div>
  );
};

/* ───────────── المشهد ٤ والمشهد ٥ — الرمز بطلًا ثم هبوطه في اللوحة ───────────── */

const HeroEmblem: FC<{ t: number }> = ({ t }) => {
  const start = ACT.s3End - 0.35;
  if (t < start || t > ACT.s5End + 0.3) return null;
  const appear = ramp(t, start, start + 0.85, outSoft);
  const land = ramp(t, ACT.s4End, ACT.s4End + 1.25);
  const fade = ramp(t, ACT.s4End + 1.15, ACT.s5End - 0.05);
  // يولد من نواة الخريطة ويصعد إلى المركز، ثم يهبط في موضعه من اللوحة.
  const core = toMap(CORE.lat, CORE.lng);
  const size = 520 + (EMBLEM.size - 520) * land;
  const bx = core.x + (CX - core.x) * appear;
  const by = core.y + (CY - core.y) * appear;
  const cx = bx + (EMBLEM.cx - bx) * land;
  const cy = by + (EMBLEM.cy - by) * land;
  const sc = 0.6 + 0.4 * appear;
  const turn = interpolate(t, [start, start + 1.3, start + 2.0], [-40, 7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const sway =
    4 *
    Math.sin((TAU * (t - (start + 2.0))) / 2.4) *
    ramp(t, start + 2.0, start + 2.4) *
    (1 - land);
  const rotY = turn + sway;
  const sweep = ramp(t, start + 1.2, start + 2.2, Easing.inOut(Easing.quad));
  const heroOnly = 1 - land;
  const vis = appear * (1 - fade);
  return (
    <div style={{ ...box(0, 0, W, H), opacity: vis }}>
      <Rays cx={cx} cy={cy} t={t} opacity={0.6 * heroOnly * appear} size={1300} />
      {/* انعكاس الأرضية: صورةٌ مقلوبة تذوب */}
      <div
        style={{
          ...box(cx - size / 2, cy + size / 2 - 6, size, size * 0.42),
          overflow: "hidden",
          opacity: 0.22 * heroOnly,
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0))",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0))",
        }}
      >
        <Img
          src={staticFile("sadeed-emblem.webp")}
          style={{
            width: size,
            height: size,
            transform: `scaleY(-1) scale(${sc})`,
            transformOrigin: "50% 50%",
          }}
        />
      </div>
      <div style={{ ...box(cx - size / 2, cy - size / 2, size, size), perspective: 1500 }}>
        <div
          style={{
            width: size,
            height: size,
            transform: `scale(${sc}) rotateY(${rotY}deg)`,
          }}
        >
          <Img
            src={staticFile("sadeed-emblem.webp")}
            style={{
              ...box(0, 0, size, size),
              filter: "blur(26px) brightness(1.5)",
              opacity: 0.75 * heroOnly,
              mixBlendMode: "screen",
            }}
          />
          <Img src={staticFile("sadeed-emblem.webp")} style={box(0, 0, size, size)} />
          {/* موجة الطاقة: نسخةٌ مضيئة من الرمز نفسه تظهر في نطاقٍ مائل يعبره مرّة */}
          <Img
            src={staticFile("sadeed-emblem.webp")}
            style={{
              ...box(0, 0, size, size),
              filter: "brightness(1.9) saturate(1.25) hue-rotate(-8deg)",
              maskImage: `linear-gradient(105deg, rgba(0,0,0,0) ${sweep * 160 - 40}%, rgba(0,0,0,1) ${sweep * 160 - 22}%, rgba(0,0,0,0) ${sweep * 160 - 4}%)`,
              WebkitMaskImage: `linear-gradient(105deg, rgba(0,0,0,0) ${sweep * 160 - 40}%, rgba(0,0,0,1) ${sweep * 160 - 22}%, rgba(0,0,0,0) ${sweep * 160 - 4}%)`,
              opacity: sweep > 0 && sweep < 1 ? 1 : 0,
            }}
          />
        </div>
      </div>
      {/* أضواءٌ تدور حول الرمز في المشهد ٤ */}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ ...box(0, 0, W, H), opacity: heroOnly }}
      >
        <defs>
          <filter id="orbit" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {[0, 1, 2].map((k) => {
          const ang = TAU * ((t - start) / 3.2 + k / 3);
          const ox = cx + Math.cos(ang) * size * 0.62;
          const oy = cy + Math.sin(ang) * size * 0.2;
          const front = Math.sin(ang) > 0 ? 1 : 0.45;
          return (
            <g key={k} opacity={appear * front}>
              <circle cx={ox} cy={oy} r={11} fill="#7feaff" opacity={0.7} filter="url(#orbit)" />
              <circle cx={ox} cy={oy} r={3} fill="#ffffff" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/** حوافّ معتمة في المشاهد الزرقاء وحدها — السكون نظيفٌ كاللوحة. */
const Vignette: FC<{ t: number }> = ({ t }) => {
  const dark =
    t < ACT.holdEnd
      ? 0
      : t < ACT.s4End
        ? ramp(t, ACT.holdEnd, ACT.dimEnd)
        : 1 - ramp(t, ACT.s4End, ACT.s4End + 1.4);
  if (dark <= 0) return null;
  return (
    <div
      style={{
        ...box(0, 0, W, H),
        opacity: dark,
        background:
          "radial-gradient(75% 95% at 50% 50%, rgba(2,8,26,0) 55%, rgba(2,8,26,0.55) 100%)",
      }}
    />
  );
};

export const SadeedFilm: FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const t = frame / FILM_FPS;
  return (
    <AbsoluteFill style={{ background: "#030d27", overflow: "hidden" }}>
      <div style={{ ...box(0, 0, W, H), transform: `scale(${width / W})`, transformOrigin: "0 0" }}>
        <DeepBlue t={t} />
        <PlateLayer t={t} />
        <Emergence t={t} />
        <Landscape t={t} start={ACT.s1End} end={ACT.s2End} />
        <NetworkMap t={t} />
        <HeroEmblem t={t} />
        <Vignette t={t} />
      </div>
    </AbsoluteFill>
  );
};
