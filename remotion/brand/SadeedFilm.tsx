/**
 * فيلم بانر سَدِيد — حلقةٌ سينمائية 24 ث بلا نصّ (النصّ HTML فوقها في الصفحة).
 *
 * أمر المالك ٢٠٢٦/١٠/١٨ («SADEED AI OS — CINEMATIC MOTION GRAPHICS VIDEO ENGINE»): ستّة مشاهد
 * في موضع البانر نفسه، حلقةٌ بلا قفزة، والنصّ المهمّ HTML لا مخبوزًا في الإطارات.
 *
 * وأمره الثاني في اليوم نفسه («Replace existing cartoon-style illustrations … with premium,
 * realistic industrial energy visuals … Never fabricate photographs of real facilities»): القصّة
 * بين الإطفاء والهبوط **لقطاتٌ واقعية لمنشآتٍ متخيَّلة عامّة** (مولَّدة: لا موقعَ حقيقيًّا، ولا
 * نصّ ولا شعار ولا أشخاص فيها) بحركة كاميرا هادئة (تكبيرٌ ≤ 1.08 وانسيابٌ خفيف) وذوبانٍ ليّن
 * وضبابٍ جوّيّ ودرجةٍ باردة نحو الكحلي والسماوي: مجمّعٌ صناعي ← خطوط نقل ← محطّة تحويل ← محطّة
 * توليد يحلّ عليها الليل وتصل منشآتها شبكةُ رصدٍ رقيقة (خطوطٌ تُرسم وعُقدٌ تنبض) ← ومن عقدتها
 * يولد الرمز ثم يهبط في اللوحة كما كان. لا HUD ولا رقم ولا اسم (المادة ٢٧).
 *
 * مدخل الملفّ هو المشهد السادس مستقرًّا (اللوحة نفسها بلا نصّ) — فالإطار 0 هو الملصق، والقصّة
 * تجري في دورةٍ: سكون ← المشهد ١ ← … ← ٥ ← سكون. كل حركةٍ دائمة دوريّةٌ على 720 إطارًا
 * (أعدادٌ صحيحة من الدورات) فالإطار 720 هو الإطار 0.
 *
 * الإحداثيات كلّها بكسلات اللوحة الأمّ 2172×724، والحاوية تُصغَّر إلى إطار التركيب. واللقطات
 * معايناتٌ 1280×543 (‏21:9) تُقصّ 3:1 فتُكبَّر 1.26–1.36× في درجة 1608 — لينةٌ قليلًا؛ ومعرّفات
 * توليدها وخطوة استبدالها بالدقّة الكاملة في `RENDER.md`.
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

export const FILM_FPS = 30;
export const FILM_SECONDS = 24;
export const FILM_FRAMES = FILM_FPS * FILM_SECONDS;

const W = 2172;
const H = 724;
const CX = W / 2;
const CY = H / 2;

/** الرمز في اللوحة: مقطوعٌ مربّعًا 483px مركزه (1760.5، 362.5) — موضع الهبوط في المشهد ٥. */
const EMBLEM = { x: 1519, y: 121, size: 483, cx: 1760.5, cy: 362.5 } as const;

/**
 * حدود المشاهد بالثواني — والصفحة تقرأ الحدّين الأوّل والأخير لتزامن النصّ. وبينهما: `dimEnd`
 * اكتمل الإطفاء وانكشفت اللقطة الأولى · `s1End` و`s2End` منتصف ذوبان اللقطة ١←٢ و٢←٣ · `s3End`
 * يحلّ الليل على محطّة التوليد وتُرسم الشبكة · `s4End` يبدأ الهبوط · `s5End` السكون.
 */
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

/* ───────────── المشاهد ١–٤ — لقطاتٌ واقعية بحركة كاميرا هادئة ───────────── */

/** منتصف ذوبان اللقطة ٣←٤ — لا حدّ له في `ACT`: الليل والشبكة يجريان على اللقطة الرابعة نفسها. */
const POWER_CUT = 16.4;
/** الذوبان بين لقطتين (ث). */
const DISSOLVE = 0.8;

type Cam = { s: number; x: number; y: number };

