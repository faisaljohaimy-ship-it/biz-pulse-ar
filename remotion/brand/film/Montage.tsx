/**
 * اشتعال اللوحة ثم المونتاج السريع (0–16.5 ث) — القسم الأوّل من فيلم البانر (R4).
 *
 * أمر المالك ٢٠٢٦/١٠/١٨ بنصّه: «اجعل فديو الموشن جرافتي يبدأ اولاً بصور وذكاء مبهر لمدة ٢٤ ثانيه
 * بسرعة في اجزاء من الثانية وبمجرد فتح الموقع والدخول عليه». فهذا القسم:
 *
 *   • 0–0.5 ث «اشتعال»: الإطار 0 هو اللوحة نفسها بلا مرشّح (هي ملصق الفيديو في الصفحة)، ثم تنفجر خلف
 *     الرمز هالةٌ وأشعّة ووهجٌ أنامورفيّ، وتندفع اللوحة نحوه (≤ 1.12) وتغتسل بالضوء — وقطعٌ حادّ عند 0.5.
 *   • 0.5–16.5 ث ثلاث وعشرون لقطة على `CUTS` (شبكة الموسيقى 120 ن/د): ثماني عشرة لقطةً واقعية من الصور
 *     الأربع (منشآتٌ متخيَّلة عامّة) بتأطيراتٍ مختلفة لا تتجاور صورتها، بكاميرا نشطة (لكمة · سوطٌ بضبابية
 *     حركة · تراجع · إمالة) ودرجةٍ باردة وضبابٍ عميق، وفوقها طبقات «ذكاء» تُرسم إجرائيًّا: نبضات طاقةٍ
 *     تجري على الموصِّلات، وشبكةٌ تصل المنشآت، وأرضيةٌ رقمية تمسحها موجة، وشعاعٌ يوقظ العوازل، وتيّارات
 *     ضوءٍ تصعد من الأسفل إلى الأعلى (تمهيدًا للمعان الجوهرة الصاعد) — وبينها خمس لقطات ذكاءٍ خالص:
 *     شبكةٌ عصبية ثلاثية الأبعاد تسري فيها الإشارة، وطيرانٌ فوق تضاريس بيانات، وتيّاراتٌ صاعدة من أرضيةٍ
 *     مضيئة، ونفقُ ضوء، وأخيرًا دوّامةٌ تتقارب خيوطها إلى نقطةٍ واحدة في مركز الإطار (1086، 362) يفجّرها
 *     قسم الصياغة (`Forge.tsx`) عند 16.5.
 *
 * قصاصات اللوحة جُرّبت ولم تُعتمد: أيّ قصّ 3:1 بتكبيرٍ مقبول يملؤه ضبابها الأبيض (متوسّط إضاءة 0.44
 * مقابل 0.15–0.3 للّقطات) — فالدرجة الليلية تجعله رماديًّا موحلًا، والقلب السالب يشبه الأشعّة.
 *
 * المحظورات (المادة ٢٧): لا نصّ ولا رقم ولا شعار (سوى الرمز في الاشتعال) ولا أشخاص ولا HUD ولا بيانات
 * مختلَقة — العُقد والخطوط رمزيّةٌ على منشآتٍ متخيَّلة. والوميض (WCAG 2.3.1): ومضاتٌ ليّنة ≤ 35% أبيض
 * لثلاثة إطارات على `FLASHES` وحدها، والقطعات ≤ 2/ث، وإضاءة اللقطات في نطاقٍ متقارب. وكل حركةٍ دالّةٌ في
 * `t` وحده، والجسيمات من مولّدٍ ثابت البذرة.
 *
 * الإحداثيات بكسلات اللوحة الأمّ 2172×724، ومواضع الطبقات فوق الصور بكسلات المصدر (1280×543، مقيسةً
 * بشبكة 10px على المعاينات) تمرّ بالكاميرا نفسها (`toArt`) فتلتصق بمنشآتها. والكاميرا محصورةٌ رياضيًّا
 * (`viewOf`) فلا تنكشف حافّة صورةٍ في أيّ إطار، وتكبيرها ≤ 1.45 فوق الملء (المعاينات ليّنة).
 */
import type { CSSProperties, FC, ReactNode } from "react";
import { Easing, Img, staticFile } from "remotion";
import {
  box,
  cine,
  CX,
  CY,
  frac,
  glide,
  H,
  lerp,
  pointAt,
  type Pt,
  quad,
  ramp,
  seeded,
  TAU,
  trace,
  type Trace,
  W,
} from "./kit";
import { ACT, BEAT, CUTS, EMBLEM, FILM_FPS, FLASHES } from "./timeline";

/* ─────────────────────────────── ثوابت ─────────────────────────────── */

const C = {
  ice: "#eafcff",
  cyan: "#62e6ff",
  sky: "#5fb2ff",
  green: "#3fe0a8",
  greenCore: "#dcfff1",
  navy: "#030d27",
} as const;

const fr = (s: number) => Math.round(s * FILM_FPS);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const accel = Easing.in(Easing.cubic);
/** لكمة: اندفاعٌ حادّ في أوّل الإطارات ثم انسيابٌ بطيء. */
const punch = Easing.out(Easing.exp);
/** منحدر سرعة: سريعٌ عند الطرفين بطيءٌ في الوسط — يلائم لقطةً تدخل بسوطٍ وتخرج بسوط. */
const speedRamp = (x: number) => x + (0.62 * Math.sin(TAU * x)) / TAU;

/**
 * نبضةٌ تخبو بعد كل ضربةٍ موسيقية (0..1): الأضواء تتنفّس على الإيقاع والقطعات على النبضات نفسها. وفي
 * البناء تتقارب مع لفّة الطبل: أثمانٌ من 12.5 ث ثم أجزاء ستّة عشر من 14.5 ث.
 */
const pulse = (t: number, decay = 7) => {
  const div = t >= 14.5 ? 4 : t >= 12.5 ? 2 : 1;
  return Math.exp(-frac((t * div) / BEAT + 1e-6) * decay);
};

/** التصعيد من الإيقاع الثاني إلى ذروة البناء (0..1) — تكثر الخيوط وتسطع حتى التقارب. */
const energyAt = (t: number) => ramp(t, 8.5, 15.5, (x) => x);

/* ─────────────────────────────── المصادر ─────────────────────────────── */

/** `rows` أدنى صفٍّ يجوز أن يظهر (بكسلات المصدر) — ما تحته لا يدخل الإطار مهما تحرّكت الكاميرا. */
type Source = { file: string; w: number; h: number; rows?: number };

/**
 * في صورة المجمّع عاملٌ صغير بزيٍّ فاتح وخوذة عند (668–682، 468–505) — والأشخاص محظورون في الفيلم،
 * فالصفوف دون 466 خارج الإطار في كل تأطيرٍ وكل سوط (`viewOf`)، لا بحسن اختيار اللقطات وحده.
 */
const COMPLEX: Source = { file: "industrial/1-industrial.jpg", w: 1280, h: 543, rows: 466 };
const LINES: Source = { file: "industrial/2-transmission.jpg", w: 1280, h: 543 };
const SUBSTATION: Source = { file: "industrial/3-substation.jpg", w: 1280, h: 543 };
const POWER: Source = { file: "industrial/4-power.jpg", w: 1280, h: 543 };
const PLATE_FILE = "sadeed-banner-clean.webp";
const EMBLEM_FILE = "sadeed-emblem.webp";

/* ─────────────────────────────── الكاميرا ─────────────────────────────── */

/** `s` تكبيرٌ فوق الملء (1..1.45) و(`u`،`v`) نقطة الصورة في مركز الإطار (0..1). */
type Cam = { s: number; u: number; v: number };
/** الصورة مرسومةً: نقطة المصدر (x،y) تقع في الإطار عند (`x` + x·`k`، `y` + y·`k`). */
type View = { k: number; x: number; y: number };

/** الكاميرا محصورةٌ: الصورة تغطّي الإطار كلّه دائمًا مهما اندفعت، ولا يظهر ما دون `rows`. */
function viewOf(src: Source, c: Cam): View {
  const k = Math.max(W / src.w, H / src.h) * Math.min(1.45, Math.max(1, c.s));
  return {
    k,
    x: Math.min(0, Math.max(W - src.w * k, CX - c.u * src.w * k)),
    y: Math.min(0, Math.max(H - (src.rows ?? src.h) * k, CY - c.v * src.h * k)),
  };
}

const toArt = (v: View, p: Pt): Pt => ({ x: v.x + p.x * v.k, y: v.y + p.y * v.k });

type Move = {
  a: Cam;
  b: Cam;
  ease?: (x: number) => number;
  /** «سوط» دخولٍ/خروج: إزاحةٌ أفقية (كسرٌ من عرض الصورة) تذوب في `WHIP` ث عند القطع. */
  whipIn?: number;
  whipOut?: number;
};

const WHIP = 0.14;

function whipAt(m: Move, local: number, dur: number): number {
  let du = 0;
  if (m.whipIn) du += m.whipIn * Math.pow(1 - clamp01(local / WHIP), 3);
  if (m.whipOut) du += m.whipOut * Math.pow(clamp01(1 - (dur - local) / WHIP), 3);
  return du;
}

/** نبضة تكبيرٍ خفيفة على منتصف اللقطة ذات الثانية (الضربة الثانية) — تقطيعٌ داخليّ بلا قطع. */
function bump(local: number, dur: number): number {
  if (dur < 0.9) return 0;
  const x = local - 0.5;
  if (x < 0) return 0;
  return x < 0.067 ? x / 0.067 : Math.exp(-(x - 0.067) / 0.14);
}

function camAt(m: Move, local: number, dur: number): Cam {
  const e = (m.ease ?? glide)(clamp01(local / dur));
  return {
    s: lerp(m.a.s, m.b.s, e) * (1 + 0.018 * bump(local, dur)),
    u: lerp(m.a.u, m.b.u, e) + whipAt(m, local, dur),
    v: lerp(m.a.v, m.b.v, e),
  };
}

/**
 * ضبابية الحركة للسوط وحده: سرعة الإزاحة الأفقية بين إطارين (بكسلات الإطار) ← تمويهٌ أفقيّ. اللكمة
 * والانسياب يبقيان حادّين (لا تمويه شعاعيًّا رخيصًا في CSS).
 */
function whipBlur(src: Source, m: Move, local: number, dur: number): number {
  const inWhip = (m.whipIn && local < WHIP) || (m.whipOut && local > dur - WHIP);
  if (!inWhip) return 0;
  // الإزاحة الفعلية بعد الحصر (لا المطلوبة): سوطٌ تمتصّه حافّة الصورة لا يُموَّه بلا حركة.
  const dt = 1 / FILM_FPS;
  const near = local < dt ? local + dt : local - dt;
  const a = viewOf(src, camAt(m, local, dur));
  const b = viewOf(src, camAt(m, near, dur));
  const centre = (CX - a.x) / a.k;
  const dx = Math.abs(CX - (b.x + centre * b.k));
  return Math.min(46, Math.max(0, dx - 10) * 0.45);
}

