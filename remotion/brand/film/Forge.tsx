/**
 * صياغة رمز سَدِيد بالليزر والإشعاع، ثم تثبيت اللوحة، ثم اللمعان الختاميّ (16.5–24 ث).
 *
 * أمر المالك ٢٠٢٦/١٠/١٨ (R4) بنصّه: «وفي اخر الفديو تبنى وتتكون علامة سديد بلمعان وليزر مذهل
 * واشعاع ثم تثبت اللوحة الاخيرة تدريجياً حتى تتكون وحين اكتمال اللوحة يكون لها بريق ولمعان وصولات
 * وجولات من الابداعيه الخورافية». فالمقطع خمس حركات على زمن `timeline.ts` (وعليه الموسيقى):
 *
 *   ١ انطواء (16.5–17.0): نقطة المونتاج المضيئة في المركز تنطوي في فراغٍ كحليّ — حلقاتٌ تنكمش
 *     وخطوطُ ضوءٍ تُسحب إليها — ثم أرضيّةٌ شبكيّة خافتة في منظور، وغبارٌ رقيق.
 *   ٢ ليزر (17.0–18.95): أربع رشقاتٍ على النبضات من أربع زوايا متقاطعة، كلٌّ تنقش ربعًا من سلك
 *     الرمز (`sadeed-emblem-edges.webp`) بقناعٍ زاويّ تقوده نقطة التماس على حافّته، وخلفه سلكٌ
 *     متّقدٌ يبرد إلى السماويّ، وشررٌ عند التماس. الأرباع السفلى أوّلًا فلا يسبق المسحُ النقش.
 *   ٣ بناء (18.6–19.5): مستوى ليزرٍ أفقيّ يصعد متسارعًا من أسفل الرمز إلى أعلاه — تحته الرمز
 *     الزجاجيّ مصمتًا، وفوقه السلك وحده — وشررٌ ينسكب من طرفيه.
 *   ٤ إشعاع (19.5–20.5): الاكتمال على ضربة الموسيقى — أشعّةٌ تدور ببطء، وتوهّج، وموجةٌ صادمة،
 *     وخطّ وهجٍ أفقيّ، وبريقٌ يتناثر — ثم يهدأ إلى توهّجٍ ثابت. ومضةٌ واحدة ذروتها دون البياض
 *     (WCAG 2.3.1) — قِيس على التسلسل المصيَّر (٢٠٢٦/١٠/١٨): +0.11 من متوسّط الإضاءة النسبيّة
 *     للإطار، و0.39 في أشدّ نافذةٍ 341×256؛ ورشقات الليزر ≤ 0.055 فيها، دون عتبة الومضة (0.10).
 *   ٥ تثبيتٌ ولمعان (20.5–24): ينساب الرمز على قوسٍ إلى موضعه من اللوحة واللوحة تتكوّن حوله
 *     تدريجيًّا (تمويهٌ ← حدّة، سطوعٌ ← طبيعيّ)، وتحته في اللوحة ثقبٌ ليّن يُغلق حين يستقرّ — فلا
 *     رمزان (الرمز مقطوعٌ من اللوحة نفسها: الفرق داخل المسدّس 1.5/255 — ضجيج الضغط)؛ وضوءٌ يدور
 *     مرّةً على حافّة زجاجها؛ ثم ثلاث ومضات بريقٍ صاعدة ومسحةُ ضوءٍ من الأسفل إلى الأعلى وتلميحُ
 *     توهّجٍ لولبيّ — تخبو كلّها فيكون الإطار الأخير اللوحةَ نفسها (قِيس: الإطار 719 يطابق الإطار 0،
 *     ملصق الصفحة، بكسلًا بكسلًا)، وبعده «الجوهرة» في CSS الصفحة.
 *
 * لا نصّ ولا رقم ولا شعار غير رمز سَدِيد، والإطار دالّةٌ في `t` وحده (والشرر من مولّدٍ ثابت
 * البذرة). والقصّ على شكل الرمز بمساره المقيس (`HEX_PATH`) لا بصورة قناع: `<Img>` وحده ينتظره
 * Remotion حتى يُحمَّل، و`url()` في CSS لا.
 */
import type { CSSProperties, FC } from "react";
import { Img, staticFile } from "remotion";
import { box, cine, CX, CY, glide, H, lerp, outSoft, ramp, seeded, TAU, W, type Pt } from "./kit";
import { ACT, EMBLEM, FORGE, HERO } from "./timeline";

/* ─────────────────────────────── المصادر والهندسة ─────────────────────────────── */

const PLATE = "sadeed-banner-clean.webp";
const MARK = "sadeed-emblem.webp";
/** سلك الرمز: خطوط Canny على إضاءة الرمز (CIE L) مُتتبَّعةً ومنعَّمة، بإطار الرمز نفسه 483². */
const WIRE = "sadeed-emblem-edges.webp";

/** الرمز وسلكه بإطارٍ واحد: 483 مربّعًا. */
const SRC = 483;

/** المسدّس (رأسه إلى أعلى) بوحدات المصدر، مقيسًا على قناة الشفافية: المركز، والجانب، والرأس. */
const HEX = { cx: 240.5, cy: 240.5, inner: 206.5, outer: 235.5 } as const;

/** محيط الرمز نفسه — قناة الشفافية مبسَّطةً بخطأ 1px (تطابقٌ 99.86%) — للقصّ بلا صورة قناع. */
const HEX_PATH =
  "M238,5 L228,9 L53,111 L44,115 L37,122 L34,130 L34,351 L37,359 L44,366 L53,370 L234,475 " +
  "L243,476 L252,473 L293,448 L437,366 L444,359 L447,351 L447,130 L444,122 L437,115 L293,33 " +
  "L252,8 L243,5 Z";

/** لحظات المقطع: ما لم يُثبَّت في `timeline.ts` مشتقٌّ منه هنا. */
const T = {
  start: ACT.montageEnd,
  /** مدّة مسيرة نقطة التماس في رشقة الليزر. */
  sweep: 0.4,
  scanFrom: FORGE.scanFrom,
  done: FORGE.complete,
  glide: ACT.forgeEnd,
  /** يستقرّ الرمز في موضعه من اللوحة — قبل عودة النصّ (21.6) يكون قد غادر منطقته. */
  land: 21.9,
  plate: [20.6, 22.4],
  hole: [21.75, 22.3],
  /** يذوب الرمز البطل في رمز اللوحة نفسه وقد اكتملت حدّتها. */
  handoff: [22.35, 22.75],
  /** يُرسم إطار اللوحة بالضوء والخلفية بعدُ داكنة — ثم يمتلئ زجاجها. */
  rim: [20.7, 22.3],
  lock: 21.8,
  glints: [23.05, 23.3, 23.55],
  shimmer: [23.2, 23.9],
  /** بعدها لا شيء فوق اللوحة. */
  quiet: 23.9,
} as const;

const lin = (x: number) => x;
const easeIn = (x: number) => x * x;

/** غلافٌ زمنيّ: صعودٌ a→b ثم هبوطٌ c→d. */
function env(t: number, a: number, b: number, c: number, d: number, ease = lin): number {
  return ramp(t, a, b, ease) * (1 - ramp(t, c, d, ease));
}

/** اضمحلالٌ أسّيّ من لحظةٍ (صفرٌ قبلها). */
function decay(t: number, at: number, tau: number): number {
  return t < at ? 0 : Math.exp(-(t - at) / tau);
}

const f2 = (n: number) => n.toFixed(2);

type Geo = { cx: number; cy: number; size: number };
const AT_HERO: Geo = { cx: HERO.cx, cy: HERO.cy, size: HERO.size };

