/**
 * خريطة شبه الجزيرة العربية — المناطق الأربع مضاءةً والمواقع من إحداثياتها
 * (أمر المالك ٢٠٢٦/٠٩/٢٩: «اجعل إحداثيات الموقع تكون رسمة خريطة شبه الجزيرة
 * العربية»).
 *
 * **رسمٌ لا مكتبة.** الهندسة مولَّدة سلفًا في `arabia-geometry.ts` من
 * Natural Earth (ملك عام) — لا بلاطات من شبكة خارجية، ولا حزمة خرائط تثقل
 * ميزانية الأداء، ولا ثيمٌ لا يتبع طبقة الرموز. والخريطة الجغرافية الكاملة
 * تبقى في موضعها: `/executive-map` (البوصلة في سكّة التحكّم).
 *
 * **شاشةٌ داكنة في الوضعين** كلوحة غرفة العمليات: رموزها مثبَّتة في
 * `.nx-arabia` (كما تُثبَّت على الصفحتين الداكنتين دائمًا)، فالتوهّج يُقرأ
 * على الليل لا على الأبيض.
 *
 * **الصدق:** كل موقعٍ يمرّ على `isInsideSaudi` قبل رسمه، والمرفوض يُعدّ
 * ويُعلن. وعدد مواقع المنطقة يُحسب بالقاعدة نفسها التي لوّنت المنطقة (أقرب
 * مرساة)، فلا يختلف الرقم عن اللون. وما لم يُقَس يُقرأ «لم يُقَس».
 *
 * ## «طبّق الصورة بحذافيرها» (قرار المالك ٢٠٢٦/١٠/١٤ — N1–N4)
 *
 * الصورة ترسم الخريطة **مسرحًا** يملأ البطاقة: الشريط فوقها، والسكّتان على
 * بحرَيها، و«إحصائيات سريعة» على البحر الأحمر، وفقاعات المناطق الأربع فوق
 * مناطقها. فالبطاقة العريضة (≥ 640px، استعلام حاوية) شبكةٌ واحدة يقع الرسم
 * في خلاياها كلّها والأدوات في حوافّها — **ترتيب شبكة لا طبقة مطلقة فوق
 * الرسم**. وما دون ذلك (الجوال واللوح الضيّق) تدفّقٌ عادي: الشريط ثم الرسم
 * ثم الفقاعات شبكةً تحته ثم السكّتان ثم الإحصاءات.
 *
 * **عقد «لا شيء يحجب المواقع» محفوظٌ بترتيب الرسم لا بالمكان:** كانت
 * اللافتات الطافية تحجب ٣ من ٤ مواقع (قِيست بالبكسل). هنا الفقاعات طبقةٌ
 * شقيقة للرسم، **والمواقع طبقةٌ فوقها** — فالموقع الحيّ يُرى ولو وقع تحت
 * فقاعة. والأدوات على الحوافّ فوق البحر، لا على المملكة، في الإطار الكامل.
 *
 * **المنظور:** الصورة ترسم المملكة مائلةً (منظورًا منخفضًا)، فتُضغط الهندسة
 * رأسيًّا بمعامل `TILT` عند الرسم وحده — الإسقاط نفسه وعقده (المدن في
 * مناطقها) لا يُمسّان، والمواقع والمراكز تُضغط بالمعامل نفسه فتبقى مكانها.
 *
 * **التكبير حقيقي:** يتغيّر `viewBox` نفسه لا مقياسُ صورة — فالخطوط تُعاد
 * رسمًا بدقّتها، والفقاعات والمواقع تتبعه بمتغيّرات CSS يكتبها الإطار نفسه
 * في كل خطوة. ومركز التكبير المنطقةُ المُبرَزة، وإلا مركز المملكة. والانتقال
 * حركةٌ قصيرة تسقط إلى القفز المباشر تحت تقليل الحركة ووضع الأمان.
 */
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  CircleCheck,
  Compass,
  Factory,
  Frame,
  Info,
  Layers,
  Minus,
  OctagonAlert,
  Plus,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";
import { useRegion } from "@/lib/region-context";
import { REGION_MARKERS } from "@/components/executive/region-markers";
import { isInsideSaudi } from "@/components/map/saudi-geometry";
import {
  NEIGHBOUR_LAND_PATH,
  SAUDI_BORDER_PATH,
  SAUDI_PROVINCES,
  projectArabia,
} from "@/components/map/arabia-geometry";
import "@/styles/home/home-map.css";

export interface ArabiaSite {
  readonly id: string;
  readonly name: string;
  readonly lat: number | null;
  readonly lng: number | null;
}

/** حال القراءة — التحميل والخطأ لا يُقرآن «لم يُقَس» (المادة ١٤). */
export type ArabiaStatus = "loading" | "error" | "ready";

export interface ArabiaQuickStat {
  readonly key: string;
  readonly ar: string;
  readonly en: string;
  /** `null` = لم يُقَس. */
  readonly value: number | null;
  readonly icon: ReactNode;
  /**
   * حال قراءة هذا الرقم إن كان من قراءةٍ غير قراءة الخريطة (الكاميرات ونقاط
   * الدخول من مؤشرات اللوحة التنفيذية) — وإلا يتبع حال الخريطة.
   */
  readonly status?: ArabiaStatus;
  /** `true` ⇐ القيمة من المحاكاة المرجعية، فتُعلن «محاكاة» (قرار N2). */
  readonly simulated?: boolean;
  /** شاشة الرقم — يصير الإحصاء رابطًا إليها. */
  readonly to?: string;
}

/** نبرة الشارة كما رُسمت — تُرسم شكلًا وكلمةً معًا لا لونًا وحده (WCAG §1.4.1). */
export type ArabiaTone = "danger" | "warning" | "healthy" | "info";

