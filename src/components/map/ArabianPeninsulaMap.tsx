/**
 * خريطة شبه الجزيرة العربية — المناطق الأربع مضاءةً والمواقع من إحداثياتها
 * (أمر المالك ٢٠٢٦/٠٩/٢٩: «اجعل إحداثيات الموقع تكون رسمة خريطة شبه الجزيرة
 * العربية»).
 *
 * **رسمٌ لا مكتبة.** الهندسة مولَّدة سلفًا في `arabia-geometry.ts` من
 * Natural Earth (ملك عام) — لا بلاطات من شبكة خارجية، ولا حزمة خرائط تثقل
 * ميزانية الأداء، ولا ثيمٌ لا يتبع طبقة الرموز. والخريطة الجغرافية الكاملة
 * تبقى في موضعها: `/executive-map` (زرّ التوسيع في سكّة التحكّم).
 *
 * **شاشةٌ داكنة في الوضعين** كلوحة غرفة العمليات: رموزها مثبَّتة في
 * `.nx-arabia` (كما تُثبَّت على الصفحتين الداكنتين دائمًا)، فالتوهّج يُقرأ
 * على الليل لا على الأبيض.
 *
 * **الصدق:** كل موقعٍ يمرّ على `isInsideSaudi` قبل رسمه، والمرفوض يُعدّ
 * ويُعلن. وعدد مواقع المنطقة يُحسب بالقاعدة نفسها التي لوّنت المنطقة (أقرب
 * مرساة)، فلا يختلف الرقم عن اللون. وما لم يُقَس يُقرأ «لم يُقَس».
 *
 * ## تخطيط مركز القيادة (أمر المالك ٢٠٢٦/١٠/١٣ — المواصفة §4.4)
 *
 * كل ما ترسمه الصورة طافيًا فوق الخريطة يُوضع **بجانبها أو تحتها في مسار
 * التدفّق العادي** — لا طبقة مطلقة فوق الرسم (عقد الهندسة: اللافتات الطافية
 * حجبت ٣ من ٤ مواقع):
 *
 *   الشريط العلوي:  تبويبات العرض (يسارًا، يمرّرها المستدعي) · رقاقات المناطق
 *   الجسم:          سكّة التحكّم (تكبير · تصغير · إعادة ضبط · توسيع) · الرسم
 *                   · سكّة الطبقات (يمينًا، يمرّرها المستدعي)
 *   الذيل:          «إحصائيات سريعة» · بطاقات المناطق الأربع
 *
 * الترتيب يسارًا ← يمينًا كما في الصورة (قرار المالك D5)، فالحاويات
 * `dir="ltr"` ترتيبًا فقط، وكل ورقة تعلن اتجاه لغتها.
 *
 * **التكبير حقيقي:** يتغيّر `viewBox` نفسه لا مقياسُ صورة — فالخطوط
 * والنقاط تُعاد رسمًا بدقّتها. ومركز التكبير المنطقةُ المُبرَزة إن وُجدت
 * (فالرقاقة تنقل العرض إليها)، وإلا مركز المملكة. والانتقال حركةٌ قصيرة
 * تسقط إلى القفز المباشر تحت تقليل الحركة ووضع الأمان.
 */
import { Link } from "@tanstack/react-router";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
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
 * إطار العرض مقصوصٌ على المملكة وهامشٍ حولها — الهندسة تشمل الجوار حتى
 * اليمن وعُمان، وعرضها كاملةً بعرض الصفحة أعطى خريطةً بطول ١١٠٠px أغلبها
 * بحر (رُئي بلقطة على 1440). حدود المملكة في الإطار: x ‎53–745 · y ‎67–634.
 */
const CROP = { x: 20, y: 35, w: 770, h: 630 } as const;

/* ── التكبير: إطار عرضٍ يضيق حول مركزٍ ويبقى داخل الإطار المقصوص ───────── */

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

const FULL: Box = { x: CROP.x, y: CROP.y, w: CROP.w, h: CROP.h };
const boxText = (b: Box) =>
  `${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.w.toFixed(1)} ${b.h.toFixed(1)}`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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
        ? { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }
        : { x: CROP.x + CROP.w / 2, y: CROP.y + CROP.h / 2 };
    }
    centres = out;
  }
  return centres[id];
}

