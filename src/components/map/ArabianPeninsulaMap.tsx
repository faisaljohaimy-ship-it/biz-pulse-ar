/**
 * خريطة شبه الجزيرة العربية — المناطق الأربع مضاءةً والمواقع من إحداثياتها
 * (أمر المالك ٢٠٢٦/٠٩/٢٩: «اجعل إحداثيات الموقع تكون رسمة خريطة شبه الجزيرة
 * العربية»).
 *
 * **رسمٌ لا مكتبة.** الهندسة مولَّدة سلفًا في `arabia-geometry.ts` من
 * Natural Earth (ملك عام) — لا بلاطات من شبكة خارجية، ولا حزمة خرائط تثقل
 * ميزانية الأداء، ولا ثيمٌ لا يتبع طبقة الرموز. والخريطة الجغرافية الكاملة
 * تبقى في موضعها: `/executive-map`.
 *
 * **شاشةٌ داكنة في الوضعين** كلوحة غرفة العمليات: رموزها مثبَّتة في
 * `.nx-arabia` (كما تُثبَّت على الصفحتين الداكنتين دائمًا)، فالتوهّج يُقرأ
 * على الليل لا على الأبيض.
 *
 * **الصدق:** كل موقعٍ يمرّ على `isInsideSaudi` قبل رسمه، والمرفوض يُعدّ
 * ويُعلن. وعدد مواقع المنطقة يُحسب بالقاعدة نفسها التي لوّنت المنطقة (أقرب
 * مرساة)، فلا يختلف الرقم عن اللون. وما لم يُقَس يُقرأ «لم يُقَس».
 */
import { Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
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

export interface ArabiaSite {
  readonly id: string;
  readonly name: string;
  readonly lat: number | null;
  readonly lng: number | null;
}

export interface ArabiaQuickStat {
  readonly key: string;
  readonly ar: string;
  readonly en: string;
  /** `null` = لم يُقَس. */
  readonly value: number | null;
  readonly icon: ReactNode;
}

/** حال القراءة — التحميل والخطأ لا يُقرآن «لم يُقَس» (المادة ١٤). */
export type ArabiaStatus = "loading" | "error" | "ready";

interface Props {
  readonly status: ArabiaStatus;
  readonly onRetry: () => void;
  readonly sites: readonly ArabiaSite[];
  /** الامتثال لكل منطقة من الخادم؛ الغائب «لم يُقَس» (الصفر قياس). */
  readonly compliance: Partial<Record<RegionId, number>>;
  readonly quickStats: readonly ArabiaQuickStat[];
  readonly ar: boolean;
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

export function ArabianPeninsulaMap({ status, onRetry, sites, compliance, quickStats, ar }: Props) {
  const { setRegion } = useRegion();
  const [focus, setFocus] = useState<RegionId | "all">("all");

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
  /** نصّ القيمة حين لا تكون القراءة جاهزة — `null` حين تكون. */
  const pending =
    status === "loading"
      ? ar
        ? "جارٍ التحميل"
        : "Loading"
      : status === "error"
        ? ar
          ? "تعذّر التحميل"
          : "Unavailable"
        : null;

  return (
    <section
      aria-labelledby="nx-arabia-title"
      className="nx-arabia relative overflow-hidden rounded-2xl border p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 id="nx-arabia-title" className="text-[15px] font-black text-[color:var(--ink)]">
            {ar ? "خريطة المواقع — شبه الجزيرة العربية" : "Sites map — Arabian Peninsula"}
          </h2>
          <p className="text-[12px] text-[color:var(--ink-3)]">
            {ar
              ? "رسم تمثيلي من بيانات Natural Earth — ليست حدودًا رسمية"
              : "Representative drawing from Natural Earth — not official borders"}
          </p>
        </div>
        {/* تبويبات المناطق — تبرز منطقةً ولا تُخفي غيرها. */}
        <div
          role="group"
          aria-label={ar ? "إبراز منطقة" : "Highlight a region"}
          className="nx-arabia-tabs flex flex-wrap gap-1"
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
                className="nx-arabia-tab min-h-11 rounded-lg px-3 text-[12px] font-bold"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {status === "error" && (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-[color:var(--ink-2)]">
            {ar
              ? "تعذّر تحميل المواقع الآن — الخريطة بلا نقاط."
              : "Sites could not load — the map shows no points."}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="nx-arabia-tab min-h-11 rounded-lg px-3 text-[12px] font-bold"
          >
            {ar ? "أعد المحاولة" : "Retry"}
          </button>
        </div>
      )}

      <div className="relative mt-3" aria-busy={status === "loading" || undefined}>
        <svg
          viewBox={`${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`}
          className="block h-auto w-full"
          role="img"
          aria-label={
            ar
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
              <circle cx={s.x} cy={s.y} r={11} className="nx-arabia-site-halo" />
              <circle cx={s.x} cy={s.y} r={5} className="nx-arabia-site">
                <title>{s.name}</title>
              </circle>
            </g>
          ))}
        </svg>
      </div>

      {/* **مفتاح المناطق تحت الخريطة لا لافتاتٌ فوقها.** كانت اللافتات تطفو
          على مواضعها فقِيست بالبكسل: تتراكب الوسطى والغربية (16×17px عند
          1280) وتحجب ٣ من ٤ نقاط مواقع. والمواقع بياناتٌ حيّة قد تقع في أي
          موضع، فلا موضعَ ثابتًا للافتة يضمن ألّا يغطّيها. فالرسم للمواقع
          وحدها، والمفتاح يربط اللون بالاسم والأرقام ويفتح المنطقة. */}
      <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
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

      {/* إحصاءات سريعة — من القراءة نفسها التي تغذّي المؤشرات. */}
      <dl className="nx-arabia-stats mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quickStats.map((s) => (
          <div key={s.key} className="flex items-center gap-2 rounded-xl px-3 py-2">
            <span aria-hidden className="text-[color:var(--arabia-accent)]">
              {s.icon}
            </span>
            <span className="min-w-0">
              <dt className="text-[12px] leading-tight text-[color:var(--ink-3)]">
                {ar ? s.ar : s.en}
              </dt>
              <dd
                className={
                  pending !== null || s.value === null
                    ? "text-[12px] text-[color:var(--ink-3)]"
                    : "text-[17px] font-black tabular-nums text-[color:var(--ink)]"
                }
              >
                {pending ??
                  (s.value === null ? notMeasured : s.value.toLocaleString(ar ? "ar-SA" : "en-US"))}
              </dd>
            </span>
          </div>
        ))}
      </dl>

      {outside > 0 && (
        <p className="mt-2 text-[12px] text-[color:var(--ink-3)]">
          {ar
            ? `${outside} موقعًا بإحداثيات خارج المملكة لم يُرسم.`
            : `${outside} site(s) with coordinates outside the Kingdom were not drawn.`}
        </p>
      )}
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
  const complianceText =
    pending ?? (compliance === undefined ? notMeasured : `${Math.round(compliance)}%`);
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
      className="nx-arabia-chip flex min-h-11 flex-col rounded-xl border px-3 py-1.5"
    >
      <span className="flex items-center gap-1.5 text-[13px] font-black text-[color:var(--ink)]">
        <span aria-hidden className="size-2 rounded-full bg-[color:var(--region-tint)]" />
        {name}
      </span>
      <span className="flex items-baseline gap-2 text-[12px] text-[color:var(--ink-2)]">
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
