/**
 * عدّة شريط الحالة (Ticker) — رموز الحالة والاتجاه المتحرّكة الصغيرة.
 *
 * أمر المالك ٢٠٢٦/١٠/٢٤: «use Remotion and motion techniques in the ticker». كل تركيبٍ هنا 128×128 شفّاف،
 * 24 إطارًا/ث × 48 إطارًا = 2.0 ث حلقةً متّصلة (الإطار 48 ≡ الإطار 0). تُعرض بحجم 20–28 بكسل، لذا
 * الخطوط الداخلية ≥ 7 بكسل في فضاء 128.
 *
 * لغة الشكل (CLAUDE.md، المواد ٣٢–٣٤ وعرف لوحات السلامة): مثمّن = خطر · مثلّث = تحذير · دائرة = سليم ·
 * معيّن مدوَّر = معلومة. اللون وحده لا يكفي (WCAG 1.4.1) فالشكل حاملُ المعنى، والأحمر والكهرماني لا يُدمجان.
 *
 * التباين (WCAG 1.4.11): الألوان وسطيّة التشبّع، وكل شكل محاطٌ بحلقتين متتاليتين: كحليّ `NAVY` ثم أبيض —
 * فحدّه ظاهرٌ ≥ 3:1 على السطح الفاتح (الكحليّ) وعلى الكحليّ الداكن (الأبيض) معًا. الأرقام المقيسة في RENDER.md.
 *
 * الوميض (WCAG 2.3.1): أسرع تردّد 1 هرتز، لا حدث ضوئيّ أكثر من مرّتين في الحلقة، والحلقات الشفّافة ألفاها ≤ 0.6.
 *
 * أداةُ بناءٍ عابرة تُصيَّر مرّةً إلى `public/media/ticker/` — لا تدخل حزمة التطبيق.
 */
import React from "react";

export const FPS = 24;
export const FRAMES = 48;
export const SIZE = 128;

/** ألوانٌ وسطيّة قريبةٌ من رموز `--tone-*` (الداكن: rose #fb7185 · amber #fbbf24 · emerald #34d399 · blue #60a5fa؛
 *  الفاتح: #be123c · #b45309 · #047857 · #1d4ed8) لكنها تثبت ≥ 3:1 أو تُحاط بحلقتين على السطحين. */
export const C = {
  danger: "#e5484d",
  warning: "#f5a524",
  ok: "#2fb36d",
  info: "#3b9cf2",
  flat: "#6f8ab0",
  navy: "#0b1a33",
  white: "#ffffff",
} as const;

/** سماكة الحلقتين الخارجيتين (بكسل في فضاء 128). */
export const RING_NAVY = 4;
export const RING_WHITE = 3.5;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** جزءٌ من المدى [a,b] مقصوصٌ إلى [0,1]. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;
export const easeInCubic = (x: number) => x ** 3;
export const easeInOutSine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);
/** تنفّسٌ دوريّ 0→1→0 على حلقةٍ كاملة (t في [0,1)). */
export const breathe = (t: number) => 0.5 - 0.5 * Math.cos(2 * Math.PI * t);

/** تدريجٌ إلى `k` درجاتٍ منفصلة: يُبقي الإطارات المتجاورة متطابقةً فتُدمج في الملفّ بمدّةٍ أطول. */
export const stepped = (x: number, k: number) => Math.round(x * k) / k;

export const useLoop = (frame: number) => frame / FRAMES;

/** مضلّعٌ منتظم مغلق: نصف قطر `r`، أول رأسٍ عند الزاوية `a0` (درجات). */
export const polygonPath = (cx: number, cy: number, r: number, n: number, a0: number) => {
  const pts = Array.from({ length: n }, (_, k) => {
    const a = ((a0 + (360 / n) * k) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join("L")}Z`;
};

export const circlePath = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    width={SIZE}
    height={SIZE}
    viewBox={`0 0 ${SIZE} ${SIZE}`}
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block" }}
  >
    {children}
  </svg>
);

/** المسافة من مسار الشكل إلى حدّه الخارجي المرئي: نصف سماكة التدوير + الحلقتان. */
export const edge = (baseW: number) => baseW / 2 + RING_NAVY + RING_WHITE;

/**
 * `Glyph` — الشكل المحاط: تعبئة ملوّنة مدوَّرة الزوايا (حدٌّ بسماكة `baseW` بوصلٍ دائريّ) ثم حلقة كحليّة
 * ثم حلقة بيضاء خارجها. تُرسم من الخارج للداخل. `opacity` تُطبَّق على المجموعة كلّها لا على كل طبقة.
 */
export const Glyph: React.FC<{
  d: string;
  color: string;
  baseW: number;
  opacity?: number;
  transform?: string;
  children?: React.ReactNode;
}> = ({ d, color, baseW, opacity = 1, transform, children }) => (
  <g opacity={opacity} transform={transform}>
    <path
      d={d}
      fill={C.white}
      stroke={C.white}
      strokeWidth={baseW + 2 * (RING_NAVY + RING_WHITE)}
      strokeLinejoin="round"
    />
    <path
      d={d}
      fill={C.navy}
      stroke={C.navy}
      strokeWidth={baseW + 2 * RING_NAVY}
      strokeLinejoin="round"
    />
    <path d={d} fill={color} stroke={color} strokeWidth={baseW} strokeLinejoin="round" />
    {children}
  </g>
);

/** هالةٌ مملوءة خلف الشكل: إزاحةٌ منتظمة `e` وراء حدّه المرئي. */
export const Halo: React.FC<{
  d: string;
  color: string;
  baseW: number;
  e: number;
  alpha: number;
  transform?: string;
}> = ({ d, color, baseW, e, alpha, transform }) =>
  alpha <= 0.004 ? null : (
    <path
      d={d}
      transform={transform}
      fill={color}
      fillOpacity={alpha}
      stroke={color}
      strokeOpacity={alpha}
      strokeWidth={baseW + 2 * (edge(baseW) + e)}
      strokeLinejoin="round"
    />
  );

/**
 * حلقةٌ مفرغة تنفصل عن حدّ الشكل: تغطّي المسافة [o−th, o] وراء مسار الشكل. القناع يطرح الحلقة الداخلية
 * من الخارجية فيبقى شريطٌ بسماكة `th` (لا تعبئة).
 */
export const PulseRing: React.FC<{
  d: string;
  color: string;
  baseW: number;
  o: number;
  th: number;
  alpha: number;
  id: string;
}> = ({ d, color, baseW, o, th, alpha, id }) => {
  if (alpha <= 0.004) return null;
  const outer = baseW + 2 * o;
  const inner = Math.max(0, baseW + 2 * (o - th));
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={SIZE} height={SIZE}>
        <path d={d} fill="#fff" stroke="#fff" strokeWidth={outer} strokeLinejoin="round" />
        <path d={d} fill="#000" stroke="#000" strokeWidth={inner} strokeLinejoin="round" />
      </mask>
      <path
        d={d}
        fill={color}
        stroke={color}
        strokeWidth={outer}
        strokeLinejoin="round"
        opacity={alpha}
        mask={`url(#${id})`}
      />
    </>
  );
};