/** الإطار المطلوب لدرجة تكبيرٍ ومنطقةٍ مُبرَزة. */
function viewBoxFor(zoom: number, focus: RegionId | "all"): Box {
  if (zoom <= 1) return FULL;
  const w = CROP.w / zoom;
  const h = CROP.h / zoom;
  const c =
    focus === "all" ? { x: CROP.x + CROP.w / 2, y: CROP.y + CROP.h / 2 } : regionCentre(focus);
  return {
    x: clamp(c.x - w / 2, CROP.x, CROP.x + CROP.w - w),
    y: clamp(c.y - h / 2, CROP.y, CROP.y + CROP.h - h),
    w,
    h,
  };
}

/**
 * ينقل `viewBox` من الإطار المعروض إلى المطلوب بحركةٍ قصيرة، كتابةً مباشرة
 * على العنصر (لا إعادة رسمٍ لـReact في كل إطار). React يكتب الهدف عند
 * الالتزام، وهذا الأثر يعيده إلى نقطة البدء قبل الرسم ثم يسير إليه — فلا
 * وميض. وتحت تقليل الحركة أو وضع الأمان يبقى ما كتبه React: قفزٌ مباشر.
 */
function useViewBoxMotion(svgRef: RefObject<SVGSVGElement | null>, target: Box) {
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
      svg.setAttribute("viewBox", boxText(shown.current));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    svg.setAttribute("viewBox", boxText(from));
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [svgRef, target]);
}

/** نصّ القيمة حين لا تكون القراءة جاهزة — `null` حين تكون. */
function waitText(status: ArabiaStatus, ar: boolean): string | null {
  if (status === "loading") return ar ? "جارٍ التحميل" : "Loading";
  if (status === "error") return ar ? "تعذّر التحميل" : "Unavailable";
  return null;
}