/* ─────────────────────────────── الدرجة ─────────────────────────────── */

/** صورةٌ أهدأ تشبّعًا وأقوى تباينًا، ثم تبريدٌ بالضرب، ثم رفعُ الأسود نحو الكحلي. */
const BASE = "saturate(0.88) contrast(1.18) brightness(0.98)";
/** عتبةٌ ثم تليين: الأضواء وحدها تتوهّج (بكسلات المصدر قبل التكبير) — وتشتدّ مع البناء. */
const bloomOf = (energy: number) =>
  `brightness(${(0.62 + 0.08 * energy).toFixed(3)}) contrast(3.2) blur(5px)`;

const Haze: FC<{ y: number; local: number; i: number }> = ({ y, local, i }) => {
  const drift = 70 * local + i * 131;
  const x1 = ((620 + drift) % (W + 600)) - 300;
  const x2 = W + 300 - ((1500 + 0.6 * drift) % (W + 600));
  return (
    <div
      style={{
        ...box(0, 0, W, H),
        mixBlendMode: "screen",
        background: [
          `radial-gradient(1100px 150px at ${x1.toFixed(1)}px ${y.toFixed(1)}px, rgba(160,212,255,0.14), rgba(160,212,255,0) 70%)`,
          `radial-gradient(900px 120px at ${x2.toFixed(1)}px ${(y + 44).toFixed(1)}px, rgba(160,212,255,0.09), rgba(160,212,255,0) 70%)`,
          `linear-gradient(180deg, rgba(140,200,255,0) ${(y - 170).toFixed(1)}px, rgba(140,200,255,0.13) ${y.toFixed(1)}px, rgba(140,200,255,0.04) ${(y + 130).toFixed(1)}px, rgba(140,200,255,0) ${(y + 260).toFixed(1)}px)`,
        ].join(", "),
      }}
    />
  );
};

const VIGNETTE: CSSProperties = {
  ...box(0, 0, W, H),
  background: "radial-gradient(72% 105% at 50% 50%, rgba(2,8,26,0) 50%, rgba(2,8,26,0.62) 100%)",
};

/* ─────────────────────────────── أدوات الرسم ─────────────────────────────── */

/** نقاطٌ متقاربة على مسارٍ بين كسرين من طوله. */
function sample(tr: Trace, a: number, b: number, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, j) => pointAt(tr, lerp(a, b, j / n)));
}

const pts = (list: Pt[]) => list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
const P = (x: number, y: number): Pt => ({ x, y });
const line = (a: Pt, b: Pt, n = 12): Trace =>
  trace(Array.from({ length: n + 1 }, (_, j) => P(lerp(a.x, b.x, j / n), lerp(a.y, b.y, j / n))));

/** مسارٌ مقوَّس بين نقاط التعليق (ترهّلُ سلكٍ بين برجين: `sag` كسرٌ من طول البحر). */
function sagged(points: readonly Pt[], sag: number, per = 14): Trace {
  const out: Pt[] = [];
  for (let s = 0; s < points.length - 1; s++) {
    const a = points[s];
    const b = points[s + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const c = P((a.x + b.x) / 2, (a.y + b.y) / 2 + 2 * sag * len);
    for (let j = 0; j < per; j++) out.push(quad(a, c, b, j / per));
  }
  out.push(points[points.length - 1]);
  return trace(out);
}

/** قوسٌ يعلو بين نقطتين (`lift` كسرٌ من المسافة). */
function arcTrace(a: Pt, b: Pt, lift: number): Trace {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const c = P((a.x + b.x) / 2, (a.y + b.y) / 2 - lift * len);
  return trace(Array.from({ length: 33 }, (_, j) => quad(a, c, b, j / 32)));
}

/** مذنّبٌ على مسار: رأسٌ ساطع وذيلٌ يخبو في خمس قطع. */
const Comet: FC<{
  tr: Trace;
  head: number;
  len: number;
  map: (p: Pt) => Pt;
  w: number;
  tone?: string;
  a?: number;
}> = ({ tr, head, len, map, w, tone = C.cyan, a = 1 }) => {
  const segs = 5;
  const parts: ReactNode[] = [];
  for (let s = 0; s < segs; s++) {
    const from = head - len + (s * len) / segs;
    const to = head - len + ((s + 1) * len) / segs;
    if (to <= 0 || from >= 1) continue;
    const q = (s + 1) / segs;
    parts.push(
      <polyline
        key={s}
        points={pts(sample(tr, Math.max(0, from), Math.min(1, to), 3).map(map))}
        fill="none"
        stroke={s === segs - 1 ? C.ice : tone}
        strokeWidth={w * (0.35 + 0.65 * q)}
        strokeLinecap="round"
        opacity={a * Math.pow(q, 1.5)}
      />,
    );
  }
  if (head > 0 && head < 1) {
    const p = map(pointAt(tr, head));
    parts.push(<circle key="h" cx={p.x} cy={p.y} r={w * 1.3} fill={C.ice} opacity={a} />);
  }
  return <g>{parts}</g>;
};

/** طبقة توهّجٍ ليّن تحت الرسم الحادّ نفسه — تمويهٌ واحد للمجموعة كلّها. */
const Glowing: FC<{ id: string; children: ReactNode; k?: number }> = ({ id, children, k = 1 }) => (
  <>
    <g filter={`url(#${id})`} opacity={k}>
      {children}
    </g>
    {children}
  </>
);

const GlowDefs: FC<{ i: number }> = ({ i }) => (
  <defs>
    <filter id={`mtg-g${i}`} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" />
    </filter>
    <filter id={`mtg-G${i}`} x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
    <radialGradient id={`mtg-dot${i}`}>
      <stop offset="0%" stopColor={C.ice} stopOpacity="1" />
      <stop offset="35%" stopColor={C.cyan} stopOpacity="0.45" />
      <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`mtg-flare${i}`}>
      <stop offset="0%" stopColor={C.ice} stopOpacity="0.95" />
      <stop offset="22%" stopColor="#9fe9ff" stopOpacity="0.5" />
      <stop offset="100%" stopColor={C.sky} stopOpacity="0" />
    </radialGradient>
    <linearGradient id={`mtg-rise${i}`} x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stopColor={C.cyan} stopOpacity="0" />
      <stop offset="70%" stopColor={C.cyan} stopOpacity="0.55" />
      <stop offset="100%" stopColor={C.ice} stopOpacity="1" />
    </linearGradient>
    <linearGradient id={`mtg-streakR${i}`} x1="0" x2="1">
      <stop offset="0%" stopColor={C.cyan} stopOpacity="0" />
      <stop offset="100%" stopColor={C.ice} stopOpacity="1" />
    </linearGradient>
    <linearGradient id={`mtg-streakL${i}`} x1="1" x2="0">
      <stop offset="0%" stopColor={C.cyan} stopOpacity="0" />
      <stop offset="100%" stopColor={C.ice} stopOpacity="1" />
    </linearGradient>
  </defs>
);

/** نقطة رصدٍ تنبض: حلقةٌ تتّسع على الإيقاع، وهالةٌ، وقلبٌ أبيض. */
const Spot: FC<{ p: Pt; on: number; t: number; i: number; r?: number; tone?: string }> = ({
  p,
  on,
  t,
  i,
  r = 1,
  tone = C.cyan,
}) => {
  if (on <= 0.01) return null;
  const ring = frac(t / BEAT + (p.x % 89) / 89);
  return (
    <g opacity={on}>
      <circle
        cx={p.x}
        cy={p.y}
        r={(7 + 26 * ring) * r}
        fill="none"
        stroke={tone}
        strokeWidth={1.5}
        opacity={0.7 * (1 - ring)}
      />
      <circle cx={p.x} cy={p.y} r={16 * r} fill={`url(#mtg-dot${i})`} />
      <circle cx={p.x} cy={p.y} r={3.6 * r} fill={C.ice} />
    </g>
  );
};

/** وهجٌ أفقيّ (عدسةٌ أنامورفية) على مصباحٍ ساطع. */
const Flare: FC<{ p: Pt; i: number; a: number; len?: number }> = ({ p, i, a, len = 260 }) => (
  <g opacity={a}>
    <ellipse cx={p.x} cy={p.y} rx={len} ry={3.2} fill={`url(#mtg-flare${i})`} />
    <ellipse cx={p.x} cy={p.y} rx={len * 0.3} ry={1.3} fill={C.ice} opacity={0.75} />
    <ellipse cx={p.x} cy={p.y} rx={1.4} ry={len * 0.16} fill={C.ice} opacity={0.6} />
    <circle cx={p.x} cy={p.y} r={24} fill={`url(#mtg-flare${i})`} />
  </g>
);

/* ─────────────────────────────── الجسيمات ─────────────────────────────── */

const MOTES = (() => {
  const rnd = seeded(9177);
  return Array.from({ length: 58 }, () => ({
    x: rnd() * W,
    y: rnd() * H,
    d: rnd(),
    s: rnd(),
    ph: rnd() * TAU,
  }));
})();

const wrap = (x: number, span: number) => ((x % span) + span) % span;

/**
 * ذرّات ضوءٍ صاعدة بعمق: البعيدة دقيقةٌ حادّة، والقريبة بقعٌ ليّنة (بوكيه) تنزاح أكثر مع الكاميرا.
 * `pan` إزاحة الصورة منذ أوّل اللقطة — فالحقل يتحرّك معها بتفاوتٍ (عمق).
 */
const Motes: FC<{ local: number; i: number; pan: Pt; k?: number }> = ({ local, i, pan, k = 1 }) => {
  const ox = (i * 337) % W;
  const oy = (i * 191) % H;
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ ...box(0, 0, W, H), mixBlendMode: "screen" }}
    >
      <defs>
        <radialGradient id={`mtg-bokeh${i}`}>
          <stop offset="0%" stopColor="#cfefff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#8fd6ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8fd6ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {MOTES.map((m, j) => {
        const depth = 0.35 + 0.95 * m.d;
        const x = wrap(m.x + ox + pan.x * depth + 18 * Math.sin(local * 1.3 + m.ph), W + 120) - 60;
        const y = wrap(m.y + oy + pan.y * depth - (36 + 150 * m.d) * local, H + 120) - 60;
        return m.d > 0.8 ? (
          <circle
            key={j}
            cx={x}
            cy={y}
            r={10 + 22 * m.s}
            fill={`url(#mtg-bokeh${i})`}
            opacity={0.55 * k}
          />
        ) : (
          <circle
            key={j}
            cx={x}
            cy={y}
            r={0.9 + 1.6 * m.s}
            fill={C.ice}
            opacity={(0.25 + 0.5 * m.s) * k * (0.6 + 0.4 * Math.sin(local * 5 + m.ph))}
          />
        );
      })}
    </svg>
  );
};