/** فقاعة منطقة على الخريطة كما رُسمت: الرقم وسهمه والشارتان والتغيّر. */
export interface ArabiaBubble {
  readonly regionId: RegionId;
  readonly value: number;
  /** `null` ⇐ «لم يُقَس» (قيمةٌ حيّة لا تُزيَّن بتغيّرٍ محاكى). */
  readonly change: { readonly dir: "up" | "down"; readonly pct: number } | null;
  readonly badges: readonly { readonly count: number; readonly tone: ArabiaTone }[];
  /** `true` ⇐ مرجعٌ موسوم: شارة «محاكاة» ظاهرة على الفقاعة. */
  readonly simulated: boolean;
}

interface Props {
  readonly status: ArabiaStatus;
  readonly onRetry: () => void;
  readonly sites: readonly ArabiaSite[];
  /** الامتثال لكل منطقة من الخادم؛ الغائب «لم يُقَس» (الصفر قياس). */
  readonly compliance: Partial<Record<RegionId, number>>;
  readonly quickStats: readonly ArabiaQuickStat[];
  readonly ar: boolean;
  /**
   * تبويبات العرض في يسار الشريط العلوي (الرئيسية تمرّرها). حين تُمرَّر يصير
   * العنوان للقارئات وحدها — التبويب النشط هو عنوان البطاقة المرئي.
   */
  readonly viewTabs?: ReactNode;
  /** سكّة الطبقات يمين الرسم — المستدعي يملكها ويملك إظهارها. */
  readonly layersRail?: ReactNode;
  /** زرّ الطبقات في سكّة التحكّم — يبدّل سكّة المستدعي نفسها. */
  readonly layersToggle?: {
    readonly open: boolean;
    readonly onToggle: () => void;
    readonly controls: string;
  };
  /** فقاعات المناطق الأربع (الصورة) — بترتيب `REGIONS` أو بأي ترتيب. */
  readonly bubbles?: readonly ArabiaBubble[];
  /** ما يعدّه رقم الفقاعة الكبير — يُقرأ للقارئات («الأفراد»). */
  readonly bubbleMetric?: { readonly ar: string; readonly en: string };
  /** زرّ «المزيد» في شريط الإحصاءات (السهم المرسوم). */
  readonly quickMore?: { readonly to: string; readonly ar: string; readonly en: string };
  /** المواقع المرسومة من المحاكاة لا من القاعدة — يُقال في وصف الرسم. */
  readonly sitesSimulated?: boolean;
}