export function ArabianPeninsulaMap({
  status,
  onRetry,
  sites,
  compliance,
  quickStats,
  ar,
  viewTabs,
  layersRail,
}: Props) {
  const { setRegion } = useRegion();
  const [focus, setFocus] = useState<RegionId | "all">("all");
  const [zoomAt, setZoomAt] = useState(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const textDir = ar ? "rtl" : "ltr";
  const zoom = ZOOM_STEPS[zoomAt];
  const target = useMemo(() => viewBoxFor(zoom, focus), [zoom, focus]);
  useViewBoxMotion(svgRef, target);

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
      inside.push({ ...s, ...projectArabia(lat, lng), region: nearestRegion(lat, lng) });
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
  /** النقطة تكبر مع التكبير بجذره — تُرى أوضح ولا تغطّي جاراتها. */
  const dotScale = 1 / Math.sqrt(zoom);
  const zoomWord = zoom.toLocaleString(ar ? "ar-SA" : "en-US");

  return (
    <section
      aria-labelledby="nx-arabia-title"
      dir={textDir}
      className="nx-arabia overflow-hidden rounded-2xl border p-3 sm:p-4"
    >
      <h2
        id="nx-arabia-title"
        className={viewTabs ? "sr-only" : "text-[15px] font-black text-[color:var(--ink)]"}
      >
        {ar ? "خريطة المواقع — شبه الجزيرة العربية" : "Sites map — Arabian Peninsula"}
      </h2>

      {/* ── الشريط العلوي: تبويبات العرض يسارًا · رقاقات المناطق يمينًا ── */}
      <div dir="ltr" className="nx-arabia-bar">
        {viewTabs}
        {/* رقاقات المناطق — تبرز منطقةً ولا تُخفي غيرها، وتنقل مركز التكبير
            إليها. */}
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
                onClick={() => setFocus(id)}
                className="nx-arabia-tab min-h-11 px-3 text-[12px] font-bold"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {status === "error" && (
        <div
          role="alert"
          dir={textDir}
          className="nx-arabia-alert flex flex-wrap items-center gap-2 text-[13px]"
        >
          <span className="text-[color:var(--ink-2)]">
            {ar
              ? "تعذّر تحميل المواقع الآن — الخريطة بلا نقاط."
              : "Sites could not load — the map shows no points."}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="nx-arabia-tab min-h-11 px-3 text-[12px] font-bold"
          >
            {ar ? "أعد المحاولة" : "Retry"}
          </button>
        </div>
      )}

      {/* ── الجسم: سكّة التحكّم · الرسم · سكّة الطبقات ─────────────────── */}
      <div dir="ltr" className="nx-arabia-body">
        <div
          role="group"
          dir={textDir}
          aria-label={ar ? "التحكّم بالعرض" : "View controls"}
          className="nx-arabia-controls"
        >
          <button
            type="button"
            onClick={() => setZoomAt((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))}
            disabled={zoomAt === ZOOM_STEPS.length - 1}
            aria-label={ar ? "تكبير" : "Zoom in"}
            title={ar ? "تكبير" : "Zoom in"}
            className="nx-arabia-ctl"
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
          >
            <Minus aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setZoomAt(0)}
            disabled={zoomAt === 0}
            aria-label={ar ? "إعادة ضبط العرض" : "Reset view"}
            title={ar ? "إعادة ضبط العرض" : "Reset view"}
            className="nx-arabia-ctl"
          >
            <RotateCcw aria-hidden />
          </button>
          <Link
            to="/executive-map"
            aria-label={ar ? "توسيع — الخريطة التنفيذية" : "Expand — executive map"}
            title={ar ? "الخريطة التنفيذية" : "Executive map"}
            className="nx-arabia-ctl"
          >
            <Maximize2 aria-hidden />
          </Link>
          {/* مستوى التكبير للقارئات — قبل الرسم لا بعده، ولا طبقة فوقه. */}
          <span aria-live="polite" className="sr-only">
            {ar ? `مستوى التكبير ${zoomWord}×` : `Zoom level ${zoomWord}×`}
          </span>
        </div>

        <div className="nx-arabia-canvas" aria-busy={status === "loading" || undefined}>
          <svg
            ref={svgRef}
            viewBox={boxText(target)}
            role="img"
            aria-label={
              pending !== null
                ? ar
                  ? `خريطة شبه الجزيرة العربية — ${pending}`
                  : `Arabian Peninsula map — ${pending}`
                : ar
                  ? `خريطة شبه الجزيرة العربية: ${plotted.length} موقعًا على المناطق الأربع`
                  : `Arabian Peninsula map: ${plotted.length} sites across the four regions`
            }
          >
            <path d={NEIGHBOUR_LAND_PATH} className="nx-arabia-neighbour" />
            {SAUDI_PROVINCES.map((p) => (
              <path
                key={p.id}
                d={p.d}
                className="nx-arabia-province"
                data-dim={(focus !== "all" && focus !== p.region) || undefined}
                data-focus={focus === p.region || undefined}
                style={{ ["--region-tint" as string]: REGION_ACCENT_HEX[p.region] }}
              >
                <title>{ar ? p.ar : p.en}</title>
              </path>
            ))}
            <path d={SAUDI_BORDER_PATH} className="nx-arabia-border" />
            {plotted.map((s) => (
              <g key={s.id} style={{ ["--region-tint" as string]: REGION_ACCENT_HEX[s.region] }}>
                <circle cx={s.x} cy={s.y} r={11 * dotScale} className="nx-arabia-site-halo" />
                <circle cx={s.x} cy={s.y} r={5 * dotScale} className="nx-arabia-site">
                  <title>{s.name}</title>
                </circle>
              </g>
            ))}
          </svg>
        </div>

        {layersRail}
      </div>

      {/* ── الذيل: «إحصائيات سريعة» يسارًا · المناطق الأربع يمينًا ─────────
          **مفتاح المناطق تحت الخريطة لا لافتاتٌ فوقها.** كانت اللافتات تطفو
          على مواضعها فقِيست بالبكسل: تتراكب الوسطى والغربية (16×17px عند
          1280) وتحجب ٣ من ٤ نقاط مواقع. والمواقع بياناتٌ حيّة قد تقع في أي
          موضع، فلا موضعَ ثابتًا للافتة يضمن ألّا يغطّيها. فالرسم للمواقع
          وحدها، والمفتاح يربط اللون بالاسم والأرقام ويفتح المنطقة. وما ترسمه
          الصورة لكل منطقة من بلاغاتٍ ونسب تغيّر لا يُقاس (البلاغ بلا منطقة)،
          فتحلّ محلّه المواقع والامتثال. */}
      <div dir="ltr" className="nx-arabia-foot">
        <div dir={textDir} className="nx-arabia-quick">
          <div className="nx-arabia-quick-head">
            <h3 id="nx-arabia-quick-title" className="nx-arabia-quick-title">
              {ar ? "إحصائيات سريعة" : "Quick stats"}
            </h3>
            {statsFailed && (
              <button
                type="button"
                onClick={onRetry}
                className="nx-arabia-tab min-h-11 px-3 text-[12px] font-bold"
              >
                {ar ? "أعد المحاولة" : "Retry"}
              </button>
            )}
          </div>
          {/* إحصاءات سريعة — من القراءات نفسها التي تغذّي المؤشرات. */}
          <dl aria-labelledby="nx-arabia-quick-title" className="nx-arabia-quick-list">
            {quickStats.map((s) => {
              const wait = waitText(s.status ?? status, ar);
              const quiet = wait !== null || s.value === null;
              return (
                <div key={s.key} className="nx-arabia-quick-item">
                  <dt className="nx-arabia-quick-label">
                    <span aria-hidden className="nx-arabia-quick-icon">
                      {s.icon}
                    </span>
                    {ar ? s.ar : s.en}
                  </dt>
                  <dd className="nx-arabia-quick-value" data-quiet={quiet || undefined}>
                    {wait ??
                      (s.value === null
                        ? notMeasured
                        : s.value.toLocaleString(ar ? "ar-SA" : "en-US"))}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <ul dir={textDir} className="nx-arabia-regions">
          {REGIONS.map((r) => (
            <li key={r.id} style={{ ["--region-tint" as string]: REGION_ACCENT_HEX[r.id] }}>
              <RegionChip
                id={r.id}
                name={ar ? r.shortAr : r.shortEn}
                labelAr={r.labelAr}
                labelEn={r.labelEn}
                sitesCount={byRegion[r.id]}
                compliance={compliance[r.id]}
                dim={focus !== "all" && focus !== r.id}
                ar={ar}
                notMeasured={notMeasured}
                pending={pending}
                onGo={() => setRegion(r.id)}
              />
            </li>
          ))}
        </ul>
      </div>

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
    </section>
  );
}

function RegionChip({
  id,
  name,
  labelAr,
  labelEn,
  sitesCount,
  compliance,
  dim,
  ar,
  notMeasured,
  pending,
  onGo,
}: {
  id: RegionId;
  name: string;
  labelAr: string;
  labelEn: string;
  sitesCount: number;
  compliance: number | undefined;
  dim: boolean;
  ar: boolean;
  notMeasured: string;
  /** نصّ التحميل/الخطأ — يحلّ محلّ عدد المواقع فلا يُقرأ صفرًا. */
  pending: string | null;
  onGo: () => void;
}) {
  // التحميل والخطأ يحلّان محلّ الرقمين معًا — لا «لم يُقَس» لقراءةٍ لم تصل.
  const sitesText = pending ?? sitesCount.toLocaleString(ar ? "ar-SA" : "en-US");
  // «٪» العربية مع الأرقام الهندية — كما في صفّ المؤشرات، لا رقمان بخطّين في رقاقةٍ واحدة.
  const complianceText =
    pending ??
    (compliance === undefined
      ? notMeasured
      : `${Math.round(compliance).toLocaleString(ar ? "ar-SA" : "en-US")}${ar ? "٪" : "%"}`);
  return (
    <Link
      to="/sec"
      search={{ region: id }}
      onClick={onGo}
      aria-label={
        ar
          ? `افتح ${labelAr} — المواقع ${sitesText} · الامتثال ${complianceText}`
          : `Open ${labelEn} — sites ${sitesText} · compliance ${complianceText}`
      }
      data-dim={dim || undefined}
      className="nx-arabia-chip flex min-h-11 flex-col border px-3 py-1.5"
    >
      <span className="flex items-center gap-1.5 text-[13px] font-black text-[color:var(--ink)]">
        <span aria-hidden className="size-2 rounded-full bg-[color:var(--region-tint)]" />
        {name}
      </span>
      {/* السطران يلتفّان في البطاقة الضيّقة بدل أن يتجاوزاها. */}
      <span className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-[color:var(--ink-2)]">
        <span>
          {ar ? "المواقع" : "Sites"}{" "}
          <b className="tabular-nums text-[color:var(--ink)]">{sitesText}</b>
        </span>
        <span>
          {ar ? "الامتثال" : "Compliance"}{" "}
          <b className="tabular-nums text-[color:var(--ink)]">{complianceText}</b>
        </span>
      </span>
    </Link>
  );
}

export default ArabianPeninsulaMap;