/** الرمز البطل: في المركز حتى نهاية الصياغة، ثم ينساب على قوسٍ صاعدٍ قليلًا إلى موضعه من اللوحة. */
function heroAt(t: number): Geo {
  const u = ramp(t, T.glide, T.land, cine);
  return {
    cx: lerp(HERO.cx, EMBLEM.cx, u),
    cy: lerp(HERO.cy, EMBLEM.cy, u) - 34 * Math.sin(Math.PI * u),
    size: lerp(HERO.size, EMBLEM.size, u),
  };
}

const geoBox = (g: Geo): CSSProperties => box(g.cx - g.size / 2, g.cy - g.size / 2, g.size, g.size);

function hexCentre(g: Geo): Pt {
  const k = g.size / SRC;
  return { x: g.cx - g.size / 2 + HEX.cx * k, y: g.cy - g.size / 2 + HEX.cy * k };
}

/** نقطةٌ على حافّة المسدّس عند زاوية φ بالدرجات (0 أعلى، مع عقارب الساعة — اصطلاح conic-gradient). */
function rimPoint(g: Geo, phi: number): Pt {
  const d = ((((phi % 60) + 60) % 60) - 30) * (Math.PI / 180);
  const r = Math.min(HEX.inner / Math.cos(d), HEX.outer) * (g.size / SRC);
  const a = phi * (Math.PI / 180);
  const c = hexCentre(g);
  return { x: c.x + r * Math.sin(a), y: c.y - r * Math.cos(a) };
}

/** نصف عرض المسدّس على ارتفاعٍ dy من مركزه (وحدات المصدر). */
function hexHalfWidth(dy: number): number {
  const a = Math.abs(dy);
  if (a <= HEX.outer / 2) return HEX.inner;
  return Math.max(0, (HEX.inner * (HEX.outer - a)) / (HEX.outer / 2));
}

/* ─────────────────────────────── الشرر والبريق ─────────────────────────────── */

type Spark = {
  t0: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  w: number;
  warm: boolean;
};

/** شررٌ ثقيل: جاذبيّةٌ ومقاومة هواء — موضعه بعد τ ثانية من انطلاقه (حلٌّ مغلق، لا تراكم). */
const GRAVITY = 1300;
const DRAG = 2.4;
function sparkAt(s: Spark, tau: number): Pt {
  const e = (1 - Math.exp(-DRAG * tau)) / DRAG;
  const vt = GRAVITY / DRAG;
  return { x: s.x + s.vx * e, y: s.y + vt * tau + (s.vy - vt) * e };
}

/** الشرر خطوطٌ قصيرة على اتّجاه حركتها: أبيض متّقد يبرد إلى السماويّ (وقليلٌ ذهبيّ دافئ). */
const Sparks: FC<{ list: readonly Spark[]; t: number; glow?: boolean }> = ({ list, t, glow }) => (
  <g>
    {list.map((s, i) => {
      const tau = t - s.t0;
      if (tau < 0 || tau > s.life) return null;
      const a = tau / s.life;
      const p1 = sparkAt(s, tau);
      const p0 = sparkAt(s, Math.max(0, tau - 0.026));
      const hot = a < 0.28;
      return (
        <line
          key={i}
          x1={f2(p0.x)}
          y1={f2(p0.y)}
          x2={f2(p1.x)}
          y2={f2(p1.y)}
          stroke={hot ? "#fffbf2" : s.warm ? "#ffd9a0" : "#9fe9ff"}
          strokeWidth={(glow ? 3.2 : 1) * s.w * (1 - 0.55 * a)}
          strokeLinecap="round"
          opacity={Math.pow(1 - a, 1.3) * (glow ? 0.5 : 1)}
        />
      );
    })}
  </g>
);

/** نجمة بريقٍ رباعيّة: شعاعان طويلان وقُطريّان قصيران وهالة. */
const Star: FC<{ x: number; y: number; len: number; o: number; rot?: number; glow: string }> = ({
  x,
  y,
  len,
  o,
  rot = 0,
  glow,
}) => (
  <g transform={`translate(${f2(x)} ${f2(y)}) rotate(${f2(rot)})`} opacity={o}>
    <circle r={len * 0.42} fill={`url(#${glow})`} />
    <ellipse rx={len} ry={Math.max(1, len * 0.022)} fill="#ffffff" />
    <ellipse rx={Math.max(1, len * 0.02)} ry={len * 0.66} fill="#ffffff" />
    <ellipse rx={len * 0.3} ry={0.9} fill="#e3f8ff" transform="rotate(45)" />
    <ellipse rx={len * 0.3} ry={0.9} fill="#e3f8ff" transform="rotate(-45)" />
    <circle r={Math.max(1.6, len * 0.045)} fill="#ffffff" />
  </g>
);

/** تدرّج هالةٍ للنجوم والوهج: أبيض في القلب، سماويّ، ثم لا شيء. */
const GlowGradient: FC<{ id: string; core?: string; edge?: string }> = ({
  id,
  core = "#ffffff",
  edge = "#5fd2ff",
}) => (
  <radialGradient id={id}>
    <stop offset="0%" stopColor={core} stopOpacity="0.95" />
    <stop offset="22%" stopColor={edge} stopOpacity="0.55" />
    <stop offset="60%" stopColor={edge} stopOpacity="0.12" />
    <stop offset="100%" stopColor={edge} stopOpacity="0" />
  </radialGradient>
);

/** مرشّح تمويهٍ على الإطار كلّه (لا على صندوق العنصر: الخطّ الأفقيّ صندوقه بلا ارتفاع). */
const Blur: FC<{ id: string; sd: number }> = ({ id, sd }) => (
  <filter id={id} filterUnits="userSpaceOnUse" x={-200} y={-200} width={W + 400} height={H + 400}>
    <feGaussianBlur stdDeviation={sd} />
  </filter>
);

/* ─────────────────────────── ١ الفراغ الكحليّ والانطواء ─────────────────────────── */

const VOID_BG =
  "radial-gradient(54% 80% at 50% 50%, #0c2a68 0%, #071b4a 36%, #041134 66%, #020a1d 100%)";
const LIFT_BG =
  "radial-gradient(30% 54% at 50% 50%, rgba(90,180,255,0.38) 0%, rgba(40,110,230,0.13) 45%, rgba(10,40,120,0) 78%)";

/** أفق الأرضيّة الشبكيّة: تحت مركز الرمز — فيطفو فوقها. */
const HORIZON = 500;

const DUST = (() => {
  const rnd = seeded(311);
  return Array.from({ length: 64 }, () => ({
    x: rnd() * W,
    y: 30 + rnd() * (H - 60),
    vx: -(5 + rnd() * 16),
    vy: -(1 + rnd() * 6),
    r: 0.7 + rnd() * 1.5,
    a: 0.16 + rnd() * 0.4,
    f: 0.35 + rnd() * 0.9,
    ph: rnd() * TAU,
  }));
})();