/* ─────────────────────── طبقات الذكاء فوق الصور ─────────────────────── */

type Ctx = {
  t: number;
  i: number;
  local: number;
  dur: number;
  u: number;
  view: View;
  map: (p: Pt) => Pt;
  energy: number;
};

/* —— ① المجمّع الصناعيّ: شبكةٌ تصل المنشآت (قممُ الأبراج وعناقيد الأضواء) —— */

const COMPLEX_NODES: readonly Pt[] = [
  P(177, 272),
  P(272, 235),
  P(325, 183),
  P(430, 300),
  P(492, 172),
  P(540, 336),
  P(598, 182),
  P(657, 172),
  P(700, 408),
  P(786, 216),
  P(903, 219),
  P(995, 242),
  P(965, 338),
  P(1110, 265),
  P(1207, 247),
  P(118, 330),
  P(957, 217),
  P(861, 216),
];

const COMPLEX_LINKS = (
  [
    [15, 0],
    [0, 1],
    [1, 2],
    [2, 4],
    [4, 6],
    [6, 7],
    [7, 9],
    [9, 17],
    [17, 10],
    [10, 16],
    [16, 11],
    [11, 13],
    [13, 14],
    [2, 3],
    [3, 5],
    [5, 6],
    [5, 8],
    [8, 12],
    [12, 11],
    [12, 13],
    [6, 9],
    [3, 0],
  ] as const
).map(([a, b], j) => ({
  a,
  b,
  tr: arcTrace(COMPLEX_NODES[a], COMPLEX_NODES[b], 0.15 + 0.06 * (j % 3)),
}));

/** `from` لحظة بدء الرسم (ث من أوّل اللقطة)، و`lit` 1 = الشبكة مكتملةٌ من أوّل إطار. */
function complexNet(c: Ctx, from: number, lit: number): ReactNode {
  const { local, t, i, map, energy } = c;
  const lines: ReactNode[] = [];
  const reached = new Array<number>(COMPLEX_NODES.length).fill(0);
  COMPLEX_LINKS.forEach((l, j) => {
    const start = from + j * 0.025;
    const p = Math.max(lit, clamp01((local - start) / 0.3));
    if (p <= 0) return;
    reached[l.a] = Math.max(reached[l.a], ramp(p, 0, 0.15));
    reached[l.b] = Math.max(reached[l.b], ramp(p, 0.85, 1));
    lines.push(
      <polyline
        key={`l${j}`}
        points={pts(sample(l.tr, 0, p, 16).map(map))}
        fill="none"
        stroke={j % 5 === 2 ? C.green : C.cyan}
        strokeWidth={2}
        strokeOpacity={0.6 + 0.3 * energy}
        strokeLinecap="round"
      />,
    );
    if (p >= 1) {
      const flow = frac(t * (0.9 + 0.9 * energy) + j * 0.137);
      lines.push(<Comet key={`c${j}`} tr={l.tr} head={flow} len={0.3} map={map} w={2.6} />);
    }
  });
  return (
    <>
      <Glowing id={`mtg-g${i}`}>{lines}</Glowing>
      {COMPLEX_NODES.map((n, j) => (
        <Spot
          key={`n${j}`}
          p={map(n)}
          on={reached[j]}
          t={t}
          i={i}
          r={0.85}
          tone={j % 4 === 1 ? C.green : C.cyan}
        />
      ))}
    </>
  );
}

/** حوامل الأنابيب في المجمّع — نبضاتٌ تجري عليها كبياناتٍ في عروق المنشأة. */
const RACKS: readonly Trace[] = [
  line(P(1290, 350), P(700, 526)),
  line(P(-10, 414), P(440, 340)),
  line(P(1290, 300), P(905, 318)),
  line(P(905, 318), P(612, 356)),
];

function rackPulses(c: Ctx, count: number): ReactNode {
  const out: ReactNode[] = [];
  RACKS.forEach((tr, r) => {
    out.push(
      <polyline
        key={`b${r}`}
        points={pts(sample(tr, 0, 1, 2).map(c.map))}
        fill="none"
        stroke={C.cyan}
        strokeWidth={2}
        opacity={0.28 + 0.3 * pulse(c.t, 4)}
      />,
    );
    for (let j = 0; j < count; j++) {
      const head = frac(c.local * (0.9 + 0.25 * r) + j / count + r * 0.31) * 1.25;
      out.push(<Comet key={`${r}-${j}`} tr={tr} head={head} len={0.3} map={c.map} w={4.2} />);
    }
  });
  return <Glowing id={`mtg-g${c.i}`}>{out}</Glowing>;
}

/* —— ② خطوط النقل: نبضات طاقةٍ تجري على الموصِّلات من الأفق نحو الكاميرا —— */

type Tower = { lu: Pt; ru: Pt; ll: Pt; rl: Pt };
const tower = (lu: Pt, ru: Pt, ll: Pt, rl: Pt): Tower => ({ lu, ru, ll, rl });

/** نقاط تعليق الموصِّلات على الأبراج (بكسلات المصدر). */
const TOWERS: readonly Tower[] = [
  tower(P(346, 183), P(440, 182), P(337, 257), P(462, 257)),
  tower(P(633, 287), P(697, 285), P(632, 323), P(703, 320)),
  tower(P(765, 316), P(802, 316), P(764, 339), P(806, 339)),
  tower(P(845, 335), P(872, 335), P(844, 352), P(874, 352)),
  tower(P(899, 351), P(922, 351), P(898, 366), P(924, 366)),
  tower(P(938, 360), P(958, 360), P(937, 373), P(960, 373)),
  tower(P(967, 366), P(983, 366), P(966, 376), P(985, 376)),
  tower(P(992, 370), P(1007, 370), P(991, 379), P(1008, 379)),
];
const VANISH = P(1086, 389);
const EXITS = { lu: P(-40, 146), ru: P(-40, 176), ll: P(-40, 218), rl: P(-40, 292) };

/** الموصِّلات الأربعة من الأفق إلى البرج القريب ثم خارج الإطار يسارًا. */
const WIRES: readonly Trace[] = (["lu", "ru", "ll", "rl"] as const).map((key) =>
  sagged([VANISH, ...[...TOWERS].reverse().map((tw) => tw[key]), EXITS[key]], 0.035),
);

function linePulses(c: Ctx, count: number, speed: number): ReactNode {
  const { local, map, i, energy } = c;
  const comets: ReactNode[] = [];
  WIRES.forEach((tr, w) => {
    for (let j = 0; j < count; j++) {
      const p = frac(local * speed + j / count + w * 0.21);
      const head = accel(p) * 1.15;
      comets.push(
        <Comet
          key={`${w}-${j}`}
          tr={tr}
          head={head}
          len={0.04 + 0.1 * head}
          map={map}
          w={1.6 + 2.8 * head}
          tone={w % 2 ? C.cyan : C.sky}
          a={0.75 + 0.25 * energy}
        />,
      );
    }
  });
  return <Glowing id={`mtg-g${i}`}>{comets}</Glowing>;
}

/** منارات قمم الأبراج: حمراءُ دافئة تومض على الإيقاع — اللون الدافئ الوحيد في الدرجة الباردة. */
const BEACONS: readonly Pt[] = [
  P(344, 133),
  P(443, 131),
  P(635, 258),
  P(695, 256),
  P(762, 297),
  P(803, 297),
  P(842, 322),
  P(874, 322),
];

function beacons(c: Ctx): ReactNode {
  const glow = 0.45 + 0.55 * pulse(c.t, 4);
  return BEACONS.map((b, j) => {
    const p = c.map(b);
    return (
      <g key={j} opacity={glow}>
        <circle
          cx={p.x}
          cy={p.y}
          r={14}
          fill="#ff4b42"
          opacity={0.4}
          filter={`url(#mtg-g${c.i})`}
        />
        <circle cx={p.x} cy={p.y} r={3} fill="#ffe2df" />
      </g>
    );
  });
}

/* —— ③ محطّة التحويل: شعاعُ مسحٍ يمرّ فيوقظ العوازل والمعدّات —— */

const SUB_NODES: readonly Pt[] = [
  P(858, 176),
  P(892, 186),
  P(920, 192),
  P(895, 125),
  P(928, 137),
  P(1017, 172),
  P(1040, 181),
  P(1095, 207),
  P(1060, 242),
  P(1087, 246),
  P(290, 240),
  P(420, 236),
  P(130, 272),
  P(560, 300),
  P(700, 292),
];
const SUB_LAMPS: readonly Pt[] = [P(72, 36), P(515, 210), P(980, 243), P(1248, 190)];
/** الأسلاك العلوية خلف الجسر — تجري عليها النبضات في التأطير الأيمن. */
const SUB_WIRES: readonly Trace[] = [
  sagged([P(1290, 68), P(760, 172)], 0.02),
  sagged([P(1290, 100), P(1100, 128)], 0.01),
  sagged([P(1290, 203), P(1105, 222)], 0.01),
  sagged([P(1290, 40), P(905, 98)], 0.015),
];

function scanBeam(c: Ctx, nodes: readonly Pt[], from: number, to: number): ReactNode {
  const { u, map, t, i } = c;
  const x = lerp(from, to, glide(u));
  const dir = to > from ? 1 : -1;
  const speed = Math.abs(to - from) / c.dur;
  return (
    <>
      <defs>
        <linearGradient id={`mtg-scan${i}`} x1={dir > 0 ? "0" : "1"} x2={dir > 0 ? "1" : "0"}>
          <stop offset="0%" stopColor={C.cyan} stopOpacity="0" />
          <stop offset="85%" stopColor={C.cyan} stopOpacity="0.07" />
          <stop offset="100%" stopColor={C.ice} stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <rect x={dir > 0 ? x - 240 : x} y={0} width={240} height={H} fill={`url(#mtg-scan${i})`} />
      <Glowing id={`mtg-g${i}`}>
        <line x1={x} y1={0} x2={x} y2={H} stroke={C.ice} strokeWidth={1.8} opacity={0.85} />
      </Glowing>
      {nodes.map((n, j) => {
        const p = map(n);
        const passed = dir * (x - p.x);
        const on = passed > 0 ? Math.max(0.4, Math.exp(-passed / (speed * 0.35))) : 0;
        return (
          <Spot key={j} p={p} on={on} t={t} i={i} r={0.8} tone={j % 5 === 3 ? C.green : C.cyan} />
        );
      })}
    </>
  );
}