type Shot = {
  /** في `brand/assets/` (‏`--public-dir`) — معاينةٌ مولَّدة، ومعرّف توليدها في `RENDER.md`. */
  src: string;
  /** يبدأ رسمها ويكتمل ظهورها (ث): بينهما تذوب فوق سابقتها. */
  from: number;
  full: number;
  /** آخر لحظةٍ تُرسم فيها — وقد غطّتها اللاحقة أو اللوحة كلّها. */
  until: number;
  /** نافذة القصّ 3:1 من الأصل 21:9: الموضع العمودي (0 أعلى · 1 أسفل). */
  crop: number;
  /** مرتكز الكاميرا (بكسلات الإطار). */
  origin: Pt;
  /** الكاميرا من `from` إلى `until`: مقياسٌ ≤ 1.08 وانسيابٌ بالبكسل. */
  a: Cam;
  b: Cam;
  /** خطّ الأفق في الإطار — مرتكز الضباب الجوّيّ. */
  horizon: number;
  /** انكشافٌ من تحت اللوحة الخافتة: تركيزٌ وتعريضٌ يكتملان بين اللحظتين. */
  reveal?: readonly [number, number];
  /** يحلّ عليها الليل وتُرسم فوقها الشبكة (المشهد ٥). */
  network?: true;
};

const SHOTS: readonly Shot[] = [
  {
    // ١ مجمّعٌ صناعيّ واسع يتكشّف تحت اللوحة الخافتة — دفعٌ بطيء نحو قلبه وانسيابٌ جانبيّ.
    src: "industrial/1-industrial.jpg",
    from: ACT.holdEnd + 0.4,
    full: ACT.holdEnd + 0.4,
    until: ACT.s1End + DISSOLVE / 2,
    crop: 0.75,
    origin: { x: 1020, y: 420 },
    a: { s: 1.02, x: 16, y: 0 },
    b: { s: 1.075, x: -18, y: -8 },
    horizon: 150,
    reveal: [ACT.holdEnd + 0.5, ACT.dimEnd + 0.6],
  },
  {
    // ٢ خطوط نقلٍ عالية الجهد عبر الكثبان — انسيابٌ جانبيّ نحو الأفق.
    src: "industrial/2-transmission.jpg",
    from: ACT.s1End - DISSOLVE / 2,
    full: ACT.s1End + DISSOLVE / 2,
    until: ACT.s2End + DISSOLVE / 2,
    crop: 0.55,
    origin: { x: CX, y: 470 },
    a: { s: 1.045, x: 34, y: 0 },
    b: { s: 1.065, x: -34, y: 0 },
    horizon: 575,
  },
  {
    // ٣ محطّة تحويلٍ خلف سياجها — تراجعٌ بطيء، وحركةٌ أقلّ لأن شبكة السياج دقيقة.
    src: "industrial/3-substation.jpg",
    from: ACT.s2End - DISSOLVE / 2,
    full: ACT.s2End + DISSOLVE / 2,
    until: POWER_CUT + DISSOLVE / 2,
    crop: 0.35,
    origin: { x: 1300, y: 330 },
    a: { s: 1.06, x: 0, y: 0 },
    b: { s: 1.025, x: 0, y: 0 },
    horizon: 470,
  },
  {
    // ٤ محطّة توليدٍ عند الغسق ← ٥ يحلّ الليل وتصل الشبكة منشآتها: دفعٌ واحدٌ مرتكزه العقدة
    // نفسها، فلا تتحرّك في الإطار — ومنها يولد الرمز.
    src: "industrial/4-power.jpg",
    from: POWER_CUT - DISSOLVE / 2,
    full: POWER_CUT + DISSOLVE / 2,
    until: ACT.s5End,
    crop: 0.6,
    origin: { x: CX, y: CY },
    a: { s: 1.0, x: 0, y: 0 },
    b: { s: 1.08, x: 0, y: 0 },
    horizon: 395,
    network: true,
  },
];

const glide = Easing.bezier(0.37, 0, 0.63, 1);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** الكاميرا في لحظةٍ من اللقطة — محصورةً بحيث تغطّي الصورة الإطار كلّه دائمًا. */
function camera(shot: Shot, t: number): Cam {
  const u = interpolate(t, [shot.from, shot.until], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: glide,
  });
  const s = lerp(shot.a.s, shot.b.s, u);
  const k = s - 1;
  const { x: ox, y: oy } = shot.origin;
  return {
    s,
    x: Math.min(ox * k, Math.max(-(W - ox) * k, lerp(shot.a.x, shot.b.x, u))),
    y: Math.min(oy * k, Math.max(-(H - oy) * k, lerp(shot.a.y, shot.b.y, u))),
  };
}

/** الدرجة الباردة: صورةٌ أهدأ تشبّعًا، ثم تبريدٌ بالضرب، ثم رفعُ الأسود نحو الكحلي. */
const GRADE = "saturate(0.8) contrast(1.09) brightness(0.94)";
const COOL: CSSProperties = { background: "#a9c4ef", mixBlendMode: "multiply", opacity: 0.55 };
const NAVY: CSSProperties = { background: "#0a2a66", mixBlendMode: "screen", opacity: 0.4 };