const VoidLayer: FC<{ t: number }> = ({ t }) => {
  // اللوحة معتمةٌ تمامًا بعد اكتمالها — فلا يُرسم تحتها شيء.
  if (t > T.plate[1] + 0.05) return null;
  const lift = 1 - ramp(t, T.start, 16.95, outSoft);
  const grid = ramp(t, 16.75, 17.4) * (1 - ramp(t, 20.5, 21.6));
  // غبار النجوم حاضرٌ من أوّل إطار كما في آخر المونتاج، ويخفت قليلًا والنقطة تنطوي
  const dust = (0.75 + 0.25 * ramp(t, 16.95, 17.8)) * (1 - ramp(t, 21.0, 22.3));
  const dt = t - T.start;
  const scroll = (dt * 0.5) % 1;
  const rungs: number[] = [];
  for (let j = 0; j < 24; j++) {
    const z = 1 + j - scroll;
    if (z > 0.35) rungs.push(HORIZON + (H - HORIZON) / z);
  }
  return (
    <>
      <div style={{ ...box(0, 0, W, H), background: VOID_BG }} />
      {lift > 0.001 ? (
        <div style={{ ...box(0, 0, W, H), background: LIFT_BG, opacity: lift }} />
      ) : null}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={box(0, 0, W, H)}>
        <defs>
          <linearGradient
            id="fgFloorV"
            x1="0"
            y1={HORIZON}
            x2="0"
            y2={H}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.3" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="fgFloorH" x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.28" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.72" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="fgFloorMaskV" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <rect x={0} y={HORIZON} width={W} height={H - HORIZON} fill="url(#fgFloorV)" />
          </mask>
          <mask id="fgFloorMaskH" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <rect x={0} y={0} width={W} height={H} fill="url(#fgFloorH)" />
          </mask>
          <radialGradient id="fgHorizon">
            <stop offset="0%" stopColor="#7fd8ff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7fd8ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {grid > 0 ? (
          <g opacity={grid}>
            <ellipse cx={CX} cy={HORIZON} rx={980} ry={26} fill="url(#fgHorizon)" opacity={0.55} />
            <g mask="url(#fgFloorMaskV)">
              <g mask="url(#fgFloorMaskH)" stroke="#5cbcff" strokeWidth={1.1} strokeOpacity={0.2}>
                {Array.from({ length: 37 }, (_, i) => {
                  const k = i - 18;
                  return (
                    <line
                      key={`l${k}`}
                      x1={CX}
                      y1={HORIZON}
                      x2={CX + k * 300}
                      y2={HORIZON + 2 * (H - HORIZON)}
                    />
                  );
                })}
                {rungs.map((y, j) => (
                  <line key={`r${j}`} x1={0} y1={f2(y)} x2={W} y2={f2(y)} />
                ))}
              </g>
            </g>
          </g>
        ) : null}
        {dust > 0
          ? DUST.map((m, i) => {
              const x = (((m.x + m.vx * dt) % W) + W) % W;
              const y = m.y + m.vy * dt + 6 * Math.sin(TAU * 0.3 * dt + m.ph);
              const tw = 0.55 + 0.45 * Math.sin(TAU * m.f * dt + m.ph);
              return (
                <circle
                  key={i}
                  cx={f2(x)}
                  cy={f2(y)}
                  r={m.r}
                  fill="#dff4ff"
                  opacity={m.a * tw * dust}
                />
              );
            })
          : null}
      </svg>
    </>
  );
};

const STREAKS = (() => {
  const rnd = seeded(73);
  return Array.from({ length: 48 }, () => ({
    a: rnd() * TAU,
    r0: 340 + rnd() * 980,
    s: T.start + rnd() * 0.24,
    o: 0.25 + rnd() * 0.6,
    w: 0.8 + rnd() * 1.7,
  }));
})();

/** نقطة المونتاج تنطوي: هالتها تنكمش متسارعةً، وحلقاتٌ وخطوط ضوءٍ تُسحب إليها، ثم بريقٌ أخير. */
const Implosion: FC<{ t: number }> = ({ t }) => {
  if (t < T.start || t > 17.16) return null;
  const end = 16.97;
  const u = ramp(t, T.start, end, easeIn);
  const core = t < end ? 1 : 1 - ramp(t, end, end + 0.05, lin);
  const pin = env(t, 16.93, 16.985, 17.0, 17.16);
  const ringsIn = ramp(t, T.start, T.start + 0.12, lin);
  // خطّا الوهج الأفقيّ والعموديّ كما تركهما المونتاج على نقطته — ينطويان معها
  const sx = 560 * Math.pow(1 - u, 1.2);
  const sy = 90 * Math.pow(1 - u, 1.2);
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ ...box(0, 0, W, H), mixBlendMode: "screen" }}
    >
      <defs>
        <GlowGradient id="fgSeed" />
        <GlowGradient id="fgSeedStar" />
        <Blur id="fgImpSoft" sd={2.5} />
      </defs>
      {[660, 1020, 1420].map((r0, i) => {
        const v = ramp(t, T.start + i * 0.05, end, easeIn);
        const r = r0 * Math.pow(1 - v, 1.25);
        if (r < 4 || v >= 1) return null;
        return (
          <circle
            key={i}
            cx={CX}
            cy={CY}
            r={f2(r)}
            fill="none"
            stroke="#a6e8ff"
            strokeWidth={1.2 + 5 * (1 - v)}
            opacity={(0.1 + 0.5 * v) * core * ringsIn}
            filter="url(#fgImpSoft)"
          />
        );
      })}
      {sx > 2 ? (
        <g opacity={core}>
          <line
            x1={f2(CX - sx)}
            y1={CY}
            x2={f2(CX + sx)}
            y2={CY}
            stroke="#9fe0ff"
            strokeWidth={7}
            opacity={0.5}
            filter="url(#fgImpSoft)"
          />
          <line
            x1={f2(CX - sx)}
            y1={CY}
            x2={f2(CX + sx)}
            y2={CY}
            stroke="#ffffff"
            strokeWidth={1.8}
          />
          <line
            x1={CX}
            y1={f2(CY - sy)}
            x2={CX}
            y2={f2(CY + sy)}
            stroke="#ffffff"
            strokeWidth={1.6}
          />
        </g>
      ) : null}
      {STREAKS.map((s, i) => {
        const w = ramp(t, s.s, end, lin);
        if (w <= 0 || w >= 1) return null;
        const r = s.r0 * (1 - w * w);
        const len = 12 + 190 * w;
        const ca = Math.cos(s.a);
        const sa = Math.sin(s.a);
        return (
          <line
            key={i}
            x1={f2(CX + ca * r)}
            y1={f2(CY + sa * r)}
            x2={f2(CX + ca * (r + len))}
            y2={f2(CY + sa * (r + len))}
            stroke="#dcf6ff"
            strokeWidth={s.w}
            strokeLinecap="round"
            opacity={s.o * Math.sin(Math.PI * w)}
          />
        );
      })}
      <circle
        cx={CX}
        cy={CY}
        r={f2(40 + 360 * Math.pow(1 - u, 1.5))}
        fill="url(#fgSeed)"
        opacity={0.9 * Math.pow(1 - u, 0.7) * core}
      />
      <circle
        cx={CX}
        cy={CY}
        r={f2(1.5 + 15 * Math.pow(1 - u, 0.6))}
        fill="#ffffff"
        opacity={core}
      />
      {pin > 0 ? <Star x={CX} y={CY} len={54} o={pin} glow="fgSeedStar" /> : null}
    </svg>
  );
};

/* ─────────────────────────── ٢ الليزر ينقش السلك ─────────────────────────── */

type Shot = { at: number; from: Pt; q: number };

/**
 * أربع رشقاتٍ متقاطعة من خارج الإطار، كلٌّ تنقش ربعها مع عقارب الساعة (q بداية الربع، 0 أعلى):
 * السفلى اليسرى ← (جنوب←غرب)، العليا اليمنى ← (شمال←شرق)، السفلى اليمنى ← (شرق←جنوب)، العليا
 * اليسرى ← (غرب←شمال). الأرباع السفلى أوّلًا: المسح الصاعد (18.6) يمرّ بها وقد اكتملت.
 */
const SHOTS: readonly Shot[] = [
  { at: FORGE.lasers[0], from: { x: -90, y: H + 120 }, q: 180 },
  { at: FORGE.lasers[1], from: { x: W + 90, y: -120 }, q: 0 },
  { at: FORGE.lasers[2], from: { x: W + 90, y: H + 120 }, q: 90 },
  { at: FORGE.lasers[3], from: { x: -90, y: -120 }, q: 270 },
];

const sweepOf = (s: Shot, t: number) => ramp(t, s.at + 0.03, s.at + 0.03 + T.sweep, glide);
const contactOf = (s: Shot, t: number) => rimPoint(AT_HERO, s.q + 90 * sweepOf(s, t));