function subWirePulses(c: Ctx): ReactNode {
  const out: ReactNode[] = [];
  SUB_WIRES.forEach((tr, w) => {
    for (let j = 0; j < 3; j++) {
      const head = frac(c.local * 1.6 + j / 3 + w * 0.27) * 1.2;
      out.push(<Comet key={`${w}-${j}`} tr={tr} head={head} len={0.25} map={c.map} w={2.4} />);
    }
  });
  return <Glowing id={`mtg-g${c.i}`}>{out}</Glowing>;
}

/* —— ④ محطّة التوليد: أرضيةٌ رقمية منظوريّة تمسحها موجةٌ من المحطّة نحو الكاميرا —— */

const PWR = { horizon: 292, vx: 640, f: 950 } as const;
/** الماء في القناة (يُستثنى من الأرضية): الضفّة البعيدة يمينًا ثم القريبة يسارًا. */
const CANAL: readonly Pt[] = [
  P(-20, 450),
  P(300, 440),
  P(600, 422),
  P(800, 402),
  P(950, 385),
  P(1100, 370),
  P(1300, 353),
  P(1300, 386),
  P(1100, 402),
  P(1000, 425),
  P(900, 440),
  P(700, 465),
  P(600, 490),
  P(450, 505),
  P(0, 532),
  P(-20, 534),
];

/** الموجة تبدأ عند `y0` (قاعدة المحطّة، بكسلات المصدر) وتبلغ أدنى صفٍّ ظاهر من الأرض مع آخر اللقطة. */
function groundGrid(c: Ctx, y0: number): ReactNode {
  const { map, i, u, energy, view } = c;
  const yAt = (z: number) => PWR.horizon + PWR.f / z;
  const zNear = 3.5;
  const zFar = 70;
  const y1 = Math.min(560, (H - view.y) / view.k + 10);
  const waveY = lerp(y0, y1, glide(u));
  const lines: ReactNode[] = [];
  for (let j = 0; j < 34; j++) {
    const z = zNear * Math.pow(zFar / zNear, j / 33);
    const y = yAt(z);
    const near = Math.exp(-Math.abs(y - waveY) / 7);
    const a = map(P(-20, y));
    const b = map(P(1300, y));
    lines.push(
      <line
        key={`h${j}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={near > 0.3 ? C.ice : C.cyan}
        strokeWidth={0.8 + 1.8 * near}
        opacity={(0.2 + 0.12 * energy) * (1 - j / 40) + 0.75 * near}
      />,
    );
  }
  for (let j = -36; j <= 36; j++) {
    const X = j * 0.42;
    const a = map(P(PWR.vx + (PWR.f * X) / zNear, yAt(zNear)));
    const b = map(P(PWR.vx + (PWR.f * X) / zFar, yAt(zFar)));
    lines.push(
      <line
        key={`v${j}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={C.cyan}
        strokeWidth={1}
        opacity={0.24 + 0.1 * energy}
      />,
    );
  }
  // جبهة الموجة: خطٌّ ساطع وتوهّجٌ عريض.
  const wa = map(P(-20, waveY));
  const wb = map(P(1300, waveY));
  const top = map(P(0, yAt(zFar))).y;
  const bottom = map(P(0, yAt(zNear))).y;
  return (
    <>
      <defs>
        <linearGradient
          id={`mtg-floor${i}`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={top}
          x2="0"
          y2={bottom}
        >
          <stop offset="0%" stopColor="#000" stopOpacity="1" />
          <stop offset="16%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`mtg-floorMask${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect x={0} y={top} width={W} height={H - top} fill={`url(#mtg-floor${i})`} />
          <polygon points={pts(CANAL.map(map))} fill="#000" />
        </mask>
      </defs>
      <g mask={`url(#mtg-floorMask${i})`}>
        <Glowing id={`mtg-g${i}`} k={0.9}>
          {lines}
        </Glowing>
        <line
          x1={wa.x}
          y1={wa.y}
          x2={wb.x}
          y2={wb.y}
          stroke={C.cyan}
          strokeWidth={34}
          opacity={0.45}
          filter={`url(#mtg-G${i})`}
        />
        <line
          x1={wa.x}
          y1={wa.y}
          x2={wb.x}
          y2={wb.y}
          stroke={C.ice}
          strokeWidth={2.2}
          opacity={0.9}
        />
      </g>
    </>
  );
}

/** أعمدة انعكاس الأضواء في القناة (أعلى العمود وطوله، بكسلات المصدر). */
const REFLECTIONS: readonly (Pt & { h: number })[] = [
  { x: 447, y: 440, h: 56 },
  { x: 486, y: 438, h: 56 },
  { x: 505, y: 437, h: 60 },
  { x: 530, y: 436, h: 58 },
  { x: 554, y: 434, h: 58 },
  { x: 582, y: 432, h: 54 },
  { x: 658, y: 420, h: 40 },
  { x: 700, y: 417, h: 40 },
  { x: 742, y: 412, h: 38 },
  { x: 800, y: 405, h: 34 },
  { x: 880, y: 395, h: 34 },
  { x: 948, y: 387, h: 30 },
  { x: 1035, y: 378, h: 28 },
  { x: 1110, y: 372, h: 24 },
];
const GLINTS = (() => {
  const rnd = seeded(808);
  return Array.from({ length: 9 }, () => ({
    y: rnd(),
    w: rnd(),
    ph: rnd() * TAU,
    f: 8 + 10 * rnd(),
  }));
})();

/** بريق الماء: ومضاتٌ صغيرة تتلألأ داخل كل عمود انعكاس — يتحرّك الماء ولا تتحرّك الأضواء. */
function ripples(c: Ctx): ReactNode {
  const out: ReactNode[] = [];
  REFLECTIONS.forEach((r, j) => {
    GLINTS.forEach((g, k) => {
      const a = Math.max(0, Math.sin(c.local * g.f + g.ph + j * 1.3));
      if (a < 0.2) return;
      const p = c.map(P(r.x + 3 * Math.sin(c.local * 3 + k), r.y + g.y * r.h));
      out.push(
        <ellipse
          key={`${j}-${k}`}
          cx={p.x}
          cy={p.y}
          rx={4 + 9 * g.w}
          ry={1.2}
          fill={j % 4 === 1 ? "#ffe2b8" : C.ice}
          opacity={a}
        />,
      );
    });
  });
  return <Glowing id={`mtg-g${c.i}`}>{out}</Glowing>;
}

/* —— تيّارات الضوء الصاعدة (من الأسفل إلى الأعلى — تمهيدٌ للمعان الجوهرة) —— */

const STREAM_SEEDS = (() => {
  const rnd = seeded(5150);
  return Array.from({ length: 48 }, () => ({
    dx: rnd() - 0.5,
    sp: rnd(),
    len: rnd(),
    ph: rnd(),
    w: rnd(),
  }));
})();

function streams(
  c: Ctx,
  bases: readonly Pt[],
  perBase: number,
  spread: number,
  rise: number,
): ReactNode {
  const { local, map, i, energy } = c;
  const out: ReactNode[] = [];
  bases.forEach((b, j) => {
    const p = map(b);
    for (let k = 0; k < perBase; k++) {
      const s = STREAM_SEEDS[(j * perBase + k) % STREAM_SEEDS.length];
      const len = 70 + 230 * s.len;
      const range = rise + len;
      const head = p.y - ((local * (520 + 900 * s.sp) + s.ph * range) % range);
      const fade = clamp01((head - (p.y - rise)) / (rise * 0.35));
      const w = 2 + 2.6 * s.w;
      const x = p.x + s.dx * spread;
      out.push(
        <g key={`${j}-${k}`} opacity={(0.7 + 0.3 * energy) * fade}>
          <rect
            x={x - w / 2}
            y={head}
            width={w}
            height={Math.min(len, p.y - head)}
            fill={`url(#mtg-rise${i})`}
          />
          <circle cx={x} cy={head} r={w * 0.9} fill={C.ice} />
        </g>,
      );
    }
  });
  return <Glowing id={`mtg-g${i}`}>{out}</Glowing>;
}

/* —— خيوط سرعةٍ عابرة في البناء: ضوءٌ يمرق أفقيًّا عبر العدسة ويكثر مع التصعيد —— */

const STREAKS = (() => {
  const rnd = seeded(6060);
  return Array.from({ length: 8 }, () => ({
    y: 0.12 + 0.76 * rnd(),
    at: rnd(),
    len: rnd(),
    w: rnd(),
  }));
})();

function speedStreaks(i: number, local: number, dur: number, energy: number): ReactNode {
  const n = Math.round(6 * ramp(energy, 0.45, 1, (x) => x));
  if (n <= 0) return null;
  return (
    <g>
      {STREAKS.slice(0, n).map((s, j) => {
        const dir = (i + j) % 2 ? 1 : -1;
        const p = (local - s.at * dur * 0.7) / 0.22;
        if (p <= 0 || p >= 1) return null;
        const len = 380 + 520 * s.len;
        const head = dir > 0 ? lerp(-len, W + len, p) : lerp(W + len, -len, p);
        const y = ((s.y + i * 0.137) % 0.76) * H + 0.12 * H;
        return (
          <rect
            key={j}
            x={dir > 0 ? head - len : head}
            y={y - 1.2}
            width={len}
            height={2.4}
            fill={`url(#mtg-streak${dir > 0 ? "R" : "L"}${i})`}
            opacity={0.75}
          />
        );
      })}
    </g>
  );
}

/* ─────────────────────────────── اللقطات ─────────────────────────────── */

type PhotoShot = {
  kind: "photo";
  src: Source;
  move: Move;
  /** خطّ الأفق في المصدر — مرتكز الضباب. */
  horizon: number;
  fx: (c: Ctx) => ReactNode;
};

type IntelProps = { t: number; local: number; dur: number; u: number; i: number };
type IntelShot = { kind: "intel"; draw: FC<IntelProps> };
type Shot = PhotoShot | IntelShot;

const PhotoView: FC<{ shot: PhotoShot; t: number; i: number }> = ({ shot, t, i }) => {
  const t0 = CUTS[i];
  const dur = CUTS[i + 1] - t0;
  const local = t - t0;
  const view = viewOf(shot.src, camAt(shot.move, local, dur));
  const first = viewOf(shot.src, camAt(shot.move, 0, dur));
  const blur = whipBlur(shot.src, shot.move, local, dur);
  const map = (p: Pt) => toArt(view, p);
  const ctx: Ctx = { t, i, local, dur, u: local / dur, view, map, energy: energyAt(t) };
  const streaks = speedStreaks(i, local, dur, ctx.energy);
  // إزاحة مركز الصورة منذ أوّل اللقطة — لتنزاح الجسيمات معها بعمق.
  const c0 = P((CX - first.x) / first.k, (CY - first.y) / first.k);
  const pan = P(view.x + c0.x * view.k - CX, view.y + c0.y * view.k - CY);
  const img: CSSProperties = {
    ...box(0, 0, shot.src.w, shot.src.h),
    transformOrigin: "0 0",
    transform: `translate(${view.x.toFixed(2)}px, ${view.y.toFixed(2)}px) scale(${view.k.toFixed(5)})`,
  };
  const src = staticFile(shot.src.file);
  return (
    <div
      style={{ ...box(0, 0, W, H), overflow: "hidden", isolation: "isolate", background: C.navy }}
    >
      {blur > 0.5 ? (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <defs>
            <filter
              id={`mtg-mb${i}`}
              x="-5%"
              y="-5%"
              width="110%"
              height="110%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation={`${blur.toFixed(2)} 0`} edgeMode="duplicate" />
            </filter>
          </defs>
        </svg>
      ) : null}
      <div style={{ ...box(0, 0, W, H), filter: blur > 0.5 ? `url(#mtg-mb${i})` : undefined }}>
        <Img src={src} style={{ ...img, filter: BASE }} />
        <Img
          src={src}
          style={{ ...img, filter: bloomOf(ctx.energy), mixBlendMode: "screen", opacity: 0.85 }}
        />
        <div
          style={{
            ...box(0, 0, W, H),
            background: "#a6c3f0",
            mixBlendMode: "multiply",
            opacity: 0.42,
          }}
        />
        <div
          style={{
            ...box(0, 0, W, H),
            background: "#0b2c6c",
            mixBlendMode: "screen",
            opacity: 0.3,
          }}
        />
        <Haze y={view.y + shot.horizon * view.k} local={local} i={i} />
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ ...box(0, 0, W, H), mixBlendMode: "screen" }}
        >
          <GlowDefs i={i} />
          {shot.fx(ctx)}
          {streaks ? <Glowing id={`mtg-g${i}`}>{streaks}</Glowing> : null}
        </svg>
        <Motes local={local} i={i} pan={pan} k={0.8 + 0.4 * ctx.energy} />
      </div>
      <div style={VIGNETTE} />
    </div>
  );
};