const ShotLayer: FC<{ shot: Shot; t: number }> = ({ shot, t }) => {
  if (t < shot.from || t > shot.until) return null;
  const opacity = shot.full > shot.from ? ramp(t, shot.from, shot.full) : 1;
  const cam = camera(shot, t);
  const src = staticFile(shot.src);
  const fit: CSSProperties = {
    ...box(0, 0, W, H),
    objectFit: "cover",
    objectPosition: `50% ${shot.crop * 100}%`,
  };
  const r = shot.reveal ? ramp(t, shot.reveal[0], shot.reveal[1], outSoft) : 1;
  const focus =
    r < 1 ? ` blur(${(4 * (1 - r)).toFixed(2)}px) brightness(${(0.6 + 0.4 * r).toFixed(3)})` : "";
  const night = shot.network ? ramp(t, ACT.s3End, ACT.s3End + 1.1) : 0;
  const h = shot.horizon;
  const drift = 26 * (t - shot.from);
  return (
    <div style={{ ...box(0, 0, W, H), opacity, overflow: "hidden", isolation: "isolate" }}>
      <div
        style={{
          ...box(0, 0, W, H),
          transformOrigin: `${shot.origin.x}px ${shot.origin.y}px`,
          transform: `translate(${cam.x.toFixed(2)}px, ${cam.y.toFixed(2)}px) scale(${cam.s.toFixed(5)})`,
        }}
      >
        <Img src={src} style={{ ...fit, filter: GRADE + focus }} />
        <div style={{ ...box(0, 0, W, H), ...COOL }} />
        <div style={{ ...box(0, 0, W, H), ...NAVY }} />
        {night > 0 ? (
          <>
            {/* الليل: خفوتٌ أزرق، ثم تعود الأضواء وحدها بتوهّجٍ بارد (عتبةٌ بالتباين ثم تليين) */}
            <div
              style={{
                ...box(0, 0, W, H),
                background: "#3a5da6",
                mixBlendMode: "multiply",
                opacity: 0.72 * night,
              }}
            />
            <Img
              src={src}
              style={{
                ...fit,
                filter: "brightness(0.7) contrast(3.4) saturate(0.4) blur(2.6px)",
                mixBlendMode: "screen",
                opacity: night,
              }}
            />
          </>
        ) : null}
        {/* ضبابٌ جوّيّ على خطّ الأفق: كتلتان تنجرفان بسرعتين مختلفتين — عمقٌ خفيف */}
        <div
          style={{
            ...box(0, 0, W, H),
            mixBlendMode: "screen",
            background: [
              `radial-gradient(1100px 150px at ${(640 + drift).toFixed(1)}px ${h}px, rgba(170,215,255,0.11), rgba(170,215,255,0) 70%)`,
              `radial-gradient(900px 120px at ${(1640 - 0.6 * drift).toFixed(1)}px ${h + 46}px, rgba(170,215,255,0.08), rgba(170,215,255,0) 70%)`,
              `linear-gradient(180deg, rgba(150,205,255,0) ${h - 170}px, rgba(150,205,255,0.13) ${h}px, rgba(150,205,255,0.04) ${h + 130}px, rgba(150,205,255,0) ${h + 260}px)`,
            ].join(", "),
          }}
        />
        {shot.network ? <Network t={t} /> : null}
      </div>
    </div>
  );
};

/* ───────── المشهد ٥ — شبكة رصدٍ رقيقة تصل المنشآت، ومن عقدتها يولد الرمز ───────── */

const NET = { cyan: "#62e6ff", core: "#e9fbff", green: "#3fe0a8", greenCore: "#dcfff1" } as const;

/** عقدة الشبكة: مرتكز كاميرا اللقطة الرابعة في مركز الإطار — ومنها يولد الرمز. */
const HUB: Pt = { x: CX, y: CY };