/** شدّة الشعاع: انطلاقٌ في إطارٍ ونصف على النبضة، وانقطاعٌ بعد اكتمال الربع. */
function beamLevel(s: Shot, t: number): number {
  if (t < s.at) return 0;
  return ramp(t, s.at, s.at + 0.05, lin) * (1 - ramp(t, s.at + 0.44, s.at + 0.5, lin));
}

/** السلك المنقوش حتى الآن: أربعة أرباعٍ زاويّة، كلٌّ حتى موضع نقطة تماسه. */
function etchMask(t: number): string {
  const stops: string[] = [];
  for (const q of [0, 90, 180, 270]) {
    const s = SHOTS.find((x) => x.q === q);
    const p = s ? 90 * sweepOf(s, t) : 0;
    if (p <= 0) stops.push(`transparent ${q}deg`, `transparent ${q + 90}deg`);
    else if (p >= 90) stops.push(`#000 ${q}deg`, `#000 ${q + 90}deg`);
    else
      stops.push(
        `#000 ${q}deg`,
        `#000 ${f2(q + p - 0.7)}deg`,
        `transparent ${f2(q + p + 0.7)}deg`,
        `transparent ${q + 90}deg`,
      );
  }
  return `conic-gradient(from 0deg at 50% 50%, ${stops.join(", ")})`;
}

/** السلك المتّقد خلف نقطة التماس: 40° تبرد تدريجًا. */
function hotMask(s: Shot, t: number): string {
  const a = s.q + 90 * sweepOf(s, t);
  return `conic-gradient(from 0deg at 50% 50%, transparent ${f2(Math.max(s.q, a - 40))}deg, #000 ${f2(a - 0.6)}deg, transparent ${f2(a + 0.6)}deg)`;
}

/** أين يدخل الشعاع الإطار (Liang–Barsky) — هناك وهجُ مصدره. */
function entryPoint(a: Pt, b: Pt): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ps = [-dx, dx, -dy, dy];
  const qs = [a.x, W - a.x, a.y, H - a.y];
  let u = 0;
  for (let i = 0; i < 4; i++) if (ps[i] < 0) u = Math.max(u, qs[i] / ps[i]);
  return { x: a.x + dx * u, y: a.y + dy * u };
}

const LASER_SPARKS: readonly Spark[] = (() => {
  const rnd = seeded(97);
  const c = hexCentre(AT_HERO);
  const out: Spark[] = [];
  for (const s of SHOTS) {
    for (let j = 0; j < 27; j++) {
      const t0 = s.at + 0.015 + j * (T.sweep / 26);
      const p = contactOf(s, t0);
      const base = Math.atan2(p.y - c.y, p.x - c.x);
      const n = j === 0 ? 22 : 4;
      for (let i = 0; i < n; i++) {
        const a = base + (rnd() - 0.5) * 2.5;
        const sp = 280 + rnd() * (j === 0 ? 1200 : 820);
        out.push({
          t0,
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 140,
          life: 0.22 + rnd() * 0.42,
          w: 1.1 + rnd() * 1.7,
          warm: rnd() < 0.22,
        });
      }
    }
  }
  return out;
})();

const Beam: FC<{ s: Shot; t: number; k: number }> = ({ s, t, k }) => {
  const level = beamLevel(s, t);
  const after = t > s.at + 0.44 ? 0.45 * (1 - ramp(t, s.at + 0.44, s.at + 0.95, lin)) : 0;
  if (level <= 0 && after <= 0) return null;
  const c = contactOf(s, t);
  const e = entryPoint(s.from, c);
  const zap = decay(t, s.at, 0.07);
  const jit = 1 + 0.1 * Math.sin(t * 173 + k * 1.7) + 0.06 * Math.sin(t * 311 + k * 2.9);
  const seg = { x1: f2(s.from.x), y1: f2(s.from.y), x2: f2(c.x), y2: f2(c.y) };
  return (
    <g>
      {after > 0 ? (
        <line
          {...seg}
          stroke="#7fdcff"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={after * (1 - level)}
          filter="url(#fgBeamMid)"
        />
      ) : null}
      {level > 0 ? (
        <>
          <line
            {...seg}
            stroke="#2a9cff"
            strokeWidth={f2(30 * jit * (1 + 0.7 * zap))}
            strokeLinecap="round"
            opacity={0.34 * level}
            filter="url(#fgBeamWide)"
          />
          <line
            {...seg}
            stroke="#8ae7ff"
            strokeWidth={f2(8 * jit)}
            strokeLinecap="round"
            opacity={0.75 * level}
            filter="url(#fgBeamMid)"
          />
          <line
            {...seg}
            stroke="url(#fgBeamCore)"
            strokeWidth={f2(2.6 * jit)}
            strokeLinecap="round"
            opacity={level}
          />
          <circle cx={f2(e.x)} cy={f2(e.y)} r={120} fill="url(#fgFlare)" opacity={0.5 * level} />
          <circle
            cx={f2(c.x)}
            cy={f2(c.y)}
            r={f2(64 * (1 + 0.9 * zap))}
            fill="url(#fgFlare)"
            opacity={level}
          />
          {zap > 0.02 ? (
            <circle cx={f2(c.x)} cy={f2(c.y)} r={170} fill="url(#fgZap)" opacity={0.55 * zap} />
          ) : null}
          <Star
            x={c.x}
            y={c.y}
            len={70 * (1 + 0.6 * zap) * jit}
            o={level}
            rot={8 * Math.sin(t * 9 + k)}
            glow="fgFlare"
          />
        </>
      ) : null}
    </g>
  );
};

const Lasers: FC<{ t: number }> = ({ t }) => {
  if (t < FORGE.lasers[0] || t > FORGE.lasers[3] + 1.05) return null;
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ ...box(0, 0, W, H), mixBlendMode: "screen" }}
    >
      <defs>
        <Blur id="fgBeamWide" sd={9} />
        <Blur id="fgBeamMid" sd={2.4} />
        <Blur id="fgSparkGlow" sd={2.2} />
        <GlowGradient id="fgFlare" />
        <radialGradient id="fgZap">
          <stop offset="0%" stopColor="#e9fbff" stopOpacity="0.8" />
          <stop offset="35%" stopColor="#58c8ff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#58c8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fgBeamCore" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#bdefff" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      {SHOTS.map((s, k) => (
        <Beam key={k} s={s} t={t} k={k} />
      ))}
      <g filter="url(#fgSparkGlow)">
        <Sparks list={LASER_SPARKS} t={t} glow />
      </g>
      <Sparks list={LASER_SPARKS} t={t} />
    </svg>
  );
};

/* ─────────────────────────── ٣ المسح الصاعد يبني الرمز ─────────────────────────── */

/** المستوى من تحت رأس المسدّس السفليّ إلى فوق العلويّ، متسارعًا نحو ضربة الاكتمال. */
const SCAN = { from: 652, to: 70 } as const;
function planeY(t: number): number {
  return lerp(SCAN.from, SCAN.to, Math.pow(ramp(t, T.scanFrom, T.done, lin), 1.3));
}

function chordAt(y: number): { xL: number; xR: number; half: number } {
  const c = hexCentre(AT_HERO);
  const k = HERO.size / SRC;
  const half = hexHalfWidth((y - c.y) / k) * k;
  return { xL: c.x - half, xR: c.x + half, half };
}