/** أقرب مرساة — القاعدة نفسها التي ضمّت المناطق الإدارية عند التوليد. */
function nearestRegion(lat: number, lng: number): RegionId {
  let best = REGION_MARKERS[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const m of REGION_MARKERS) {
    const d = (lat - m.lat) ** 2 + (lng - m.lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best.id;
}

/**
 * معامل المنظور: الصورة ترسم المملكة 580×322px داخل بطاقة 932×400 — أعرض
 * من الإسقاط المستوي بنسبة ٠٫٦٨ رأسيًّا. يُطبَّق على الرسم وحده.
 */
const TILT = 0.678;

/**
 * الإطار الكامل بوحدات الرسم المضغوطة — مشتقٌّ من موضع المملكة في الصورة:
 * حدودها (x ‎53.5–744.5 · y ‎67.6–633.5 قبل الضغط) تقع على 195–775 × 38–360
 * من بطاقةٍ 932×400. فنسبته نسبة البطاقة نفسها (٢٫٣٣)، والجوار حتى البحرين
 * يملأ ما حول المملكة كما في الصورة.
 */
const FULL: Box = { x: -178.8, y: 0.6, w: 1110.3, h: 476.5 };

/**
 * ترتيب رسم المناطق — توهّج المرسومة لاحقًا يقع على حدود سابقتها، فتُرسم
 * الجنوبية أخيرًا والوسطى قبلها: الصورة ترسم حدّ الجنوبية خيطًا برتقاليًّا
 * متّقدًا على جاراتها، وحدّ الوسطى خيطًا أزرق على الغربية. المناطق من
 * `REGIONS` نفسها (لا اسم منطقة هنا)، والرتبة رتبة رسمٍ لا ترتيب عرض.
 */
const DRAW_RANK: Record<RegionId, number> = { eastern: 0, western: 1, central: 2, southern: 3 };
const DRAW_ORDER: readonly RegionId[] = [...REGIONS]
  .sort((a, b) => DRAW_RANK[a.id] - DRAW_RANK[b.id])
  .map((r) => r.id);

/**
 * مدى تذويب حافّتي بيانات الجوار بوحدات الرسم: بياناته من 0 إلى ‎≈921‎
 * عرضًا، والإطار الكامل من ‎−178.8‎ إلى ‎931.5‎.
 */
const FADE = { left: [-16, 28], right: [884, 924] } as const;

/** المناطق الإدارية لكل منطقة — تُجمع مرّةً عند التحميل. */
const PROVINCES_BY_REGION = {} as Record<RegionId, readonly (typeof SAUDI_PROVINCES)[number][]>;
for (const r of REGIONS) {
  PROVINCES_BY_REGION[r.id] = SAUDI_PROVINCES.filter((p) => p.region === r.id);
}

/**
 * **أضواء المدن وخيوط الطرق — زخرفةٌ جغرافية لا بيانات.** الصورة ترسم
 * المملكة «ليلًا» بأضواء مدنها وشبكة طرقها؛ فتُرسم هنا مدنٌ حقيقية بإحداثياتها
 * عبر الإسقاط نفسه، وطرقٌ كبرى خطوطًا مستقيمة بينها (تقريبٌ بصري). لا تُعدّ
 * ولا تُقرأ ولا تُنقر، ولا يُفهم منها موقعٌ تشغيلي: المواقع وحدها دوائرُ
 * برموز المنشآت. وكلّها **داخل الرسم نفسه** — لا طبقة فوقه.
 */
const CITY_LIGHTS: ReadonlyArray<
  readonly [key: string, lat: number, lng: number, size: 1 | 2 | 3]
> = [
  ["riyadh", 24.71, 46.68, 3],
  ["jeddah", 21.49, 39.19, 3],
  ["makkah", 21.39, 39.86, 3],
  ["madinah", 24.47, 39.61, 3],
  ["dammam", 26.42, 50.09, 3],
  ["khobar", 26.22, 50.2, 2],
  ["jubail", 27.0, 49.65, 2],
  ["hofuf", 25.36, 49.59, 2],
  ["hafar", 28.43, 45.97, 2],
  ["khafji", 28.44, 48.49, 1],
  ["buraidah", 26.36, 43.98, 2],
  ["unaizah", 26.08, 43.99, 1],
  ["hail", 27.51, 41.72, 2],
  ["tabuk", 28.38, 36.57, 2],
  ["ula", 26.61, 37.92, 1],
  ["yanbu", 24.09, 38.06, 2],
  ["taif", 21.27, 40.42, 2],
  ["bahah", 20.01, 41.47, 1],
  ["abha", 18.25, 42.51, 2],
  ["khamis", 18.3, 42.73, 2],
  ["jazan", 16.89, 42.55, 2],
  ["najran", 17.49, 44.13, 2],
  ["sakaka", 29.97, 40.21, 1],
  ["arar", 30.98, 41.04, 1],
  ["qurayyat", 31.33, 37.34, 1],
  ["dawasir", 20.46, 44.78, 1],
  ["kharj", 24.16, 47.33, 2],
  ["bisha", 20.0, 42.61, 1],
  ["majmaah", 25.9, 45.34, 1],
  ["duba", 27.35, 35.69, 1],
  ["rabigh", 22.8, 39.03, 1],
  ["lith", 20.15, 40.27, 1],
  ["qunfudhah", 19.13, 41.08, 1],
  ["sharurah", 17.47, 47.11, 1],
  ["haradh", 24.15, 49.07, 1],
  ["wajh", 26.24, 36.45, 1],
  ["tayma", 27.63, 38.55, 1],
  ["dawadmi", 24.51, 44.39, 1],
  ["rafha", 29.63, 43.49, 1],
  ["turaif", 31.67, 38.66, 1],
];

/** الطرق الكبرى سلاسلَ مدن — كلّ سلسلةٍ خطٌّ واحد. */
const ROAD_CHAINS: ReadonlyArray<readonly string[]> = [
  ["jeddah", "makkah", "taif", "dawadmi", "riyadh", "haradh", "hofuf", "dammam", "khobar"],
  ["dammam", "jubail", "khafji"],
  ["riyadh", "dammam"],
  ["riyadh", "majmaah", "buraidah", "hail", "sakaka", "qurayyat"],
  ["majmaah", "hafar", "rafha", "arar", "turaif", "qurayyat"],
  ["buraidah", "unaizah", "madinah", "jeddah"],
  ["madinah", "ula", "tayma", "tabuk", "duba", "wajh", "yanbu", "rabigh", "jeddah"],
  ["hail", "tayma"],
  ["jeddah", "lith", "qunfudhah", "jazan"],
  ["taif", "bahah", "abha", "khamis", "najran", "sharurah"],
  ["abha", "jazan"],
  ["riyadh", "kharj", "dawasir", "najran"],
  ["dawasir", "bisha", "khamis"],
];

const CITY_AT: Readonly<Record<string, { x: number; y: number; size: 1 | 2 | 3 }>> =
  Object.fromEntries(
    CITY_LIGHTS.map(([key, lat, lng, size]) => {
      const p = projectArabia(lat, lng);
      return [key, { x: p.x, y: p.y * TILT, size }];
    }),
  );

/**
 * حبيبات النسيج — نقاطٌ ثابتة في بلاطةٍ 96×96 (مولِّدٌ حتمي، فلا يختلف رسم
 * الخادم عن العميل): ضوءٌ متناثر يُقرأ «أرضًا ليلًا» لا شبكةً منتظمة.
 */
const SPECKS: ReadonlyArray<{ x: number; y: number; r: number }> = (() => {
  let seed = 20261014;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: 28 }, () => ({
    x: Math.round(next() * 960) / 10,
    y: Math.round(next() * 960) / 10,
    r: Math.round((0.45 + next() * 0.9) * 100) / 100,
  }));
})();

const ROADS_D = ROAD_CHAINS.map((chain) =>
  chain
    .filter((key) => key in CITY_AT)
    .map(
      (key, i) => `${i === 0 ? "M" : "L"}${CITY_AT[key].x.toFixed(1)} ${CITY_AT[key].y.toFixed(1)}`,
    )
    .join(" "),
).join(" ");

/* ── التكبير: إطار عرضٍ يضيق حول مركزٍ ويبقى داخل الإطار الكامل ───────── */

/** درجات التكبير — الأولى الإطار كاملًا. */
const ZOOM_STEPS = [1, 1.5, 2, 3] as const;
/** مدّة الانتقال بين إطارين (مللي ثانية). */
const ZOOM_MS = 240;

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const boxText = (b: Box) =>
  `${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.w.toFixed(1)} ${b.h.toFixed(1)}`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** متغيّرات الإطار التي تتبعها الفقاعات والمواقع (`home-map.css`). */
const VB_VARS = ["--vb-x", "--vb-y", "--vb-w", "--vb-h"] as const;
const boxVars = (b: Box) => [b.x, b.y, b.w, b.h].map((v) => v.toFixed(2));