/* ─────────────────── لقطات الذكاء الخالص (إجرائيّة كلّها) ─────────────────── */

/** خلفيّة لقطات الذكاء: كحليٌّ عميق بلبٍّ أفتح — في نطاق إضاءة الصور نفسه. */
const Deep: FC<{ cx?: number; cy?: number; core?: string }> = ({
  cx = 50,
  cy = 50,
  core = "#0f3a86",
}) => (
  <div
    style={{
      ...box(0, 0, W, H),
      background: `radial-gradient(62% 100% at ${cx}% ${cy}%, ${core} 0%, #0a2a68 34%, #061a46 64%, #030d27 100%)`,
    }}
  />
);

const Layer: FC<{ i: number; children: ReactNode }> = ({ i, children }) => (
  <svg
    width={W}
    height={H}
    viewBox={`0 0 ${W} ${H}`}
    style={{ ...box(0, 0, W, H), mixBlendMode: "screen" }}
  >
    <GlowDefs i={i} />
    {children}
  </svg>
);

/* —— (أ) شبكةٌ عصبية ثلاثية الأبعاد تدور، وإشارةٌ تسري فيها عقدةً عقدة —— */

const PLEXUS = (() => {
  const rnd = seeded(2026);
  const RX = 1020;
  const RY = 380;
  const RZ = 660;
  const nodes: { x: number; y: number; z: number; r: number }[] = [];
  const n = 230;
  for (let j = 0; j < n; j++) {
    const yy = 1 - (2 * (j + 0.5)) / n;
    const rr = Math.sqrt(1 - yy * yy);
    const th = j * 2.39996323;
    const s = 1 + (rnd() - 0.5) * 0.14;
    nodes.push({
      x: Math.cos(th) * rr * s * RX,
      y: yy * s * RY,
      z: Math.sin(th) * rr * s * RZ,
      r: rnd(),
    });
  }
  for (let j = 0; j < 50; j++) {
    const a = rnd() * TAU;
    const b = Math.acos(2 * rnd() - 1);
    const s = 0.25 + 0.55 * rnd();
    nodes.push({
      x: Math.sin(b) * Math.cos(a) * s * RX,
      y: Math.cos(b) * s * RY,
      z: Math.sin(b) * Math.sin(a) * s * RZ,
      r: rnd(),
    });
  }
  // روابط «بلكسس»: كل عقدةٍ بأقرب ثلاثٍ إليها في الفضاء نفسه (لا على الكرة قبل مطّها).
  const links: { a: number; b: number; len: number }[] = [];
  const seen = new Set<number>();
  const adj: number[][] = nodes.map(() => []);
  nodes.forEach((a, j) => {
    nodes
      .map((b, k) => ({ k, d: Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) }))
      .filter((o) => o.k !== j)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3)
      .forEach(({ k, d }) => {
        const key = Math.min(j, k) * 1000 + Math.max(j, k);
        if (seen.has(key)) return;
        seen.add(key);
        links.push({ a: Math.min(j, k), b: Math.max(j, k), len: d });
        adj[j].push(k);
        adj[k].push(j);
      });
  });
  // قفزات الإشارة من بذرتين (عقدتان أماميّتان) — موجة «تفكيرٍ» تسري على الروابط.
  const hop = nodes.map(() => Infinity);
  const queue: number[] = [];
  for (const seed of [12, 160]) {
    hop[seed] = 0;
    queue.push(seed);
  }
  while (queue.length) {
    const j = queue.shift() as number;
    for (const k of adj[j]) {
      if (hop[k] > hop[j] + 1) {
        hop[k] = hop[j] + 1;
        queue.push(k);
      }
    }
  }
  const maxLen = Math.max(...links.map((l) => l.len));
  return { nodes, links, hop: hop.map((h) => (Number.isFinite(h) ? h : 30)), maxLen };
})();