/** منحنى كاتمول-روم عبر النقاط، عيّناتٍ متقاربة — للرسم وللحزم معًا. */
function spline(points: readonly Pt[], per = 24): Pt[] {
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
      out.push({ x: c(p0.x, p1.x, p2.x, p3.x), y: c(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

type Trace = { pts: Pt[]; lens: number[] };

function trace(pts: Pt[]): Trace {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, lens };
}

/** النقطة عند كسرٍ من طول المسار. */
function pointAt(tr: Trace, u: number): Pt {
  const target = Math.max(0, Math.min(1, u)) * tr.lens[tr.lens.length - 1];
  let i = 1;
  while (i < tr.lens.length - 1 && tr.lens[i] < target) i++;
  const f = (target - tr.lens[i - 1]) / (tr.lens[i] - tr.lens[i - 1] || 1);
  return { x: lerp(tr.pts[i - 1].x, tr.pts[i].x, f), y: lerp(tr.pts[i - 1].y, tr.pts[i].y, f) };
}

/** المسار مرسومًا حتى كسرٍ من طوله — «يُرسم» الخطّ بضوءٍ يتقدّم. */
function partial(tr: Trace, u: number): string {
  const target = u * tr.lens[tr.lens.length - 1];
  const head = pointAt(tr, u);
  const body = tr.pts.filter((_, i) => tr.lens[i] < target);
  return [...body, head]
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

type Station = Pt & { green?: boolean };

/**
 * عُقد رصدٍ عند قواعد منشآت اللقطة الرابعة (بكسلات الإطار قبل حركة الكاميرا، مقيسةً على المعاينة
 * بشبكة 50px) — نقاطٌ توضيحية لا بيانات ولا أسماء. يسارها: أعمدة الإنارة البعيدة، والمبنى المضاء،
 * وقاعة التوربينات؛ ويمينها: ساحة المحوّلات، والمباني، والأضواء البعيدة.
 */
const LEFT: readonly Station[] = [
  { x: 312, y: 430 },
  { x: 500, y: 424, green: true },
  { x: 725, y: 418 },
];
const RIGHT: readonly Station[] = [
  { x: 2081, y: 432 },
  { x: 1754, y: 426, green: true },
  { x: 1291, y: 420 },
];

type Link = Trace & {
  at: number;
  dur: number;
  green?: boolean;
  stations: { p: Station; u: number }[];
};

/** جذعٌ أرضيّ من طرف الإطار عبر منشآته إلى العقدة — بسرعةٍ ثابتة، فالعقدة تضيء حين يبلغها. */
function trunk(edge: Pt, stations: readonly Station[], bend: Pt, at: number, dur: number): Link {
  const per = 24;
  const tr = trace(spline([edge, ...stations, bend, HUB], per));
  const total = tr.lens[tr.lens.length - 1];
  return {
    ...tr,
    at,
    dur,
    stations: stations.map((p, k) => ({ p, u: tr.lens[(k + 1) * per] / total })),
  };
}

/** قوسٌ من منشأةٍ إلى العقدة يعلو إلى `apex`. */
function arc(from: Pt, apex: number, at: number, dur: number, green?: boolean): Link {
  const c = { x: (from.x + HUB.x) / 2, y: 2 * apex - (from.y + HUB.y) / 2 };
  const pts = Array.from({ length: 49 }, (_, j) => quad(from, c, HUB, j / 48));
  return { ...trace(pts), at, dur, green, stations: [] };
}

const TRUNKS: readonly Link[] = [
  trunk({ x: -40, y: 470 }, LEFT, { x: 930, y: 404 }, 18.0, 1.2),
  trunk({ x: W + 40, y: 455 }, RIGHT, { x: 1190, y: 400 }, 18.1, 1.2),
];
const ARCS: readonly Link[] = [
  arc(LEFT[0], 150, 18.75, 0.95, true),
  arc(RIGHT[0], 120, 18.85, 1.0),
  arc(LEFT[2], 290, 19.0, 0.6),
  arc(RIGHT[1], 262, 19.05, 0.7),
];

const Pulse: FC<{ p: Pt; on: number; t: number; green?: boolean; big?: boolean }> = ({
  p,
  on,
  t,
  green,
  big,
}) => {
  if (on <= 0) return null;
  const tone = green ? NET.green : NET.cyan;
  const ring = frac(t / 1.7 + (p.x % 97) / 97);
  const k = big ? 1.5 : 1;
  return (
    <g opacity={on}>
      <circle
        cx={p.x}
        cy={p.y}
        r={(6 + 20 * ring) * k}
        fill="none"
        stroke={tone}
        strokeWidth={1.4}
        opacity={0.6 * (1 - ring)}
      />
      <circle cx={p.x} cy={p.y} r={11 * k} fill={tone} opacity={0.5} filter="url(#netGlow)" />
      <circle cx={p.x} cy={p.y} r={4.2 * k} fill={green ? NET.greenCore : NET.core} />
    </g>
  );
};

const Network: FC<{ t: number }> = ({ t }) => {
  const vis =
    ramp(t, ACT.s3End + 0.35, ACT.s3End + 0.8) * (1 - ramp(t, ACT.s4End - 0.1, ACT.s4End + 0.4));
  if (vis <= 0) return null;
  // العقدة تشتدّ حين تكتمل المسارات إليها، ثم تخبو والرمز يولد منها.
  const hubOn = ramp(t, 18.9, 19.3);
  const swell = ramp(t, 19.0, 19.55) * (1 - ramp(t, 19.7, 20.3));
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ ...box(0, 0, W, H), opacity: vis }}
    >
      <defs>
        <filter id="netGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <radialGradient id="netHalo">
          <stop offset="0%" stopColor="#bff4ff" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#62e6ff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#62e6ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[...TRUNKS, ...ARCS].map((l, i) => {
        const p = interpolate(t, [l.at, l.at + l.dur], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        if (p <= 0) return null;
        const d = partial(l, p);
        const tone = l.green ? NET.green : NET.cyan;
        const head = pointAt(l, p);
        // حزمةٌ تجري إلى العقدة بعد اكتمال الخطّ — واحدةٌ في كل مسار.
        const flow = t > l.at + l.dur ? frac((t - l.at - l.dur) / 1.5 + i * 0.17) : -1;
        const packet = flow >= 0 ? pointAt(l, flow) : null;
        return (
          <g key={i}>
            <path
              d={d}
              fill="none"
              stroke={tone}
              strokeWidth={7}
              strokeOpacity={0.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#netGlow)"
            />
            <path
              d={d}
              fill="none"
              stroke={l.green ? NET.greenCore : NET.core}
              strokeWidth={1.9}
              strokeOpacity={0.88}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {p < 1 ? <circle cx={head.x} cy={head.y} r={3.4} fill={NET.core} /> : null}
            {packet ? (
              <g opacity={Math.sin(Math.PI * flow)}>
                <circle
                  cx={packet.x}
                  cy={packet.y}
                  r={8}
                  fill={tone}
                  opacity={0.55}
                  filter="url(#netGlow)"
                />
                <circle cx={packet.x} cy={packet.y} r={2.6} fill={NET.core} />
              </g>
            ) : null}
            {l.stations.map((s, k) => (
              <Pulse
                key={k}
                p={s.p}
                green={s.p.green}
                t={t}
                on={ramp(t, l.at + s.u * l.dur, l.at + s.u * l.dur + 0.35, outSoft)}
              />
            ))}
          </g>
        );
      })}
      <circle
        cx={HUB.x}
        cy={HUB.y}
        r={30 + 70 * swell}
        fill="url(#netHalo)"
        opacity={hubOn * (0.5 + 0.5 * swell)}
      />
      <Pulse p={HUB} on={hubOn * (1 - ramp(t, 19.6, 20.2))} t={t} big />
    </svg>
  );
};