/** مركز كل منطقة: منتصف الصندوق المحيط بمناطقها الإدارية — يُحسب مرّة. */
let centres: Record<RegionId, { x: number; y: number }> | null = null;
function regionCentre(id: RegionId): { x: number; y: number } {
  if (!centres) {
    const acc = {} as Record<RegionId, { x0: number; y0: number; x1: number; y1: number }>;
    for (const p of SAUDI_PROVINCES) {
      const n = p.d.replace(/[MZ]/g, " ").trim().split(/\s+/).map(Number);
      const b = (acc[p.region] ??= { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
      for (let i = 0; i + 1 < n.length; i += 2) {
        b.x0 = Math.min(b.x0, n[i]);
        b.x1 = Math.max(b.x1, n[i]);
        b.y0 = Math.min(b.y0, n[i + 1]);
        b.y1 = Math.max(b.y1, n[i + 1]);
      }
    }
    const out = {} as Record<RegionId, { x: number; y: number }>;
    for (const r of REGIONS) {
      const b = acc[r.id];
      out[r.id] = b
        ? { x: (b.x0 + b.x1) / 2, y: ((b.y0 + b.y1) / 2) * TILT }
        : { x: FULL.x + FULL.w / 2, y: FULL.y + FULL.h / 2 };
    }
    centres = out;
  }
  return centres[id];
}

/** الإطار المطلوب لدرجة تكبيرٍ ومنطقةٍ مُبرَزة. */
function viewBoxFor(zoom: number, focus: RegionId | "all"): Box {
  if (zoom <= 1) return FULL;
  const w = FULL.w / zoom;
  const h = FULL.h / zoom;
  const c =
    focus === "all" ? { x: FULL.x + FULL.w / 2, y: FULL.y + FULL.h / 2 } : regionCentre(focus);
  return {
    x: clamp(c.x - w / 2, FULL.x, FULL.x + FULL.w - w),
    y: clamp(c.y - h / 2, FULL.y, FULL.y + FULL.h - h),
    w,
    h,
  };
}

/**
 * ركن الفقاعة الأعلى الأيسر بوحدات الرسم المضغوطة — مواضع الصورة نفسها
 * (الغربية على ساحل الحجاز، الوسطى أعلى الوسط، الشرقية على الخليج)، إلا
 * الجنوبية: منطقتها في هذا الرسم جنوب الغرب (عسير وجازان ونجران) لا الربع
 * الخالي كما لوّنته الصورة — فاللون يتبع قاعدة عدّ المواقع لا المولِّد —
 * فتقع فقاعتها على منطقتها. والمواضع مختارةٌ خارج مواقع المحاكاة الأربعة.
 */
const BUBBLE_ANCHOR: Record<RegionId, { x: number; y: number }> = {
  western: { x: -10.8, y: 124.5 },
  central: { x: 287.0, y: 80.4 },
  eastern: { x: 637.3, y: 145.9 },
  southern: { x: 351.3, y: 281.7 },
};

/**
 * ينقل `viewBox` من الإطار المعروض إلى المطلوب بحركةٍ قصيرة، كتابةً مباشرة
 * على العنصر (لا إعادة رسمٍ لـReact في كل إطار)، ومعه متغيّرات الإطار على
 * طبقة الرسم فتتبعه الفقاعات والمواقع في الخطوة نفسها. React يكتب الهدف عند
 * الالتزام، وهذا الأثر يعيده إلى نقطة البدء قبل الرسم ثم يسير إليه — فلا
 * وميض. وتحت تقليل الحركة أو وضع الأمان يبقى ما كتبه React: قفزٌ مباشر.
 */
function useViewBoxMotion(
  svgRef: RefObject<SVGSVGElement | null>,
  layerRef: RefObject<HTMLDivElement | null>,
  target: Box,
) {
  const shown = useRef<Box>(target);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const from = shown.current;
    const still =
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true ||
      document.documentElement.classList.contains("safe-mode");
    if (!svg || still || boxText(from) === boxText(target)) {
      shown.current = target;
      return;
    }
    const write = (b: Box) => {
      svg.setAttribute("viewBox", boxText(b));
      const layer = layerRef.current;
      if (!layer) return;
      const vals = boxVars(b);
      VB_VARS.forEach((name, i) => layer.style.setProperty(name, vals[i]));
    };
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ZOOM_MS);
      const e = 1 - (1 - k) ** 3;
      const b: Box = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      };
      shown.current = k < 1 ? b : target;
      write(shown.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    write(from);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [svgRef, layerRef, target]);
}

/** نصّ القيمة حين لا تكون القراءة جاهزة — `null` حين تكون. */
function waitText(status: ArabiaStatus, ar: boolean): string | null {
  if (status === "loading") return ar ? "جارٍ التحميل" : "Loading";
  if (status === "error") return ar ? "تعذّر التحميل" : "Unavailable";
  return null;
}

/** الأرقام كما كُتبت في الصورة: لاتينية بفاصل الآلاف («1,341» · «214»). */
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** شكل الشارة وكلمتها لكل نبرة — المثلث الأحمر في الصورة يُرسم مثمّنًا (§3.5). */
const TONE_VIEW: Record<ArabiaTone, { icon: LucideIcon; ar: string; en: string }> = {
  danger: { icon: OctagonAlert, ar: "خطر", en: "danger" },
  warning: { icon: TriangleAlert, ar: "تحذير", en: "warning" },
  healthy: { icon: CircleCheck, ar: "سليم", en: "healthy" },
  info: { icon: Info, ar: "معلومة", en: "info" },
};