const SCAN_SPARKS: readonly Spark[] = (() => {
  const rnd = seeded(211);
  const out: Spark[] = [];
  const n = 46;
  for (let j = 0; j < n; j++) {
    const t0 = T.scanFrom + 0.02 + (j * (T.done - T.scanFrom - 0.04)) / (n - 1);
    const y = planeY(t0);
    const { xL, xR, half } = chordAt(y);
    if (half < 6) continue;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const a = (side < 0 ? Math.PI : 0) + side * (0.15 + rnd() * 0.9);
        const sp = 220 + rnd() * 620;
        out.push({
          t0,
          x: side < 0 ? xL : xR,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp * 0.6 - 60,
          life: 0.3 + rnd() * 0.4,
          w: 1 + rnd() * 1.5,
          warm: rnd() < 0.2,
        });
      }
    }
    // انسكابٌ على امتداد المستوى فوق الرمز
    const x = xL + rnd() * (xR - xL);
    const a = Math.PI / 2 + (rnd() - 0.5) * 1.6;
    out.push({
      t0,
      x,
      y,
      vx: Math.cos(a) * 160,
      vy: Math.sin(a) * 160,
      life: 0.25 + rnd() * 0.3,
      w: 0.9 + rnd(),
      warm: false,
    });
  }
  return out;
})();

const ScanPlane: FC<{ t: number }> = ({ t }) => {
  const level = env(t, T.scanFrom, T.scanFrom + 0.06, T.done - 0.02, T.done + 0.08);
  const sparksLive = t >= T.scanFrom && t < T.done + 0.75;
  if (level <= 0 && !sparksLive) return null;
  const y = planeY(t);
  const { xL, xR, half } = chordAt(y);
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ ...box(0, 0, W, H), mixBlendMode: "screen" }}
    >
      <defs>
        <Blur id="fgPlaneGlow" sd={6} />
        <Blur id="fgScanSpark" sd={2.2} />
        <GlowGradient id="fgPlaneFlare" />
        <linearGradient id="fgPlaneLine" x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6fd6ff" stopOpacity="0" />
          <stop offset="0.28" stopColor="#6fd6ff" stopOpacity="0.3" />
          <stop offset="0.5" stopColor="#eafcff" stopOpacity="0.95" />
          <stop offset="0.72" stopColor="#6fd6ff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#6fd6ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fgPlaneBand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fcfff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#9fe6ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#5fcfff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {level > 0 ? (
        <g opacity={level}>
          <rect
            x={0}
            y={f2(y - 12)}
            width={W}
            height={24}
            fill="url(#fgPlaneLine)"
            opacity={0.4}
            filter="url(#fgPlaneGlow)"
          />
          <rect x={0} y={f2(y - 1)} width={W} height={2} fill="url(#fgPlaneLine)" />
          {half > 2 ? (
            <>
              <rect
                x={f2(xL - 40)}
                y={f2(y - 52)}
                width={f2(2 * half + 80)}
                height={104}
                fill="url(#fgPlaneBand)"
                opacity={0.45}
              />
              <line
                x1={f2(xL)}
                y1={f2(y)}
                x2={f2(xR)}
                y2={f2(y)}
                stroke="#8ae6ff"
                strokeWidth={14}
                opacity={0.6}
                filter="url(#fgPlaneGlow)"
              />
              <line
                x1={f2(xL)}
                y1={f2(y)}
                x2={f2(xR)}
                y2={f2(y)}
                stroke="#ffffff"
                strokeWidth={3}
              />
              <Star x={xL} y={y} len={58} o={1} glow="fgPlaneFlare" rot={4 * Math.sin(t * 13)} />
              <Star x={xR} y={y} len={58} o={1} glow="fgPlaneFlare" rot={-4 * Math.sin(t * 11)} />
            </>
          ) : null}
        </g>
      ) : null}
      {sparksLive ? (
        <>
          <g filter="url(#fgScanSpark)">
            <Sparks list={SCAN_SPARKS} t={t} glow />
          </g>
          <Sparks list={SCAN_SPARKS} t={t} />
        </>
      ) : null}
    </svg>
  );
};

/* ─────────────────────────── الرمز البطل في كل أطواره ─────────────────────────── */

/** الهالة خلف الرمز: تتجمّع في المسح، تبلغ ذروتها في الاكتمال، تهدأ، ثم تخبو وهو ينساب. */
function haloLevel(t: number): number {
  const build = 0.35 * ramp(t, 18.9, T.done, lin);
  const burst = t >= T.done ? 0.65 * (0.45 + 0.55 * Math.exp(-(t - T.done) / 0.35)) : 0;
  return (build + burst) * (1 - ramp(t, T.glide, 21.5, lin));
}