const Lattice: FC<IntelProps> = ({ t, local, u, i }) => {
  const yaw = -0.5 + 0.75 * u;
  const pitch = 0.32 - 0.1 * u;
  const D = lerp(1900, 1350, cine(u));
  const F = 1180;
  const front = local * 15 - 1;
  const proj = PLEXUS.nodes.map((n, j) => {
    const x1 = n.x * Math.cos(yaw) + n.z * Math.sin(yaw);
    const z1 = -n.x * Math.sin(yaw) + n.z * Math.cos(yaw);
    const y2 = n.y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = n.y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const k = F / Math.max(260, D + z2);
    const h = PLEXUS.hop[j];
    return {
      x: CX + x1 * k,
      y: CY + y2 * k,
      k,
      near: clamp01(0.5 - z2 / 1300),
      act: Math.exp(-(((h - front) / 1.3) ** 2)),
      lit: front > h ? 1 : 0,
      r: n.r,
    };
  });
  const links: ReactNode[] = [];
  const signals: ReactNode[] = [];
  PLEXUS.links.forEach((l, j) => {
    const p = proj[l.a];
    const q = proj[l.b];
    const near = (p.near + q.near) / 2;
    const act = Math.max(p.act, q.act);
    const short = 1 - 0.6 * (l.len / PLEXUS.maxLen);
    links.push(
      <line
        key={j}
        x1={p.x}
        y1={p.y}
        x2={q.x}
        y2={q.y}
        stroke={act > 0.6 ? "#bff4ff" : j % 9 === 0 ? C.green : C.cyan}
        strokeWidth={0.6 + 1.1 * near + 0.8 * act}
        opacity={short * (0.06 + 0.24 * near + 0.26 * Math.max(p.lit, q.lit)) + 0.42 * act}
      />,
    );
    // الإشارة تعبر الرابط من العقدة الأقرب إلى البذرة نحو الأبعد.
    const ha = PLEXUS.hop[l.a];
    const hb = PLEXUS.hop[l.b];
    if (ha !== hb) {
      const [from, to, h0] = ha < hb ? [p, q, ha] : [q, p, hb];
      const s = front - h0;
      if (s > 0 && s < 1) {
        signals.push(
          <circle
            key={j}
            cx={lerp(from.x, to.x, s)}
            cy={lerp(from.y, to.y, s)}
            r={1.8 + 2.2 * lerp(from.k, to.k, s)}
            fill={C.ice}
          />,
        );
      }
    }
  });
  return (
    <>
      <Deep core="#113f8f" />
      <Layer i={i}>
        <defs>
          <radialGradient id={`mtg-core${i}`}>
            <stop offset="0%" stopColor="#bdf3ff" stopOpacity="0.45" />
            <stop offset="45%" stopColor={C.cyan} stopOpacity="0.12" />
            <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx={CX}
          cy={CY}
          rx={820}
          ry={340}
          fill={`url(#mtg-core${i})`}
          opacity={0.65 + 0.35 * pulse(t, 5)}
        />
        <Glowing id={`mtg-g${i}`}>
          {links}
          {signals}
        </Glowing>
        {proj.map((p, j) => (
          <g key={j}>
            <circle
              cx={p.x}
              cy={p.y}
              r={(4 + 8 * p.near + 18 * p.act) * p.k}
              fill={`url(#mtg-dot${i})`}
              opacity={0.3 + 0.3 * p.lit + 0.4 * Math.max(p.near, p.act)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={(0.9 + 1.5 * p.r + 1.5 * p.act) * p.k}
              fill={C.ice}
              opacity={0.35 + 0.65 * Math.max(p.near, p.act)}
            />
            {p.act > 0.5 ? (
              // بريقٌ نجميّ على العقدة لحظة تعبرها الإشارة.
              <g opacity={(p.act - 0.5) * 2}>
                <ellipse cx={p.x} cy={p.y} rx={20 * p.k} ry={0.9} fill={C.ice} />
                <ellipse cx={p.x} cy={p.y} rx={0.9} ry={12 * p.k} fill={C.ice} />
              </g>
            ) : null}
          </g>
        ))}
      </Layer>
      <Motes local={local} i={i} pan={P(-240 * u, 0)} />
    </>
  );
};

/* —— (ب) طيرانٌ منخفض فوق تضاريس بيانات: شبكةٌ منظوريّة تتموّج وتجري نحو الكاميرا —— */

const Terrain: FC<IntelProps> = ({ t, local, i }) => {
  const HY = 262;
  const F = 760;
  const hc = 120;
  const scroll = local * 2600;
  const G = 150;
  const height = (X: number, Z: number) => {
    const side = clamp01((Math.abs(X) - 260) / 2200);
    const ridge =
      side *
      side *
      (300 + 140 * Math.sin(Z * 0.0017 + X * 0.0021) + 80 * Math.sin(Z * 0.0041 - X * 0.0033));
    return ridge + 18 * Math.sin(X * 0.01 + Z * 0.006);
  };
  const proj = (X: number, Z: number): Pt =>
    P(CX + (F * X) / Z, HY + (F * (hc - height(X, Z + scroll))) / Z);
  const fade = (Z: number) => Math.pow(clamp01(1 - Z / 5200), 1.3);
  const lines: ReactNode[] = [];
  for (let j = -22; j <= 22; j++) {
    const row: Pt[] = [];
    for (let s = 0; s <= 26; s++) row.push(proj(j * G, 60 * Math.pow(5200 / 60, s / 26)));
    lines.push(
      <polyline
        key={`l${j}`}
        points={pts(row)}
        fill="none"
        stroke={C.cyan}
        strokeWidth={1.1}
        opacity={0.55 - Math.abs(j) * 0.012}
      />,
    );
  }
  const off = scroll % G;
  for (let j = 1; j <= 34; j++) {
    const Z = j * G - off;
    if (Z < 60) continue;
    const row: Pt[] = [];
    for (let s = -22; s <= 22; s++) row.push(proj(s * G, Z));
    lines.push(
      <polyline
        key={`z${j}`}
        points={pts(row)}
        fill="none"
        stroke={C.cyan}
        strokeWidth={0.6 + 160 / Z}
        opacity={0.8 * fade(Z)}
      />,
    );
  }
  // ومضاتٌ تجري على الخطوط القريبة من المسار نحو الكاميرا أسرع من الطيران.
  const racers: ReactNode[] = [];
  for (let j = 0; j < 14; j++) {
    const X = (j % 2 ? 1 : -1) * G * (1 + (j % 7));
    const z0 = 5200 * (1 - frac(local * 0.9 + j * 0.29));
    const tail = Math.min(5200, z0 + 800);
    const seg: Pt[] = [];
    for (let s = 0; s <= 6; s++) seg.push(proj(X, lerp(tail, Math.max(60, z0), s / 6)));
    racers.push(
      <polyline
        key={j}
        points={pts(seg)}
        fill="none"
        stroke={j % 5 === 0 ? C.greenCore : C.ice}
        strokeWidth={2.6}
        strokeLinecap="round"
        opacity={0.95 * fade(z0)}
      />,
    );
  }
  const roll = 2.2 * Math.sin(local * 2.4);
  return (
    <>
      <div
        style={{
          ...box(0, 0, W, H),
          background: `linear-gradient(180deg, #030d27 0%, #071d4c ${HY - 140}px, #0d3878 ${HY - 4}px, #081d4a ${HY + 40}px, #051436 100%)`,
        }}
      />
      <Layer i={i}>
        <defs>
          <radialGradient id={`mtg-sun${i}`}>
            <stop offset="0%" stopColor={C.ice} stopOpacity="0.95" />
            <stop offset="18%" stopColor="#9fe9ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`rotate(${roll.toFixed(2)} ${CX} ${HY})`}>
          <ellipse
            cx={CX}
            cy={HY}
            rx={1500}
            ry={80}
            fill={`url(#mtg-sun${i})`}
            opacity={0.6 + 0.25 * pulse(t, 4)}
          />
          <ellipse cx={CX} cy={HY} rx={300} ry={130} fill={`url(#mtg-sun${i})`} opacity={0.85} />
          <Glowing id={`mtg-g${i}`}>
            {lines}
            {racers}
          </Glowing>
        </g>
      </Layer>
      <Motes local={local} i={i} pan={P(0, 140 * local)} k={0.7} />
    </>
  );
};

/* —— (ج) تيّاراتٌ تصعد من أرضيةٍ مضيئة بعيدة — مدينةُ ضوءٍ ترتفع من الأسفل إلى الأعلى —— */

const RISE = (() => {
  const rnd = seeded(31337);
  return Array.from({ length: 110 }, () => ({
    X: (rnd() - 0.5) * 5200,
    Z: 500 + rnd() * 4200,
    len: rnd(),
    sp: rnd(),
    ph: rnd(),
    green: rnd() < 0.16,
  }));
})();

const Rise: FC<IntelProps> = ({ t, local, u, i }) => {
  const HY = 430;
  const F = 900;
  const hc = 260;
  const dolly = local * 900;
  const proj = (X: number, Z: number, Y = 0): Pt => P(CX + (F * X) / Z, HY + (F * (hc - Y)) / Z);
  const floor: ReactNode[] = [];
  for (let j = -18; j <= 18; j++) {
    const a = proj(j * 300, 300);
    const b = proj(j * 300, 6000);
    floor.push(
      <line
        key={`l${j}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={C.cyan}
        strokeWidth={1}
        opacity={0.32}
      />,
    );
  }
  for (let j = 1; j <= 22; j++) {
    const Z = j * 300 - (dolly % 300);
    if (Z < 300) continue;
    const a = proj(-6000, Z);
    const b = proj(6000, Z);
    floor.push(
      <line
        key={`z${j}`}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={C.cyan}
        strokeWidth={0.5 + 300 / Z}
        opacity={0.55 * clamp01(1 - Z / 6600)}
      />,
    );
  }
  const beams = RISE.map((r, j) => {
    const Z = r.Z - dolly;
    if (Z < 260) return null;
    const base = proj(r.X, Z);
    const scale = F / Z;
    const len = (240 + 900 * r.len) * scale;
    const rise = (700 + 1500 * r.sp) * scale;
    const span = base.y + len + 40;
    const head = base.y - ((local * rise * 2.2 + r.ph * span) % span);
    const w = Math.max(1, 5 * scale);
    const top = Math.max(head, -40);
    return (
      <g key={j} opacity={0.4 + 0.6 * clamp01(scale * 2)}>
        <rect
          x={base.x - w / 2}
          y={top}
          width={w}
          height={Math.max(0, Math.min(len, base.y - top))}
          fill={r.green ? `url(#mtg-riseG${i})` : `url(#mtg-rise${i})`}
        />
        {head > 0 ? <circle cx={base.x} cy={head} r={w * 0.9} fill={C.ice} /> : null}
      </g>
    );
  });
  return (
    <>
      <div
        style={{
          ...box(0, 0, W, H),
          background: `linear-gradient(180deg, #030d27 0%, #061a46 ${HY - 160}px, #0d3878 ${HY}px, #0a2a68 ${HY + 60}px, #071d4c 100%)`,
        }}
      />
      <Layer i={i}>
        <defs>
          <linearGradient id={`mtg-riseG${i}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={C.green} stopOpacity="0" />
            <stop offset="70%" stopColor={C.green} stopOpacity="0.5" />
            <stop offset="100%" stopColor={C.greenCore} stopOpacity="1" />
          </linearGradient>
          <radialGradient id={`mtg-hz${i}`}>
            <stop offset="0%" stopColor="#bdf3ff" stopOpacity="0.7" />
            <stop offset="100%" stopColor={C.cyan} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx={CX}
          cy={HY}
          rx={1400}
          ry={70}
          fill={`url(#mtg-hz${i})`}
          opacity={0.55 + 0.3 * pulse(t, 5)}
        />
        <Glowing id={`mtg-g${i}`} k={0.8}>
          {floor}
        </Glowing>
        <Glowing id={`mtg-g${i}`}>{beams}</Glowing>
      </Layer>
      <Motes local={local} i={i} pan={P(0, 90 * u)} />
    </>
  );
};

/* —— (د) نفقُ ضوء: خيوطٌ تنطلق من المركز نحو الحوافّ والكاميرا تتسارع —— */

const WARP = (() => {
  const rnd = seeded(4242);
  return Array.from({ length: 200 }, () => ({
    a: rnd() * TAU,
    ph: rnd(),
    sp: rnd(),
    w: rnd(),
    tone: rnd(),
  }));
})();

const Warp: FC<IntelProps> = ({ t, local, u, i }) => {
  const R0 = 26;
  const R1 = 1500;
  const streaks = WARP.map((s, j) => {
    const p = frac(s.ph + local * (1.1 + 1.1 * s.sp) * (1 + 1.6 * u));
    const r = R0 * Math.pow(R1 / R0, p);
    const r2 = r * (1.1 + (0.45 + 0.6 * u) * p);
    const ca = Math.cos(s.a + 0.3 * u);
    const sa = Math.sin(s.a + 0.3 * u);
    return (
      <line
        key={j}
        x1={CX + ca * r}
        y1={CY + sa * r * 0.6}
        x2={CX + ca * r2}
        y2={CY + sa * r2 * 0.6}
        stroke={s.tone < 0.14 ? C.green : s.tone < 0.62 ? C.cyan : C.ice}
        strokeWidth={0.7 + 3.6 * p * (0.45 + s.w)}
        strokeLinecap="round"
        opacity={Math.pow(p, 0.7)}
      />
    );
  });
  return (
    <>
      <Deep core="#1a4fa8" />
      <Layer i={i}>
        <ellipse
          cx={CX}
          cy={CY}
          rx={520}
          ry={270}
          fill={`url(#mtg-dot${i})`}
          opacity={0.42 + 0.3 * pulse(t, 5)}
        />
        <Glowing id={`mtg-g${i}`}>{streaks}</Glowing>
        <ellipse cx={CX} cy={CY} rx={160} ry={70} fill={`url(#mtg-dot${i})`} opacity={0.9} />
      </Layer>
    </>
  );
};

/* —— (هـ) التقارب: دوّامةٌ تتقارب خيوطها من الحوافّ كلّها إلى نقطةٍ واحدة في مركز الإطار —— */

const FOCUS = P(CX, CY);

const VORTEX = (() => {
  const rnd = seeded(1608);
  const n = 84;
  return Array.from({ length: n }, (_, j) => {
    const a0 = (j / n) * TAU + rnd() * 0.06;
    const turn = 1.15 + 0.55 * rnd();
    const reach = 0.86 + 0.32 * rnd();
    const path: Pt[] = [];
    for (let k = 0; k <= 48; k++) {
      const s = k / 48;
      const r = Math.pow(1 - s, 1.25) * reach;
      const a = a0 + turn * s;
      path.push(P(CX + Math.cos(a) * r * (W / 2 + 60), CY + Math.sin(a) * r * (H / 2 + 60)));
    }
    // بعض الخيوط في منتصف طريقها لحظة القطع — فالإطار الأوّل ممتلئٌ لا فارغ.
    return {
      tr: trace(path),
      start: -0.34 + 0.74 * rnd(),
      dur: 0.3 + 0.14 * rnd(),
      w: 1.3 + 2.4 * rnd(),
      tone: j % 7 === 0 ? C.green : j % 2 ? C.cyan : C.sky,
    };
  });
})();

const INFALL = (() => {
  const rnd = seeded(77);
  return Array.from({ length: 60 }, () => ({ a: rnd() * TAU, ph: rnd(), r: 0.4 + 0.7 * rnd() }));
})();

const Converge: FC<IntelProps> = ({ t, local, u, i }) => {
  let arrived = 0;
  const filaments: ReactNode[] = [];
  const heads: ReactNode[] = [];
  VORTEX.forEach((s, j) => {
    const p = clamp01((local - s.start) / s.dur);
    if (p <= 0) return;
    if (p >= 1) arrived += 1;
    // يتحرّك الرأس من أوّل لحظة ثم يتسارع نحو المركز (جذبٌ يشتدّ).
    const head = Math.min(1, 0.3 * p + 0.7 * p * p * p);
    // الأثر الخافت يبقى خلف الرأس فتتراكم خيوط الدوّامة، ثم تنسحب أذيالها إلى النقطة في آخر اللقطة.
    const tail = Math.min(head, accel(ramp(local, 0.6, 0.96, (x) => x)));
    if (head - tail > 0.004) {
      filaments.push(
        <polyline
          key={j}
          points={pts(sample(s.tr, tail, head, 24))}
          fill="none"
          stroke={s.tone}
          strokeWidth={s.w * 0.5}
          opacity={0.24}
        />,
      );
    }
    if (p < 1) {
      heads.push(
        <Comet
          key={j}
          tr={s.tr}
          head={head}
          len={0.18 + 0.3 * head}
          map={(q) => q}
          w={s.w}
          tone={s.tone}
        />,
      );
    }
  });
  const dust = INFALL.map((d, j) => {
    const p = frac(d.ph + local * 1.4);
    const r = (1 - accel(p)) * d.r;
    const a = d.a + 1.2 * p;
    return (
      <circle
        key={j}
        cx={CX + Math.cos(a) * r * (W / 2)}
        cy={CY + Math.sin(a) * r * (H / 2)}
        r={1.2 + 1.2 * (1 - p)}
        fill={C.ice}
        opacity={0.6 * Math.sin(Math.PI * p)}
      />
    );
  });
  const k = arrived / VORTEX.length;
  const swell = accel(u);
  const core = 4 + 9 * k + 8 * swell;
  const halo = 60 + 160 * k + 160 * swell;
  return (
    <>
      <Deep core="#0f3a86" />
      <div
        style={{ ...box(0, 0, W, H), background: C.navy, opacity: 0.6 * ramp(local, 0.35, 1) }}
      />
      <Layer i={i}>
        {dust}
        <Glowing id={`mtg-g${i}`}>
          {filaments}
          {heads}
        </Glowing>
        <circle
          cx={FOCUS.x}
          cy={FOCUS.y}
          r={halo}
          fill={`url(#mtg-dot${i})`}
          opacity={0.35 + 0.6 * Math.max(k, swell)}
        />
        <g opacity={0.35 + 0.65 * swell}>
          <ellipse cx={FOCUS.x} cy={FOCUS.y} rx={90 + 520 * swell} ry={2.4} fill={C.ice} />
          <ellipse
            cx={FOCUS.x}
            cy={FOCUS.y}
            rx={2}
            ry={24 + 70 * swell}
            fill={C.ice}
            opacity={0.8}
          />
        </g>
        <circle cx={FOCUS.x} cy={FOCUS.y} r={core * 2.4} fill={`url(#mtg-dot${i})`} />
        <circle cx={FOCUS.x} cy={FOCUS.y} r={core} fill={C.ice} />
      </Layer>
    </>
  );
};

/* ───────────────────────────── قائمة اللقطات ───────────────────────────── */

const POWER_STACKS: readonly Pt[] = [P(566, 84), P(730, 116), P(459, 190), P(627, 204)];
const POWER_LAMPS: readonly Pt[] = [P(258, 282), P(708, 268), P(1035, 276)];
const COMPLEX_TOPS: readonly Pt[] = [
  P(325, 186),
  P(492, 175),
  P(598, 186),
  P(657, 175),
  P(517, 207),
];
const COMPLEX_FAR: readonly Pt[] = [
  P(786, 220),
  P(861, 220),
  P(903, 222),
  P(957, 221),
  P(995, 246),
];

const SHOTS: readonly Shot[] = [
  // ١ (0.5) المجمّع الصناعيّ عند الغسق — اندفاعٌ نحو قلبه، والشبكة تُرسم بين منشآته.
  {
    kind: "photo",
    src: COMPLEX,
    horizon: 180,
    move: {
      a: { s: 1.08, u: 0.47, v: 0.49 },
      b: { s: 1.26, u: 0.53, v: 0.52 },
      ease: punch,
      whipOut: 0.09,
    },
    fx: (c) => complexNet(c, 0.1, 0),
  },
  // ٢ (1.5) خطوط النقل عبر الكثبان — يدخل بسوطٍ ثم انسيابٌ، والطاقة تجري على الموصِّلات.
  {
    kind: "photo",
    src: LINES,
    horizon: 400,
    move: { a: { s: 1.22, u: 0.5, v: 0.5 }, b: { s: 1.28, u: 0.56, v: 0.5 }, whipIn: -0.07 },
    fx: (c) => (
      <>
        {linePulses(c, 3, 0.55)}
        {beacons(c)}
      </>
    ),
  },
  // ٣ (2.5) شبكةٌ عصبية تدور والإشارة تسري فيها.
  { kind: "intel", draw: Lattice },
  // ٤ (3.5) محطّة التوليد — دفعٌ نحو مداخنها، والموجة تمسح الأرضية الرقمية.
  {
    kind: "photo",
    src: POWER,
    horizon: 292,
    move: { a: { s: 1.04, u: 0.5, v: 0.52 }, b: { s: 1.22, u: 0.5, v: 0.46 }, ease: cine },
    fx: (c) => (
      <>
        {groundGrid(c, 304)}
        {POWER_LAMPS.map((p, j) => (
          <Flare key={j} p={c.map(p)} i={c.i} a={0.5 + 0.3 * pulse(c.t + j * 0.07, 4)} len={170} />
        ))}
      </>
    ),
  },
  // ٥ (4.5) محطّة التحويل — تراجعٌ والشعاع يمسح ويوقظ العوازل.
  {
    kind: "photo",
    src: SUBSTATION,
    horizon: 330,
    move: { a: { s: 1.42, u: 0.62, v: 0.42 }, b: { s: 1.1, u: 0.55, v: 0.47 }, ease: punch },
    fx: (c) => (
      <>
        {SUB_LAMPS.map((p, j) => (
          <Flare key={j} p={c.map(p)} i={c.i} a={0.7} len={320} />
        ))}
        {scanBeam(c, SUB_NODES, -200, W + 200)}
      </>
    ),
  },
  // ٦ (5.5) أبراج التقطير من قريب — إمالةٌ صاعدة والضوء يصعد منها.
  {
    kind: "photo",
    src: COMPLEX,
    horizon: 180,
    move: {
      a: { s: 1.36, u: 0.47, v: 0.56 },
      b: { s: 1.42, u: 0.5, v: 0.42 },
      ease: cine,
      whipOut: 0.08,
    },
    fx: (c) => (
      <>
        {streams(c, COMPLEX_TOPS, 4, 20, 340)}
        {complexNet(c, 0, 1)}
      </>
    ),
  },
  // ٧ (6.5) خطّ الأبراج نحو الأفق — يدخل بسوطٍ واندفاعٌ نحو نقطة التلاشي.
  {
    kind: "photo",
    src: LINES,
    horizon: 400,
    move: {
      a: { s: 1.3, u: 0.56, v: 0.6 },
      b: { s: 1.44, u: 0.65, v: 0.62 },
      ease: speedRamp,
      whipIn: -0.07,
    },
    fx: (c) => (
      <>
        {linePulses(c, 4, 0.8)}
        {beacons(c)}
      </>
    ),
  },
  // ٨ (7.5) طيرانٌ فوق تضاريس البيانات.
  { kind: "intel", draw: Terrain },
  // ٩ (8.5) مداخن المحطّة — إمالةٌ صاعدة والضوء يصعد منها.
  {
    kind: "photo",
    src: POWER,
    horizon: 292,
    move: { a: { s: 1.38, u: 0.5, v: 0.54 }, b: { s: 1.45, u: 0.5, v: 0.38 }, ease: punch },
    fx: (c) => streams(c, POWER_STACKS, 4, 16, 380),
  },
  // ١٠ (9.0) عوازل محطّة التحويل — لكمةٌ والعُقد تنبض.
  {
    kind: "photo",
    src: SUBSTATION,
    horizon: 330,
    move: { a: { s: 1.3, u: 0.6, v: 0.36 }, b: { s: 1.44, u: 0.645, v: 0.36 }, ease: punch },
    fx: (c) => (
      <>
        {SUB_LAMPS.map((p, j) => (
          <Flare key={j} p={c.map(p)} i={c.i} a={0.75} len={360} />
        ))}
        {scanBeam(c, SUB_NODES, W + 200, -200)}
      </>
    ),
  },
  // ١١ (9.5) أضواء المجمّع البعيدة والجبال — انسيابٌ والشبكة تصلها.
  {
    kind: "photo",
    src: COMPLEX,
    horizon: 180,
    move: { a: { s: 1.42, u: 0.6, v: 0.4 }, b: { s: 1.45, u: 0.65, v: 0.41 }, ease: glide },
    fx: (c) => (
      <>
        {complexNet(c, 0, 1)}
        {streams(c, COMPLEX_FAR, 3, 14, 260)}
      </>
    ),
  },
  // ١٢ (10.0) تيّاراتٌ صاعدة من أرضيةٍ مضيئة.
  { kind: "intel", draw: Rise },
  // ١٣ (10.5) البرج القريب — لكمةٌ نحوه والنبضات أسرع.
  {
    kind: "photo",
    src: LINES,
    horizon: 400,
    move: { a: { s: 1.3, u: 0.4, v: 0.42 }, b: { s: 1.44, u: 0.355, v: 0.4 }, ease: punch },
    fx: (c) => (
      <>
        {linePulses(c, 4, 1)}
        {beacons(c)}
      </>
    ),
  },
  // ١٤ (11.0) انعكاسات القناة — إمالةٌ نازلة والأرضية والماء يتلألآن.
  {
    kind: "photo",
    src: POWER,
    horizon: 292,
    move: { a: { s: 1.36, u: 0.46, v: 0.6 }, b: { s: 1.42, u: 0.5, v: 0.72 }, ease: cine },
    fx: (c) => (
      <>
        {groundGrid(c, 300)}
        {ripples(c)}
      </>
    ),
  },
  // ١٥ (11.5) المصباح والأسلاك العلوية في محطّة التحويل — والنبضات تجري عليها.
  {
    kind: "photo",
    src: SUBSTATION,
    horizon: 330,
    move: {
      a: { s: 1.4, u: 0.6, v: 0.3 },
      b: { s: 1.45, u: 0.645, v: 0.3 },
      ease: punch,
      whipIn: -0.05,
    },
    fx: (c) => (
      <>
        {subWirePulses(c)}
        {SUB_LAMPS.map((p, j) => (
          <Flare key={j} p={c.map(p)} i={c.i} a={0.8} len={420} />
        ))}
      </>
    ),
  },
  // ١٦ (12.0) حوامل الأنابيب وأبراج التبريد يمين المجمّع — انسيابٌ والنبضات تجري فيها.
  {
    kind: "photo",
    src: COMPLEX,
    horizon: 180,
    move: { a: { s: 1.38, u: 0.6, v: 0.55 }, b: { s: 1.44, u: 0.65, v: 0.55 }, ease: glide },
    fx: (c) => rackPulses(c, 3),
  },
  // ١٧ (12.5) ساحة المحوّلات في محطّة التوليد — والأرضية تشتعل بالموجة.
  {
    kind: "photo",
    src: POWER,
    horizon: 292,
    move: { a: { s: 1.34, u: 0.6, v: 0.52 }, b: { s: 1.42, u: 0.645, v: 0.49 }, ease: punch },
    fx: (c) => (
      <>
        {groundGrid(c, 302)}
        {POWER_LAMPS.map((p, j) => (
          <Flare key={j} p={c.map(p)} i={c.i} a={0.7} len={200} />
        ))}
      </>
    ),
  },
  // ١٨ (13.0) الأبراج الوسطى — انسيابٌ والنبضات تتسابق.
  {
    kind: "photo",
    src: LINES,
    horizon: 400,
    move: { a: { s: 1.36, u: 0.52, v: 0.5 }, b: { s: 1.44, u: 0.58, v: 0.52 }, ease: punch },
    fx: (c) => (
      <>
        {linePulses(c, 6, 1.3)}
        {beacons(c)}
      </>
    ),
  },
  // ١٩ (13.5) محوّلات محطّة التحويل — لكمةٌ والشعاع.
  {
    kind: "photo",
    src: SUBSTATION,
    horizon: 330,
    move: { a: { s: 1.34, u: 0.38, v: 0.56 }, b: { s: 1.45, u: 0.35, v: 0.57 }, ease: punch },
    fx: (c) => (
      <>
        {SUB_LAMPS.map((p, j) => (
          <Flare key={j} p={c.map(p)} i={c.i} a={0.8} len={420} />
        ))}
        {scanBeam(c, SUB_NODES, -200, W + 200)}
      </>
    ),
  },
  // ٢٠ (14.0) يسار المجمّع — الشبكة مكتملةٌ والنبضات أسرع.
  {
    kind: "photo",
    src: COMPLEX,
    horizon: 180,
    move: { a: { s: 1.3, u: 0.39, v: 0.54 }, b: { s: 1.42, u: 0.355, v: 0.54 }, ease: punch },
    fx: (c) => (
      <>
        {complexNet(c, 0, 1)}
        {streams(c, COMPLEX_TOPS, 4, 20, 320)}
      </>
    ),
  },
  // ٢١ (14.5) تراجعٌ حادّ من ذراع البرج القريب يكشف الموصِّلات كلّها متّقدة.
  {
    kind: "photo",
    src: LINES,
    horizon: 400,
    move: { a: { s: 1.45, u: 0.35, v: 0.36 }, b: { s: 1.1, u: 0.5, v: 0.5 }, ease: punch },
    fx: (c) => (
      <>
        {linePulses(c, 8, 1.6)}
        {beacons(c)}
      </>
    ),
  },
  // ٢٢ (15.0) نفق الضوء.
  { kind: "intel", draw: Warp },
  // ٢٣ (15.5) التقارب إلى نقطةٍ واحدة.
  { kind: "intel", draw: Converge },
];

/* ─────────────────────────────── الاشتعال ─────────────────────────────── */

/** موضع اللمعة المرسومة على حافّة الرمز في اللوحة (بكسلات اللوحة). */
const SPARK = P(1829, 216);

const Ignite: FC<{ t: number; f: number }> = ({ t, f }) => {
  const plate = staticFile(PLATE_FILE);
  // الإطار 0 = اللوحة نفسها تمامًا (ملصق الفيديو): لا مرشّح ولا طبقة فوقها.
  if (f <= 0) return <Img src={plate} style={box(0, 0, W, H)} />;
  const u = t / ACT.igniteEnd;
  const e = Math.pow(u, 1.8);
  const push = 1 + 0.11 * e;
  const wash = Math.pow(u, 3);
  const bloomR = 160 + 1150 * e;
  const emblem = staticFile(EMBLEM_FILE);
  const at = `${EMBLEM.cx}px ${EMBLEM.cy}px`;
  const rays = `radial-gradient(circle at ${at}, #000 0px, #000 ${(150 + 260 * e).toFixed(0)}px, transparent ${(320 + 1300 * e).toFixed(0)}px)`;
  return (
    <div style={{ ...box(0, 0, W, H), overflow: "hidden", isolation: "isolate" }}>
      <div
        style={{ ...box(0, 0, W, H), transform: `scale(${push.toFixed(5)})`, transformOrigin: at }}
      >
        <Img
          src={plate}
          style={{ ...box(0, 0, W, H), filter: `brightness(${(1 + 0.2 * e).toFixed(3)})` }}
        />
      </div>
      {/* خلف الرمز: هالةٌ تنفجر، وأشعّةٌ تدور قليلًا وتخبو مع البعد */}
      <div
        style={{
          ...box(0, 0, W, H),
          mixBlendMode: "screen",
          background: `radial-gradient(circle at ${at}, rgba(255,255,255,${(0.95 * e).toFixed(3)}) 0px, rgba(170,232,255,${(0.7 * e).toFixed(3)}) ${(bloomR * 0.24).toFixed(0)}px, rgba(95,178,255,${(0.32 * e).toFixed(3)}) ${(bloomR * 0.56).toFixed(0)}px, rgba(95,178,255,0) ${bloomR.toFixed(0)}px)`,
        }}
      />
      <div
        style={{
          ...box(0, 0, W, H),
          mixBlendMode: "screen",
          opacity: 0.8 * e,
          background: `repeating-conic-gradient(from ${(8 + 26 * u).toFixed(2)}deg at ${at}, rgba(190,240,255,0) 0deg, rgba(190,240,255,0.55) 1.6deg, rgba(190,240,255,0) 5deg, rgba(190,240,255,0) 11deg)`,
          maskImage: rays,
          WebkitMaskImage: rays,
        }}
      />
      {/* الرمز نفسه أمام انفجار الضوء: يبقى مقروءًا ويتّقد، وتوهّجه خلفه */}
      <div
        style={{ ...box(0, 0, W, H), transform: `scale(${push.toFixed(5)})`, transformOrigin: at }}
      >
        <Img
          src={emblem}
          style={{
            ...box(EMBLEM.x, EMBLEM.y, EMBLEM.size, EMBLEM.size),
            filter: `blur(${(12 + 30 * e).toFixed(1)}px) brightness(1.9)`,
            transform: `scale(${(1.04 + 0.4 * e).toFixed(4)})`,
            mixBlendMode: "screen",
            opacity: 0.92 * u,
          }}
        />
        <Img
          src={emblem}
          style={{
            ...box(EMBLEM.x, EMBLEM.y, EMBLEM.size, EMBLEM.size),
            filter: `brightness(${(1 + 0.32 * e).toFixed(3)}) saturate(${(1 + 0.25 * e).toFixed(3)})`,
            opacity: clamp01(u * 4),
          }}
        />
      </div>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ ...box(0, 0, W, H), mixBlendMode: "screen" }}
      >
        <defs>
          <radialGradient id="mtg-ign-streak">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#bdf3ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor={C.sky} stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* وهجٌ أنامورفيّ أفقيّ عبر الرمز */}
        <ellipse
          cx={EMBLEM.cx}
          cy={EMBLEM.cy}
          rx={220 + 2300 * e}
          ry={5 + 12 * e}
          fill="url(#mtg-ign-streak)"
          opacity={Math.min(1, 1.5 * e)}
        />
        {/* اللمعة على حافّة الرمز تتّقد نجمةً */}
        <g
          transform={`rotate(${(-10 + 24 * u).toFixed(2)} ${SPARK.x} ${SPARK.y})`}
          opacity={clamp01(u * 2.2)}
        >
          <ellipse
            cx={SPARK.x}
            cy={SPARK.y}
            rx={30 + 560 * e}
            ry={2.5 + 3 * e}
            fill="url(#mtg-ign-streak)"
          />
          <ellipse
            cx={SPARK.x}
            cy={SPARK.y}
            rx={2.5 + 3 * e}
            ry={24 + 250 * e}
            fill="url(#mtg-ign-streak)"
          />
          <circle cx={SPARK.x} cy={SPARK.y} r={10 + 46 * e} fill="url(#mtg-ign-streak)" />
        </g>
      </svg>
      {/* الاغتسال بالضوء قبيل القطع */}
      <div style={{ ...box(0, 0, W, H), background: "#f2fbff", opacity: 0.6 * wash }} />
    </div>
  );
};

/* ─────────────────────────────── الومضات ─────────────────────────────── */

/** ومضةٌ ليّنة على أوائل المازورات `FLASHES` وحدها: ≤ 35% أبيض، ثلاثة إطارات تخبو. */
const FLASH_STEPS = [0.35, 0.2, 0.08] as const;

const Flash: FC<{ f: number }> = ({ f }) => {
  for (const at of FLASHES) {
    const k = f - fr(at);
    if (k >= 0 && k < FLASH_STEPS.length) {
      return <div style={{ ...box(0, 0, W, H), background: "#f2fbff", opacity: FLASH_STEPS[k] }} />;
    }
  }
  return null;
};

/* ─────────────────────────────── المدخل ─────────────────────────────── */

function shotIndex(f: number): number {
  for (let j = CUTS.length - 2; j >= 0; j--) if (f >= fr(CUTS[j])) return j;
  return 0;
}

/** اشتعال اللوحة (0–0.5 ث) ثم المونتاج السريع (0.5–16.5 ث)؛ لا شيء بعد 16.5. */
export const Montage: FC<{ t: number }> = ({ t }) => {
  const f = Math.round(t * FILM_FPS);
  if (f >= fr(ACT.montageEnd)) return null;
  if (f < fr(ACT.igniteEnd)) return <Ignite t={t} f={f} />;
  const i = shotIndex(f);
  const shot = SHOTS[i];
  const t0 = CUTS[i];
  const dur = CUTS[i + 1] - t0;
  const local = t - t0;
  const Draw = shot.kind === "intel" ? shot.draw : null;
  return (
    <>
      {shot.kind === "photo" ? (
        <PhotoView shot={shot} t={t} i={i} />
      ) : Draw ? (
        <div
          style={{
            ...box(0, 0, W, H),
            overflow: "hidden",
            isolation: "isolate",
            background: C.navy,
          }}
        >
          <Draw t={t} local={local} dur={dur} u={local / dur} i={i} />
          <div style={VIGNETTE} />
        </div>
      ) : null}
      <Flash f={f} />
    </>
  );
};