export function ArabianPeninsulaMap({
  status,
  onRetry,
  sites,
  compliance,
  quickStats,
  ar,
  viewTabs,
  layersRail,
  layersToggle,
  bubbles,
  bubbleMetric,
  quickMore,
  sitesSimulated,
}: Props) {
  const { regionId, setRegion } = useRegion();
  /**
   * المنطقة المُبرَزة: ما اختاره الزائر هنا، وإلا المنطقة الفاعلة في النظام
   * (الوسطى افتراضًا — كما ترسمها الصورة مضغوطةً). والإبراز الافتراضي لا
   * يُخفت غيرها: الصورة ترسم المناطق الأربع متّقدة.
   */
  const [picked, setPicked] = useState<RegionId | "all" | null>(null);
  const focus: RegionId | "all" = picked ?? regionId;
  const dimOthers = picked !== null && picked !== "all";
  const [zoomAt, setZoomAt] = useState(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  /** بادئة معرّفات التدرّجات — نقيّةٌ لـ`url(#…)` (‏`useId` يحمل رموزًا). */
  const uid = `nx-arabia-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const textDir = ar ? "rtl" : "ltr";
  const zoom = ZOOM_STEPS[zoomAt];
  const target = useMemo(() => viewBoxFor(zoom, focus), [zoom, focus]);
  useViewBoxMotion(svgRef, layerRef, target);

  const { plotted, outside, byRegion } = useMemo(() => {
    const inside: Array<ArabiaSite & { x: number; y: number; region: RegionId }> = [];
    let rejected = 0;
    for (const s of sites) {
      if (!isInsideSaudi(s.lat, s.lng)) {
        rejected += 1;
        continue;
      }
      const lat = s.lat as number;
      const lng = s.lng as number;
      const p = projectArabia(lat, lng);
      inside.push({ ...s, x: p.x, y: p.y * TILT, region: nearestRegion(lat, lng) });
    }
    const counts = {} as Record<RegionId, number>;
    for (const r of REGIONS) counts[r.id] = 0;
    for (const s of inside) counts[s.region] += 1;
    return { plotted: inside, outside: rejected, byRegion: counts };
  }, [sites]);

  const notMeasured = ar ? "لم يُقَس" : "not measured";
  /** نصّ القيمة حين لا تكون قراءة الخريطة جاهزة — `null` حين تكون. */
  const pending = waitText(status, ar);
  /** رقمٌ من قراءةٍ أخرى تعذّر — يُقال ومعه إعادة المحاولة (المادة ١٤). */
  const statsFailed = status !== "error" && quickStats.some((s) => s.status === "error");
  const simulatedStats = quickStats.filter(
    (s) => s.simulated && (s.status ?? status) !== "loading",
  );
  const liveStats = quickStats.filter(
    (s) => !s.simulated && (s.status ?? status) === "ready" && s.value !== null,
  );
  const zoomWord = zoom.toLocaleString(ar ? "ar-SA" : "en-US");
  const vb = boxVars(target);
  const simWord = ar ? "مرجعي" : "Reference";

  /* ── رقاقات المناطق — تبرز منطقةً وتنقل مركز التكبير إليها ───────────── */
  const chips = (
    <div
      role="group"
      dir={textDir}
      aria-label={ar ? "إبراز منطقة" : "Highlight a region"}
      className="nx-arabia-tabs"
    >
      {(["all", ...REGIONS.map((r) => r.id)] as const).map((id) => {
        const region = REGIONS.find((r) => r.id === id);
        const label = region
          ? ar
            ? region.shortAr
            : region.shortEn
          : ar
            ? "جميع المناطق"
            : "All regions";
        return (
          <button
            key={id}
            type="button"
            aria-pressed={focus === id}
            onClick={() => setPicked(id)}
            className="nx-arabia-tab"
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <section
      aria-labelledby="nx-arabia-title"
      dir={textDir}
      className="nx-arabia overflow-hidden rounded-2xl border"
    >
      <h2
        id="nx-arabia-title"
        className={viewTabs ? "sr-only" : "nx-arabia-heading text-[15px] font-black"}
      >
        {ar ? "خريطة المواقع — شبه الجزيرة العربية" : "Sites map — Arabian Peninsula"}
      </h2>

      {/* ── المسرح: الشريط · سكّة التحكّم · الرسم · سكّة الطبقات · الإحصاءات.
          الترتيب يسارًا ← يمينًا كما في الصورة (D5)، فالحاوية `ltr` ترتيبًا
          وكل ورقة تعلن اتجاه لغتها. ترتيب الشجرة هو ترتيب التنقّل بلوحة
          المفاتيح: الشريط ثم اليسار ثم الرسم ثم اليمين ثم الذيل. ─────── */}
      <div dir="ltr" className="nx-arabia-stage" data-rail={layersToggle?.open || undefined}>
        <div dir="ltr" className="nx-arabia-bar">
          {viewTabs}
          {chips}
        </div>

        <div
          role="group"
          dir={textDir}
          aria-label={ar ? "التحكّم بالعرض" : "View controls"}
          className="nx-arabia-controls"
        >
          <button
            type="button"
            onClick={() => setZoomAt(0)}
            aria-label={ar ? "ملاءمة العرض — المملكة كاملة" : "Fit view — whole Kingdom"}
            title={ar ? "ملاءمة العرض" : "Fit view"}
            className="nx-arabia-ctl"
          >
            <Frame aria-hidden />
          </button>
          <Link
            to="/executive-map"
            aria-label={ar ? "الخريطة التنفيذية — الخريطة الجغرافية كاملة" : "Executive map"}
            title={ar ? "الخريطة التنفيذية" : "Executive map"}
            className="nx-arabia-ctl"
            data-round=""
          >
            <Compass aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setZoomAt((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))}
            disabled={zoomAt === ZOOM_STEPS.length - 1}
            aria-label={ar ? "تكبير" : "Zoom in"}
            title={ar ? "تكبير" : "Zoom in"}
            className="nx-arabia-ctl"
            data-pair="start"
          >
            <Plus aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setZoomAt((z) => Math.max(0, z - 1))}
            disabled={zoomAt === 0}
            aria-label={ar ? "تصغير" : "Zoom out"}
            title={ar ? "تصغير" : "Zoom out"}
            className="nx-arabia-ctl"
            data-pair="end"
          >
            <Minus aria-hidden />
          </button>
          {layersToggle && (
            <button
              type="button"
              onClick={layersToggle.onToggle}
              aria-pressed={layersToggle.open}
              aria-controls={layersToggle.controls}
              aria-label={ar ? "طبقات الخريطة" : "Map layers"}
              title={ar ? "طبقات الخريطة" : "Map layers"}
              className="nx-arabia-ctl"
            >
              <Layers aria-hidden />
            </button>
          )}
          {/* مستوى التكبير للقارئات — قبل الرسم لا بعده، ولا طبقة فوقه. */}
          <span aria-live="polite" className="sr-only">
            {ar ? `مستوى التكبير ${zoomWord}×` : `Zoom level ${zoomWord}×`}
          </span>
        </div>

        <div
          ref={layerRef}
          className="nx-arabia-canvas"
          aria-busy={status === "loading" || undefined}
          style={{
            ["--vb-x" as string]: vb[0],
            ["--vb-y" as string]: vb[1],
            ["--vb-w" as string]: vb[2],
            ["--vb-h" as string]: vb[3],
            ["--plot-ratio" as string]: (FULL.w / FULL.h).toFixed(4),
          }}
        >
          <div className="nx-arabia-plot">
            <svg
              ref={svgRef}
              viewBox={boxText(target)}
              preserveAspectRatio="xMidYMid slice"
              role="img"
              aria-label={
                pending !== null
                  ? ar
                    ? `خريطة شبه الجزيرة العربية — ${pending}`
                    : `Arabian Peninsula map — ${pending}`
                  : ar
                    ? `خريطة شبه الجزيرة العربية: ${plotted.length} موقعًا على المناطق الأربع${sitesSimulated ? " (بيانات مرجعية، ليست حيّة)" : ""}`
                    : `Arabian Peninsula map: ${plotted.length} sites across the four regions${sitesSimulated ? " (reference data, not live)" : ""}`
              }
            >
              {/* تعبئة كل منطقة تدرّجٌ معتم من لونها إلى ليل البحر (لكل منطقةٍ
                  إدارية مركزها الأسطع)، وهالة أضواء المدن. الألوان كلّها من
                  `--region-tint` ورموز الشاشة في `home-map.css`. */}
              <defs>
                {REGIONS.map((r) => (
                  <radialGradient
                    key={r.id}
                    id={`${uid}-${r.id}`}
                    cx="50%"
                    cy="42%"
                    r="72%"
                    style={{ ["--region-tint" as string]: REGION_ACCENT_HEX[r.id] }}
                  >
                    <stop offset="0" className="nx-arabia-fill-hi" />
                    <stop offset="1" className="nx-arabia-fill-lo" />
                  </radialGradient>
                ))}
                <radialGradient id={`${uid}-glow`}>
                  <stop offset="0" className="nx-arabia-glow-core" />
                  <stop offset="1" className="nx-arabia-glow-edge" />
                </radialGradient>
                {/* حافّتا بيانات الجوار (‎33°E‎ يسارًا وطرفها يمينًا) تذوبان في
                    البحر بدل خطٍّ رأسيٍّ قاطع — الإطار أعرض من البيانات. */}
                <linearGradient
                  id={`${uid}-fade-l`}
                  gradientUnits="userSpaceOnUse"
                  x1={FADE.left[0]}
                  x2={FADE.left[1]}
                  y1="0"
                  y2="0"
                >
                  <stop offset="0" className="nx-arabia-fade-solid" />
                  <stop offset="1" className="nx-arabia-fade-clear" />
                </linearGradient>
                <linearGradient
                  id={`${uid}-fade-r`}
                  gradientUnits="userSpaceOnUse"
                  x1={FADE.right[0]}
                  x2={FADE.right[1]}
                  y1="0"
                  y2="0"
                >
                  <stop offset="0" className="nx-arabia-fade-clear" />
                  <stop offset="1" className="nx-arabia-fade-solid" />
                </linearGradient>
                <pattern id={`${uid}-speckle`} width="96" height="96" patternUnits="userSpaceOnUse">
                  {SPECKS.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={p.r} className="nx-arabia-speck" />
                  ))}
                </pattern>
              </defs>
              <g transform={`scale(1 ${TILT})`}>
                <path d={NEIGHBOUR_LAND_PATH} className="nx-arabia-neighbour" />
                <rect
                  x={FADE.left[0] - 600}
                  y={-400}
                  width={FADE.left[1] - FADE.left[0] + 600}
                  height={1700}
                  fill={`url(#${uid}-fade-l)`}
                  className="nx-arabia-fade"
                />
                <rect
                  x={FADE.right[0]}
                  y={-400}
                  width={FADE.right[1] - FADE.right[0] + 600}
                  height={1700}
                  fill={`url(#${uid}-fade-r)`}
                  className="nx-arabia-fade"
                />
                {/* كل منطقةٍ زمرةٌ واحدة بتوهّجٍ واحد بلونها — أربعة مرشّحات
                    لا ثلاثة عشر، والتعبئة معتمة فلا يطفو التوهّج على داخلها.
                    **الحافّة النيون:** تُرسم مناطقها الإدارية أولًا خطًّا عريضًا
                    بلونها ثم تُعبَّأ فوقه، فتغطّي التعبئةُ نصفَه الداخلي وحدودَها
                    البينية، ولا يبقى منه إلا ما خارج المنطقة — خيطٌ ساطع على
                    محيطها وحده كما رُسم، والحدود الداخلية خيوطٌ نحيلة. */}
                {DRAW_ORDER.map((id) => (
                  <g
                    key={id}
                    className="nx-arabia-region"
                    data-dim={(dimOthers && focus !== id) || undefined}
                    data-focus={focus === id || undefined}
                    fill={`url(#${uid}-${id})`}
                    style={{ ["--region-tint" as string]: REGION_ACCENT_HEX[id] }}
                  >
                    {PROVINCES_BY_REGION[id].map((p) => (
                      <path key={p.id} d={p.d} className="nx-arabia-rim" />
                    ))}
                    {PROVINCES_BY_REGION[id].map((p) => (
                      <path key={p.id} d={p.d} className="nx-arabia-province">
                        <title>{ar ? p.ar : p.en}</title>
                      </path>
                    ))}
                  </g>
                ))}
                <path
                  d={SAUDI_BORDER_PATH}
                  fill={`url(#${uid}-speckle)`}
                  className="nx-arabia-speckle"
                />
                <path d={SAUDI_BORDER_PATH} className="nx-arabia-border" />
              </g>
              {/* خيوط الطرق وأضواء المدن — زخرفةٌ جغرافية (انظر `CITY_LIGHTS`). */}
              <path d={ROADS_D} className="nx-arabia-roads" />
              <g className="nx-arabia-lights">
                {CITY_LIGHTS.map(([key]) => {
                  const c = CITY_AT[key];
                  return (
                    <g key={key}>
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={2.4 + c.size * 2.2}
                        fill={`url(#${uid}-glow)`}
                        className="nx-arabia-halo"
                      />
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={0.5 + c.size * 0.45}
                        className="nx-arabia-light"
                      />
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* فقاعات المناطق — طبقةٌ شقيقة للرسم لا داخله، وتحت طبقة المواقع.
              على البطاقة الضيّقة شبكةٌ تحت الرسم. */}
          {bubbles && bubbles.length > 0 && (
            <ol
              dir={textDir}
              aria-label={ar ? "المناطق الأربع" : "The four regions"}
              className="nx-arabia-bubbles"
            >
              {REGIONS.map((r) => {
                const b = bubbles.find((x) => x.regionId === r.id);
                if (!b) return null;
                const at = BUBBLE_ANCHOR[r.id];
                const fx = (at.x - target.x) / target.w;
                const fy = (at.y - target.y) / target.h;
                return (
                  <li
                    key={r.id}
                    className="nx-arabia-bubble-slot"
                    data-out={fx < -0.02 || fx > 0.92 || fy < -0.02 || fy > 0.86 || undefined}
                    style={{
                      ["--ux" as string]: at.x,
                      ["--uy" as string]: at.y,
                      ["--region-tint" as string]: REGION_ACCENT_HEX[r.id],
                    }}
                  >
                    <RegionBubble
                      id={r.id}
                      name={ar ? r.shortAr : r.shortEn}
                      labelAr={r.labelAr}
                      labelEn={r.labelEn}
                      bubble={b}
                      metric={bubbleMetric}
                      sitesCount={byRegion[r.id]}
                      compliance={compliance[r.id]}
                      dim={dimOthers && focus !== r.id}
                      ar={ar}
                      notMeasured={notMeasured}
                      pending={pending}
                      simWord={simWord}
                      onGo={() => setRegion(r.id)}
                    />
                  </li>
                );
              })}
            </ol>
          )}

          {/* المواقع — **فوق الفقاعات**: الموقع الحيّ لا تحجبه لافتة. زخرفيةٌ
              للقارئات (العدد في وصف الرسم)، واسم كل موقعٍ تلميحٌ عند المرور. */}
          <ul aria-hidden className="nx-arabia-pins">
            {plotted.map((s) => (
              <li
                key={s.id}
                title={s.name}
                className="nx-arabia-pin"
                style={{
                  ["--ux" as string]: s.x.toFixed(1),
                  ["--uy" as string]: s.y.toFixed(1),
                  ["--region-tint" as string]: REGION_ACCENT_HEX[s.region],
                }}
              >
                <Factory />
              </li>
            ))}
          </ul>
        </div>

        {layersRail}

        {/* ── «إحصائيات سريعة» — أسفل اليسار على البحر كما في الصورة ───── */}
        <div dir={textDir} className="nx-arabia-quick">
          <div className="nx-arabia-quick-head">
            <h3 id="nx-arabia-quick-title" className="nx-arabia-quick-title">
              {ar ? "إحصائيات سريعة" : "Quick stats"}
            </h3>
            {simulatedStats.length > 0 && (
              <span
                className="nx-arabia-sim"
                data-inline=""
                title={
                  ar
                    ? "بيانات مرجعية بأرقام التصميم، ليست حيّة — الحيّ يحلّ محلّها متى وصل"
                    : "Reference data (not live) — live values replace it on arrival"
                }
              >
                {liveStats.length > 0
                  ? ar
                    ? `مرجعي عدا ${liveStats.map((s) => s.ar).join(" و")}`
                    : `Reference except ${liveStats.map((s) => s.en).join(", ")}`
                  : simWord}
              </span>
            )}
            {(statsFailed || status === "error") && (
              <button type="button" onClick={onRetry} className="nx-arabia-tab" data-quiet="">
                {ar ? "أعد المحاولة" : "Retry"}
              </button>
            )}
          </div>
          {/* إحصاءات سريعة — من القراءات نفسها التي تغذّي المؤشرات. */}
          <div className="nx-arabia-quick-strip">
            {quickMore && (
              <Link
                to={quickMore.to}
                aria-label={ar ? quickMore.ar : quickMore.en}
                title={ar ? quickMore.ar : quickMore.en}
                className="nx-arabia-quick-more"
              >
                <ChevronRight aria-hidden />
              </Link>
            )}
            <dl aria-labelledby="nx-arabia-quick-title" className="nx-arabia-quick-list">
              {quickStats.map((s) => {
                const own = s.status ?? status;
                const loading = own === "loading";
                const wait = loading ? waitText(own, ar) : null;
                const quiet = wait !== null || s.value === null;
                const valueText = wait ?? (s.value === null ? notMeasured : fmt(s.value));
                const label = ar ? s.ar : s.en;
                const body = (
                  <>
                    <dt className="nx-arabia-quick-label">
                      <span aria-hidden className="nx-arabia-quick-icon">
                        {s.icon}
                      </span>
                      {label}
                    </dt>
                    <dd
                      className="nx-arabia-quick-value"
                      data-quiet={quiet || undefined}
                      data-sim={(!loading && s.simulated) || undefined}
                    >
                      {loading ? (
                        <>
                          <span aria-hidden className="nx-arabia-wait" />
                          <span className="sr-only">{wait}</span>
                        </>
                      ) : (
                        <span dir="ltr">{valueText}</span>
                      )}
                      {!loading && s.simulated && (
                        <span className="sr-only">
                          {ar ? " (مرجعي، غير حيّ)" : " (reference, not live)"}
                        </span>
                      )}
                    </dd>
                  </>
                );
                return s.to ? (
                  <Link key={s.key} to={s.to} className="nx-arabia-quick-item" data-link="">
                    {body}
                  </Link>
                ) : (
                  <div key={s.key} className="nx-arabia-quick-item">
                    {body}
                  </div>
                );
              })}
            </dl>
          </div>
        </div>

        {/* ── الحواشي: الخطأ والمرفوض والإفصاح — أسفل الوسط، صغيرةٌ هادئة ── */}
        <div dir={textDir} className="nx-arabia-notes">
          {status === "error" && (
            <div role="alert" className="nx-arabia-alert">
              <span>
                {ar
                  ? "تعذّر تحميل المواقع الآن — الخريطة بلا نقاط."
                  : "Sites could not load — the map shows no points."}
              </span>
              {!quickStats.length && (
                <button type="button" onClick={onRetry} className="nx-arabia-tab" data-quiet="">
                  {ar ? "أعد المحاولة" : "Retry"}
                </button>
              )}
            </div>
          )}
          {outside > 0 && (
            <p className="nx-arabia-note">
              {ar
                ? `${outside} موقعًا بإحداثيات خارج المملكة لم يُرسم.`
                : `${outside} site(s) with coordinates outside the Kingdom were not drawn.`}
            </p>
          )}
          <p className="nx-arabia-note">
            {ar
              ? "رسم تمثيلي من بيانات Natural Earth — ليست حدودًا رسمية"
              : "Representative drawing from Natural Earth — not official borders"}
          </p>
        </div>
      </div>
    </section>
  );
}

function RegionBubble({
  id,
  name,
  labelAr,
  labelEn,
  bubble,
  metric,
  sitesCount,
  compliance,
  dim,
  ar,
  notMeasured,
  pending,
  simWord,
  onGo,
}: {
  id: RegionId;
  name: string;
  labelAr: string;
  labelEn: string;
  bubble: ArabiaBubble;
  metric: { readonly ar: string; readonly en: string } | undefined;
  sitesCount: number;
  compliance: number | undefined;
  dim: boolean;
  ar: boolean;
  notMeasured: string;
  /** نصّ التحميل/الخطأ — يحلّ محلّ عدد المواقع فلا يُقرأ صفرًا. */
  pending: string | null;
  simWord: string;
  onGo: () => void;
}) {
  // الحيّ في التلميح والوصف: عدد المواقع المرسومة والامتثال المقيس. التحميل
  // والخطأ يحلّان محلّ الرقمين معًا — لا «لم يُقَس» لقراءةٍ لم تصل.
  const sitesText = pending ?? fmt(sitesCount);
  const complianceText =
    pending ?? (compliance === undefined ? notMeasured : `${fmt(compliance)}%`);
  const change = bubble.change;
  const changeText = change
    ? `${change.dir === "up" ? "↑" : "↓"} ${fmt(change.pct)}%`
    : notMeasured;
  const metricText = metric ? (ar ? metric.ar : metric.en) : "";
  const badgesText = bubble.badges
    .map((b) => `${ar ? TONE_VIEW[b.tone].ar : TONE_VIEW[b.tone].en} ${fmt(b.count)}`)
    .join(ar ? "، " : ", ");
  const spoken = [
    ar ? `افتح ${labelAr}` : `Open ${labelEn}`,
    `${name}: ${metricText ? `${metricText} ` : ""}${fmt(bubble.value)}`,
    badgesText,
    `${ar ? "التغيّر" : "Change"} ${changeText}`,
    bubble.simulated ? (ar ? "بيانات مرجعية (ليست حيّة)" : "reference data (not live)") : null,
    ar
      ? `المواقع ${sitesText} · الامتثال ${complianceText}`
      : `sites ${sitesText} · compliance ${complianceText}`,
  ]
    .filter(Boolean)
    .join(" — ");
  const Arrow = change?.dir === "down" ? ArrowDown : ArrowUp;
  return (
    <Link
      to="/sec"
      search={{ region: id }}
      onClick={onGo}
      aria-label={spoken}
      title={
        ar
          ? `${labelAr} — المواقع ${sitesText} · الامتثال ${complianceText}${bubble.simulated ? " — أرقام الفقاعة مرجعية، ليست حيّة" : ""}`
          : `${labelEn} — sites ${sitesText} · compliance ${complianceText}`
      }
      data-dim={dim || undefined}
      className="nx-arabia-bubble"
    >
      {bubble.simulated && (
        <span aria-hidden className="nx-arabia-sim">
          {simWord}
        </span>
      )}
      <span className="nx-arabia-bubble-name">{name}</span>
      <span className="nx-arabia-bubble-value">
        <Arrow aria-hidden className="nx-arabia-bubble-arrow" />
        <span dir="ltr">{fmt(bubble.value)}</span>
      </span>
      <span className="nx-arabia-bubble-badges">
        {bubble.badges.map((b, i) => {
          const Icon = TONE_VIEW[b.tone].icon;
          return (
            <span key={i} className="nx-arabia-badge" data-tone={b.tone}>
              <span aria-hidden className="nx-arabia-badge-icon">
                <Icon />
              </span>
              <span dir="ltr">{fmt(b.count)}</span>
            </span>
          );
        })}
      </span>
      <span className="nx-arabia-bubble-change" data-absent={change ? undefined : ""}>
        {change ? (
          <span dir="ltr">
            <Arrow aria-hidden />
            {`${fmt(change.pct)}%`}
          </span>
        ) : (
          notMeasured
        )}
      </span>
    </Link>
  );
}

export default ArabianPeninsulaMap;