/* ───────── المشهد ٥ — الرمز يولد من عقدة الشبكة ثم يهبط في موضعه من اللوحة ───────── */

const HeroEmblem: FC<{ t: number }> = ({ t }) => {
  const start = ACT.s4End - 1.3;
  if (t < start || t > ACT.s5End + 0.3) return null;
  const appear = ramp(t, start, start + 0.9, outSoft);
  const land = ramp(t, ACT.s4End, ACT.s4End + 1.25);
  const fade = ramp(t, ACT.s4End + 1.15, ACT.s5End - 0.05);
  // يولد من العقدة في مركز الإطار صاعدًا قليلًا، ثم يهبط في موضعه من اللوحة كما كان.
  const size = 520 + (EMBLEM.size - 520) * land;
  const cx = CX + (EMBLEM.cx - CX) * land;
  const cy = CY + 18 * (1 - appear) + (EMBLEM.cy - CY) * land;
  const sc = 0.86 + 0.14 * appear;
  const heroOnly = 1 - land;
  return (
    <div style={{ ...box(0, 0, W, H), opacity: appear * (1 - fade) }}>
      <div style={{ ...box(cx - size / 2, cy - size / 2, size, size), transform: `scale(${sc})` }}>
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
      </div>
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
        {/* اللقطات تحت اللوحة: تنكشف حين تشفّ، وتغطّيها اللوحة حين تعود — ذوبانٌ بلا قفزة */}
        {SHOTS.map((shot) => (
          <ShotLayer key={shot.src} shot={shot} t={t} />
        ))}
        <PlateLayer t={t} />
        <HeroEmblem t={t} />
        <Vignette t={t} />
      </div>
    </AbsoluteFill>
  );
};