const Hero: FC<{ t: number }> = ({ t }) => {
  if (t < 16.93 || t >= T.handoff[1]) return null;
  const g = heroAt(t);
  const full = box(0, 0, g.size, g.size);
  const mark = staticFile(MARK);
  const wire = staticFile(WIRE);
  const top = g.cy - g.size / 2;
  const pct = ((planeY(t) - top) / g.size) * 100;
  const scanning = t >= T.scanFrom && t < T.done;
  const wireOn = t < T.done + 0.04;
  const wireMask =
    t >= T.scanFrom
      ? `linear-gradient(to bottom, #000 ${f2(pct)}%, transparent ${f2(pct + 11)}%)`
      : undefined;
  const solidMask = scanning
    ? `linear-gradient(to bottom, transparent ${f2(pct - 0.5)}%, #000 ${f2(pct + 0.5)}%)`
    : undefined;
  const bandMask = `linear-gradient(to bottom, transparent ${f2(pct)}%, #000 ${f2(pct + 0.6)}%, transparent ${f2(pct + 9)}%)`;
  const etch = etchMask(t);
  const blueprint = 0.12 * env(t, 16.95, 17.22, 18.55, 19.2);
  const unfold = 0.55 + 0.45 * ramp(t, 16.95, 17.28, outSoft);
  const halo = haloLevel(t);
  const flash = t < T.hole[1] ? 0.75 * decay(t, T.done, 0.2) + 0.3 * decay(t, T.lock, 0.16) : 0;
  const fade = 1 - ramp(t, T.handoff[0], T.handoff[1], lin);
  return (
    <div style={geoBox(g)}>
      {halo > 0.002 ? (
        <Img
          src={mark}
          style={{
            ...full,
            transform: "scale(1.1)",
            filter: "blur(30px) brightness(1.7) saturate(1.25)",
            opacity: halo,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      {blueprint > 0.002 ? (
        <Img
          src={wire}
          style={{ ...full, opacity: blueprint, transform: `scale(${f2(unfold)})` }}
        />
      ) : null}
      {wireOn && t >= FORGE.lasers[0] ? (
        <div style={{ ...full, maskImage: wireMask, WebkitMaskImage: wireMask }}>
          <Img src={wire} style={{ ...full, maskImage: etch, WebkitMaskImage: etch }} />
          {/* توهّج النيون حول السلك المنقوش */}
          <Img
            src={wire}
            style={{
              ...full,
              maskImage: etch,
              WebkitMaskImage: etch,
              filter: "blur(4px) brightness(1.9)",
              opacity: 0.85,
            }}
          />
        </div>
      ) : null}
      {SHOTS.map((s, k) => {
        const hot = t < s.at ? 0 : 1 - ramp(t, s.at + 0.44, s.at + 0.85, lin);
        if (hot <= 0) return null;
        const m = hotMask(s, t);
        return (
          <Img
            key={k}
            src={wire}
            style={{
              ...full,
              maskImage: m,
              WebkitMaskImage: m,
              filter: "brightness(2.4) saturate(0.35)",
              mixBlendMode: "screen",
              opacity: hot,
            }}
          />
        );
      })}
      {t >= T.scanFrom ? (
        <Img
          src={mark}
          style={{
            ...full,
            maskImage: solidMask,
            WebkitMaskImage: solidMask,
            filter: flash > 0.002 ? `brightness(${(1 + flash).toFixed(3)})` : undefined,
            opacity: fade,
          }}
        />
      ) : null}
      {scanning ? (
        <Img
          src={mark}
          style={{
            ...full,
            maskImage: bandMask,
            WebkitMaskImage: bandMask,
            filter: "brightness(2.2) saturate(0.75)",
            mixBlendMode: "screen",
          }}
        />
      ) : null}
    </div>
  );
};

/**
 * أثرُ ضوءٍ خلف الرمز وهو ينساب: ثماني نسخٍ متأخّرة متقاربة ممموَّهة — لطخةُ حركةٍ متّصلة لا أصداءٌ
 * متدرّجة (ثلاث نسخٍ متباعدة بدت حوافّ مكرّرة على الإطار 630) — تتلاشى عند البدء والهبوط.
 */
const TRAIL_LAGS = Array.from({ length: 8 }, (_, i) => 0.016 * (i + 1));

const Trail: FC<{ t: number }> = ({ t }) => {
  if (t <= T.glide + 0.02 || t >= T.land) return null;
  const speed = Math.sin(Math.PI * ramp(t, T.glide, T.land, lin));
  const mark = staticFile(MARK);
  return (
    <>
      {TRAIL_LAGS.map((lag, i) => (
        <Img
          key={i}
          src={mark}
          style={{
            ...geoBox(heroAt(t - lag)),
            filter: "blur(7px) brightness(1.3)",
            mixBlendMode: "screen",
            opacity: 0.15 * (1 - i / TRAIL_LAGS.length) * speed,
          }}
        />
      ))}
    </>
  );
};

/* ─────────────────────────── ٤ الإشعاع ─────────────────────────── */

function raysOf(n: number, seed: number, spread: number, wMin: number, wMax: number): string {
  const rnd = seeded(seed);
  return Array.from({ length: n }, (_, i) => {
    const a = (i + 0.5 + (rnd() - 0.5) * spread) * (360 / n);
    const w = wMin + rnd() * (wMax - wMin);
    const o = 0.3 + rnd() * 0.7;
    return `rgba(205,238,255,0) ${f2(a - w)}deg, rgba(205,238,255,${o.toFixed(2)}) ${f2(a)}deg, rgba(205,238,255,0) ${f2(a + w)}deg`;
  }).join(", ");
}

const RAYS_WIDE = raysOf(18, 23, 0.3, 1.4, 4.6);
const RAYS_FINE = raysOf(40, 41, 0.3, 0.35, 1.2);
const RAY_FALLOFF =
  "radial-gradient(circle at 50% 50%, transparent 150px, #000 270px, rgba(0,0,0,0.45) 640px, transparent 1280px)";

function burstLevel(t: number): number {
  if (t < T.done) return 0;
  return (
    ramp(t, T.done, T.done + 0.06, lin) *
    (0.3 + 0.7 * Math.exp(-(t - T.done) / 0.5)) *
    (1 - ramp(t, T.glide, 21.05, lin))
  );
}

/** خلف الرمز: أشعّةٌ تدور ببطء (طبقتان متعاكستان) ووهجٌ مركزيّ — يتبعان الرمز وهو ينساب. */
const RadianceBack: FC<{ t: number }> = ({ t }) => {
  const gather = 0.3 * ramp(t, 18.9, T.done, lin) * (1 - ramp(t, T.glide, 21.2, lin));
  const rays = burstLevel(t);
  if (rays <= 0 && gather <= 0) return null;
  const c = hexCentre(heroAt(t));
  const R = 1300;
  const spin = t - T.done;
  const disk = (rot: number, stops: string, o: number) => (
    <div
      style={{
        ...box(c.x - R, c.y - R, 2 * R, 2 * R),
        background: `conic-gradient(from ${f2(rot)}deg at 50% 50%, ${stops})`,
        maskImage: RAY_FALLOFF,
        WebkitMaskImage: RAY_FALLOFF,
        mixBlendMode: "screen",
        opacity: o,
      }}
    />
  );
  return (
    <>
      <div
        style={{
          ...box(0, 0, W, H),
          background: `radial-gradient(circle at ${f2(c.x)}px ${f2(c.y)}px, rgba(90,190,255,0.55) 0px, rgba(60,140,255,0.2) 300px, rgba(40,110,255,0) 620px)`,
          mixBlendMode: "screen",
          opacity: Math.min(1, gather + 0.9 * rays),
        }}
      />
      {rays > 0 ? disk(9 * spin, RAYS_WIDE, 0.75 * rays) : null}
      {rays > 0 ? disk(-6 * spin + 7, RAYS_FINE, 0.5 * rays) : null}
    </>
  );
};

const GLITTER = (() => {
  const rnd = seeded(509);
  const c = hexCentre(AT_HERO);
  return Array.from({ length: 120 }, () => {
    const a = rnd() * TAU;
    const r0 = 170 + rnd() * 100;
    const sp = 380 + rnd() * 1150;
    return {
      x: c.x + Math.cos(a) * r0,
      y: c.y + Math.sin(a) * r0,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.75 + rnd() * 0.85,
      r: 0.9 + rnd() * 2.1,
      f: 1.8 + rnd() * 2.6,
      ph: rnd() * TAU,
      star: rnd() < 0.12,
      warm: rnd() < 0.16,
    };
  });
})();

/** أمام الرمز: التوهّج والموجة الصادمة وخطّ الوهج الأفقيّ والبريق المتناثر. */
const RadianceFront: FC<{ t: number }> = ({ t }) => {
  if (t < T.done || t > T.done + 1.7) return null;
  const c = hexCentre(AT_HERO);
  const dt = t - T.done;
  const bloom = 0.8 * decay(t, T.done, 0.2);
  const wash = 0.7 * decay(t, T.done, 0.32);
  const streak = 0.9 * decay(t, T.done, 0.38) + 0.14 * env(t, T.done, T.done + 0.1, 20.3, 20.8);
  const stretch = 0.85 + 0.25 * Math.min(1, dt);
  const ring = (
    delay: number,
    span: number,
    reach: number,
    width: number,
    o: number,
    tone: string,
  ) => {
    const v = ramp(t, T.done + delay, T.done + delay + span, lin);
    if (v <= 0 || v >= 1) return null;
    // موجةٌ تتباطأ وهي تتّسع — تُرى تعبر الإطار لا تقفز خارجه
    const r = 260 + reach * (1 - Math.pow(1 - v, 2.2));
    const w = width * (1 - v) + 3;
    const a = o * Math.pow(1 - v, 1.2);
    return (
      <div
        style={{
          ...box(0, 0, W, H),
          background: `radial-gradient(circle at ${f2(c.x)}px ${f2(c.y)}px, rgba(${tone},0) ${f2(r - w)}px, rgba(${tone},${f2(a * 0.6)}) ${f2(r - w * 0.35)}px, rgba(255,255,255,${f2(a)}) ${f2(r)}px, rgba(${tone},0) ${f2(r + w * 0.5)}px)`,
          mixBlendMode: "screen",
        }}
      />
    );
  };
  return (
    <>
      {wash > 0.003 ? (
        <div
          style={{
            ...box(0, 0, W, H),
            background: `radial-gradient(circle at ${f2(c.x)}px ${f2(c.y)}px, rgba(140,210,255,0.55) 0px, rgba(80,160,255,0.26) 520px, rgba(40,110,255,0) 1350px)`,
            mixBlendMode: "screen",
            opacity: wash,
          }}
        />
      ) : null}
      {bloom > 0.003 ? (
        <div
          style={{
            ...box(0, 0, W, H),
            background: `radial-gradient(circle at ${f2(c.x)}px ${f2(c.y)}px, rgba(240,251,255,0.95) 0px, rgba(170,225,255,0.55) 170px, rgba(80,170,255,0.18) 480px, rgba(40,120,255,0) 900px)`,
            mixBlendMode: "screen",
            opacity: bloom,
          }}
        />
      ) : null}
      {ring(0, 1.0, 1300, 38, 0.8, "150,220,255")}
      {ring(0.12, 1.1, 1100, 20, 0.5, "90,190,255")}
      {streak > 0.003 ? (
        <>
          <div
            style={{
              ...box(c.x - 1300 * stretch, c.y - 45, 2600 * stretch, 90),
              background:
                "radial-gradient(50% 50% at 50% 50%, rgba(170,225,255,0.55) 0%, rgba(80,170,255,0.2) 30%, rgba(60,140,255,0) 100%)",
              mixBlendMode: "screen",
              opacity: streak,
            }}
          />
          <div
            style={{
              ...box(c.x - 1150, c.y - 5, 2300, 10),
              background:
                "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,1) 0%, rgba(190,235,255,0.75) 22%, rgba(120,200,255,0) 100%)",
              mixBlendMode: "screen",
              opacity: streak,
            }}
          />
        </>
      ) : null}
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ ...box(0, 0, W, H), mixBlendMode: "screen" }}
      >
        <defs>
          <GlowGradient id="fgGlitter" />
        </defs>
        {GLITTER.map((p, i) => {
          if (dt > p.life) return null;
          const e = (1 - Math.exp(-3 * dt)) / 3;
          const x = p.x + p.vx * e;
          const y = p.y + p.vy * e;
          const tw = 0.55 + 0.45 * Math.sin(TAU * p.f * dt + p.ph);
          const o = Math.pow(1 - dt / p.life, 1.2) * tw;
          return p.star ? (
            <Star key={i} x={x} y={y} len={9 + 3 * p.r} o={o} rot={40 * dt} glow="fgGlitter" />
          ) : (
            <circle
              key={i}
              cx={f2(x)}
              cy={f2(y)}
              r={p.r}
              fill={p.warm ? "#ffe6bf" : "#e8f9ff"}
              opacity={o}
            />
          );
        })}
      </svg>
    </>
  );
};

/* ─────────────────────────── ٥ تتكوّن اللوحة ويهبط الرمز ─────────────────────────── */

/**
 * فيضُ ضوءٍ سماويّ ينتشر من الرمز وهو ينساب، تحت اللوحة الذائبة: اللوحة الساطعة فوق الكحليّ
 * مباشرةً تمرّ في منتصف ذوبانها برماديٍّ باهت (قِيس على الإطار 640)، وفوق هذا الفيض تمرّ بأزرق مضيء —
 * فتتكوّن من الضوء لا من الضباب. وتغطّيه اللوحة كلّه حين تكتمل.
 */
const Flood: FC<{ t: number }> = ({ t }) => {
  if (t < T.glide || t > T.plate[1] + 0.05) return null;
  const c = hexCentre(heroAt(t));
  const R = 320 + 2300 * ramp(t, T.glide, 22.1, outSoft);
  return (
    <div
      style={{
        ...box(0, 0, W, H),
        background: `radial-gradient(circle at ${f2(c.x)}px ${f2(c.y)}px, rgba(170,222,255,0.95) 0px, rgba(96,176,255,0.88) ${f2(0.3 * R)}px, rgba(46,124,240,0.62) ${f2(0.62 * R)}px, rgba(22,78,200,0) ${f2(R)}px)`,
        // خطّيٌّ لا متسارع: السطوع من الصياغة الداكنة إلى اللوحة يتوزّع على ثانيتين تقريبًا
        opacity: ramp(t, T.glide, 21.7, lin),
      }}
    />
  );
};

/** نصف قطر الثقب في اللوحة تحت موضع الهبوط — يغطّي مسدّس رمزها كلّه بحافّةٍ ليّنة. */
const HOLE_R = 262;

const PlateLayer: FC<{ t: number }> = ({ t }) => {
  if (t < T.plate[0]) return null;
  const u = ramp(t, T.plate[0], T.plate[1], glide);
  const blur = 24 * (1 - u);
  const bright = 1 + 0.5 * (1 - u);
  const sharp = ramp(u, 0.86, 1, lin);
  const hole = HOLE_R * (1 - ramp(t, T.hole[0], T.hole[1], cine));
  const mask =
    hole > 0.5
      ? `radial-gradient(circle at ${EMBLEM.cx}px ${EMBLEM.cy}px, rgba(0,0,0,0) ${f2(hole * 0.82)}px, #000 ${f2(hole)}px)`
      : undefined;
  const plate = staticFile(PLATE);
  return (
    <div style={{ ...box(0, 0, W, H), opacity: u }}>
      {/* تحت الثقب: اللوحة نفسها ممسوحةً — مهبطٌ مضيء ينتظر الرمز، لا فجوةٌ كحليّة */}
      {mask ? (
        <Img
          src={plate}
          style={{
            ...box(0, 0, W, H),
            filter: `blur(${f2(blur + 30)}px) brightness(${(bright * 1.1).toFixed(3)})`,
          }}
        />
      ) : null}
      <div style={{ ...box(0, 0, W, H), maskImage: mask, WebkitMaskImage: mask }}>
        {/* تمويه Chromium دون ~1px يقفز إلى الحدّة في إطارٍ واحد (قِيس: 3.07/255 بين 664 و665)؛
            فالتمويه يقف عند 1.6px وتذوب فوقه اللوحة الحادّة في آخر المسافة */}
        {sharp < 1 ? (
          <Img
            src={plate}
            style={{
              ...box(0, 0, W, H),
              filter: `blur(${f2(Math.max(1.6, blur))}px) brightness(${bright.toFixed(3)})`,
            }}
          />
        ) : null}
        {sharp > 0 ? (
          <Img
            src={plate}
            style={{
              ...box(0, 0, W, H),
              filter: u < 1 ? `brightness(${bright.toFixed(3)})` : undefined,
              opacity: sharp,
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

/** حافّة زجاج اللوحة (كما في `Ambient` القديم): ضوءٌ يدور عليها مرّةً من جهة الرمز ويضيئها. */
const RIM = { x: 48, y: 74, w: 2080, h: 548, r: 58 } as const;
const RIM_LEN = 2 * (RIM.w - 2 * RIM.r) + 2 * (RIM.h - 2 * RIM.r) + TAU * RIM.r;
/** منتصف الجانب الأيمن على مسار المستطيل (يبدأ المسار من الزاوية العليا اليسرى بعد الانحناء). */
const RIM_START = RIM.w - 2 * RIM.r + (TAU * RIM.r) / 4 + (RIM.h - 2 * RIM.r) / 2;

const RimLight: FC<{ t: number }> = ({ t }) => {
  const [a, b] = T.rim;
  if (t < a || t > b + 0.4) return null;
  const u = ramp(t, a, b, glide);
  const head = RIM_START + RIM_LEN * u;
  const vis = env(t, a, a + 0.12, b - 0.05, b + 0.4);
  const done = RIM_LEN * u;
  const dash = (len: number) => {
    const l = Math.min(len, done);
    return { strokeDasharray: `${f2(l)} ${f2(RIM_LEN - l)}`, strokeDashoffset: f2(l - head) };
  };
  const rect = { x: RIM.x, y: RIM.y, width: RIM.w, height: RIM.h, rx: RIM.r, fill: "none" };
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ ...box(0, 0, W, H), mixBlendMode: "screen", opacity: vis }}
    >
      <defs>
        <Blur id="fgRimSoft" sd={3} />
        <Blur id="fgRimWide" sd={9} />
      </defs>
      {/* ما رسمه الضوء يبقى مضيئًا ثم يخبو مع اكتمال اللوحة */}
      <rect
        {...rect}
        {...dash(RIM_LEN)}
        stroke="#bfeeff"
        strokeWidth={4}
        opacity={0.5 * (1 - ramp(t, b - 0.4, b + 0.35))}
        filter="url(#fgRimSoft)"
      />
      <rect
        {...rect}
        {...dash(900)}
        stroke="#4fc3ff"
        strokeWidth={24}
        opacity={0.55}
        filter="url(#fgRimWide)"
      />
      <rect
        {...rect}
        {...dash(320)}
        stroke="#e6fbff"
        strokeWidth={8}
        opacity={0.85}
        filter="url(#fgRimSoft)"
      />
      <rect {...rect} {...dash(110)} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
};

/** نبضة إحكام: مسدّسٌ ضوئيّ يتّسع من حافّة الرمز لحظة استقراره. */
const LockPulse: FC<{ t: number }> = ({ t }) => {
  const v = ramp(t, T.lock, T.lock + 0.6, lin);
  if (v <= 0 || v >= 1) return null;
  const s = 1 + 0.22 * outSoft(v);
  const o = 0.6 * Math.pow(1 - v, 1.3);
  return (
    <svg
      width={SRC}
      height={SRC}
      viewBox={`0 0 ${SRC} ${SRC}`}
      style={{
        ...box(EMBLEM.x, EMBLEM.y, EMBLEM.size, EMBLEM.size),
        overflow: "visible",
        mixBlendMode: "screen",
      }}
    >
      <defs>
        <filter id="fgLockSoft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={4} />
        </filter>
      </defs>
      <g
        transform={`translate(${HEX.cx} ${HEX.cy}) scale(${s.toFixed(4)}) translate(${-HEX.cx} ${-HEX.cy})`}
      >
        <path
          d={HEX_PATH}
          fill="none"
          stroke="#8fe2ff"
          strokeWidth={10}
          opacity={o * 0.6}
          filter="url(#fgLockSoft)"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={HEX_PATH}
          fill="none"
          stroke="#f2fdff"
          strokeWidth={2.4}
          opacity={o}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
};

/* ─────────────────────────── اللمعان الختاميّ (23–24 ث) ─────────────────────────── */

/** ومضات البريق صاعدةً: طرف الشريط السفليّ ← حافّة الزجاج اليسرى ← البريق العلويّ (بوحدات المصدر). */
const GLINTS: readonly Pt[] = [
  { x: 237, y: 425 },
  { x: 45, y: 235 },
  { x: 314, y: 95 },
];

const RISE = (() => {
  const rnd = seeded(887);
  return Array.from({ length: 40 }, () => ({
    x: 60 + rnd() * 360,
    y: 430 + rnd() * 100,
    t0: ACT.settleEnd + rnd() * 0.35,
    life: 0.5 + rnd() * 0.25,
    v: 280 + rnd() * 280,
    sway: (rnd() - 0.5) * 44,
    r: 1.1 + rnd() * 1.6,
    star: rnd() < 0.22,
  }));
})();

/** حلزونٌ أرخميديّ حول الرمز: ذراعان تلتفّان وتدوران — تلميحُ «توهج لولبي». */
const SPIRAL = Array.from({ length: 48 }, (_, i) => {
  const th = (i / 47) * Math.PI * 1.5;
  return { th, r: 236 + 34 * (th / (Math.PI * 1.5)) };
});

const Shine: FC<{ t: number }> = ({ t }) => {
  if (t < ACT.settleEnd || t >= T.quiet) return null;
  const [s0, s1] = T.shimmer;
  const v = ramp(t, s0, s1, glide);
  const shimmer = t > s0 && t < s1 ? Math.pow(Math.sin(Math.PI * ramp(t, s0, s1, lin)), 0.6) : 0;
  // من تحت المسدّس إلى فوقه، مائلٌ قليلًا كضوءٍ صاعد
  const bandY = lerp(580, -100, v);
  const whole = Math.sin(Math.PI * ramp(t, ACT.settleEnd, 23.86, lin));
  const spiral = 0.75 * Math.pow(whole, 1.3);
  const halo = 0.4 * Math.pow(whole, 1.6);
  const spin = 200 * (t - ACT.settleEnd);
  return (
    <svg
      width={SRC}
      height={SRC}
      viewBox={`0 0 ${SRC} ${SRC}`}
      style={{
        ...box(EMBLEM.x, EMBLEM.y, EMBLEM.size, EMBLEM.size),
        overflow: "visible",
        mixBlendMode: "screen",
      }}
    >
      <defs>
        <clipPath id="fgHexClip">
          <path d={HEX_PATH} />
        </clipPath>
        <linearGradient id="fgShimmer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfeeff" stopOpacity="0" />
          <stop offset="0.36" stopColor="#bfeeff" stopOpacity="0.28" />
          <stop offset="0.47" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.53" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="0.64" stopColor="#bfeeff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#bfeeff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="fgJewel">
          <stop offset="0.6" stopColor="#5fd0ff" stopOpacity="0" />
          <stop offset="0.74" stopColor="#7fdcff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#5fd0ff" stopOpacity="0" />
        </radialGradient>
        <GlowGradient id="fgGlint" />
        <filter id="fgSpiralSoft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
      </defs>
      {halo > 0.002 ? (
        <circle cx={HEX.cx} cy={HEX.cy} r={330} fill="url(#fgJewel)" opacity={halo} />
      ) : null}
      {spiral > 0.002 ? (
        <g filter="url(#fgSpiralSoft)" opacity={spiral}>
          {[0, 180].map((arm) => (
            <g key={arm} transform={`rotate(${f2(spin + arm)} ${HEX.cx} ${HEX.cy})`}>
              {SPIRAL.slice(1).map((p, i) => {
                const q = SPIRAL[i];
                return (
                  <line
                    key={i}
                    x1={f2(HEX.cx + q.r * Math.cos(q.th))}
                    y1={f2(HEX.cy + q.r * Math.sin(q.th))}
                    x2={f2(HEX.cx + p.r * Math.cos(p.th))}
                    y2={f2(HEX.cy + p.r * Math.sin(p.th))}
                    stroke={i > 40 ? "#e8fbff" : "#7fdcff"}
                    strokeWidth={i > 40 ? 8 : 12}
                    strokeLinecap="round"
                    opacity={Math.pow((i + 1) / SPIRAL.length, 1.4)}
                  />
                );
              })}
            </g>
          ))}
        </g>
      ) : null}
      {shimmer > 0.002 ? (
        <g clipPath="url(#fgHexClip)" opacity={shimmer}>
          <g transform={`rotate(-16 ${HEX.cx} ${f2(bandY)})`}>
            <rect
              x={-220}
              y={f2(bandY - 110)}
              width={SRC + 440}
              height={220}
              fill="url(#fgShimmer)"
            />
          </g>
        </g>
      ) : null}
      {RISE.map((p, i) => {
        const tau = t - p.t0;
        if (tau < 0 || tau > p.life) return null;
        const a = tau / p.life;
        const o = Math.sin(Math.PI * a) * (1 - ramp(t, 23.75, T.quiet, lin));
        const x = p.x + p.sway * Math.sin(TAU * a);
        const y = p.y - p.v * tau;
        return p.star ? (
          <Star key={i} x={x} y={y} len={16} o={o} rot={30 * a} glow="fgGlint" />
        ) : (
          <circle key={i} cx={f2(x)} cy={f2(y)} r={p.r} fill="#f2fcff" opacity={o} />
        );
      })}
      {GLINTS.map((p, i) => {
        const at = T.glints[i];
        const g = ramp(t, at, at + 0.32, lin);
        if (g <= 0 || g >= 1) return null;
        const s = Math.pow(Math.sin(Math.PI * g), 1.2);
        return <Star key={i} x={p.x} y={p.y} len={118 * s} o={s} rot={24 * g} glow="fgGlint" />;
      })}
    </svg>
  );
};

/* ─────────────────────────────── التركيب ─────────────────────────────── */

export const Forge: FC<{ t: number }> = ({ t }) => {
  if (t < ACT.montageEnd) return null;
  return (
    <>
      <VoidLayer t={t} />
      <Implosion t={t} />
      <Flood t={t} />
      <RadianceBack t={t} />
      <PlateLayer t={t} />
      <RimLight t={t} />
      <Trail t={t} />
      <Hero t={t} />
      <Lasers t={t} />
      <ScanPlane t={t} />
      <RadianceFront t={t} />
      <LockPulse t={t} />
      <Shine t={t} />
    </>
  );
};
