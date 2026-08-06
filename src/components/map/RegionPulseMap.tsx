/**
 * RegionPulseMap — «نبض المناطق»: خريطة توزيع الإدارات الأربع (البند ٢٣).
 *
 * ## لماذا رسمٌ تخطيطي لا Leaflet
 *
 * هذه لوحة **نظرة عامة** داخل مركز القيادة، لا شاشة تنقيب جغرافي. و
 * Leaflet هنا يعني: حزمة إضافية على مسارٍ ليس مسار الخرائط، وبلاطات من
 * شبكة خارجية تحتاج اتصالًا، وثيمًا لا يتبع طبقة الرموز. الرسم التخطيطي
 * يعطي الجواب المطلوب — **أين تتوزّع المواقع وكيف حالها** — فورًا وبلا
 * شبكة، وبألوان المناطق من `regions.ts` نفسها. الخريطة الجغرافية الكاملة
 * تبقى في مكانها الصحيح: `/executive-map`.
 *
 * ## السعودية حصرًا
 *
 * كل نقطة تمرّ على `isInsideSaudi` قبل أن تُرسم — والمرفوضة تُعدّ وتُعلَن
 * نصًّا بدل أن تُبتلع بصمت. صفٌّ بإحداثيات خاطئة يجب أن يُرى، لا أن يختفي.
 *
 * ## الحالات الأربع
 *
 * تحميل (هيكل) · فارغ (نصّ صريح) · خطأ (رسالة عربية) · نجاح — كلها هنا،
 * لأن لوحة بيانات بلا حالاتها الأربع تكذب في ثلاث منها.
 */
import { useMemo } from "react";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";
import { REGION_MARKERS } from "@/components/executive/region-markers";
import {
  isInsideSaudi,
  projectToViewBox,
  SAUDI_OUTLINE,
  SAUDI_VIEWBOX,
} from "@/components/map/saudi-geometry";

/** موقع قابل للرسم — الحد الأدنى الذي تحتاجه الخريطة، لا نوع الشاشة كله. */
export interface MappableSite {
  readonly id: string;
  readonly name: string;
  readonly lat: number | null;
  readonly lng: number | null;
  /** صحّة الموقع؛ `null` = لم تُقَس (المادة ٢٧) فلا يُلوَّن بحالة لم تُعرف. */
  readonly health?: "ok" | "warn" | "critical" | null;
}

interface Props {
  readonly sites: readonly MappableSite[];
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly ar?: boolean;
  /** المنطقة المختارة — تُبرز عقدتها ولا تُخفي غيرها. */
  readonly activeRegion?: RegionId;
  readonly onSelectRegion?: (id: RegionId) => void;
}

/** أقرب إدارة إقليمية لإحداثي — بالمسافة الإقليدية على المراسي الأربع. */
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

const HEALTH_LABEL = {
  ok: { ar: "سليم", en: "OK" },
  warn: { ar: "تحذير", en: "Warning" },
  critical: { ar: "حرج", en: "Critical" },
} as const;

export function RegionPulseMap({
  sites,
  loading = false,
  error = null,
  ar = true,
  activeRegion,
  onSelectRegion,
}: Props) {
  const { plotted, outside, byRegion } = useMemo(() => {
    const inside: Array<MappableSite & { lat: number; lng: number; region: RegionId }> = [];
    let rejected = 0;
    for (const s of sites) {
      if (!isInsideSaudi(s.lat, s.lng)) {
        rejected += 1;
        continue;
      }
      const lat = s.lat as number;
      const lng = s.lng as number;
      inside.push({ ...s, lat, lng, region: nearestRegion(lat, lng) });
    }
    const counts = {} as Record<RegionId, number>;
    for (const r of REGIONS) counts[r.id] = 0;
    for (const s of inside) counts[s.region] += 1;
    return { plotted: inside, outside: rejected, byRegion: counts };
  }, [sites]);

  if (error) {
    return (
      <div className="nx-bp-card rounded-2xl p-5 text-sm text-[color:var(--ink-2)]">
        <p className="font-semibold text-[color:var(--ink)]">
          {ar ? "تعذّر عرض توزيع المناطق" : "Region distribution unavailable"}
        </p>
        <p className="mt-1 text-[12px] text-[color:var(--ink-3)]">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="nx-bp-card rounded-2xl p-5" aria-busy="true">
        <div className="nx-rpm-skeleton" aria-hidden />
        <p className="mt-3 text-[12px] text-[color:var(--ink-3)]">
          {ar ? "جارٍ تحميل توزيع المناطق…" : "Loading region distribution…"}
        </p>
      </div>
    );
  }

  return (
    <section className="nx-rpm nx-bp-card rounded-2xl p-4 sm:p-5" aria-labelledby="nx-rpm-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="nx-rpm-title" className="text-sm font-black text-[color:var(--ink)]">
          {ar ? "نبض المناطق — التوزيع الجغرافي" : "Region pulse — geographic distribution"}
        </h3>
        <p className="text-[12px] text-[color:var(--ink-3)]">
          {ar
            ? "رسم تمثيلي داخل المملكة — ليست حدودًا رسمية"
            : "Representative schematic inside the Kingdom — not official borders"}
        </p>
      </div>

      {plotted.length === 0 ? (
        <p className="mt-4 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--chip)] p-4 text-sm text-[color:var(--ink-2)]">
          {ar
            ? "لا مواقع بإحداثيات داخل المملكة لعرضها الآن."
            : "No sites with coordinates inside the Kingdom to plot."}
        </p>
      ) : (
        <div className="relative mt-4">
          <svg
            viewBox={`0 0 ${SAUDI_VIEWBOX.width} ${SAUDI_VIEWBOX.height}`}
            className="nx-rpm-svg block w-full"
            role="img"
            aria-label={
              ar
                ? `توزيع ${plotted.length} موقعًا على الإدارات الأربع`
                : `Distribution of ${plotted.length} sites across the four regions`
            }
          >
            <path d={SAUDI_OUTLINE} className="nx-rpm-land" />

            {/* المواقع — نقطة لكل موقع بلون إدارته، وحالتها بالشكل لا باللون */}
            {plotted.map((s) => {
              const p = projectToViewBox(s.lat, s.lng);
              return (
                <circle
                  key={s.id}
                  cx={p.x}
                  cy={p.y}
                  r={s.health === "critical" ? 5 : 3.5}
                  className="nx-rpm-site"
                  data-health={s.health ?? "unknown"}
                  style={{ ["--rpm-accent" as string]: REGION_ACCENT_HEX[s.region] }}
                />
              );
            })}

            {/* عقد الإدارات الأربع — فوق النقاط، بحجمٍ يوازي عدد مواقعها */}
            {REGION_MARKERS.map((m) => {
              const p = projectToViewBox(m.lat, m.lng);
              const n = byRegion[m.id];
              return (
                <g key={m.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={14 + Math.min(10, n)}
                    className="nx-rpm-halo"
                    data-active={m.id === activeRegion || undefined}
                    style={{ ["--rpm-accent" as string]: REGION_ACCENT_HEX[m.id] }}
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={7}
                    className="nx-rpm-node"
                    style={{ ["--rpm-accent" as string]: REGION_ACCENT_HEX[m.id] }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* التوزيع رقمًا — أزرارٌ حقيقية بأرضية لمس ٤٤px، لا زخرفة على الرسم */}
      <ul className="nx-rpm-legend mt-4">
        {REGIONS.map((r) => {
          const n = byRegion[r.id];
          const active = r.id === activeRegion;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelectRegion?.(r.id)}
                disabled={!onSelectRegion}
                aria-pressed={onSelectRegion ? active : undefined}
                className="nx-rpm-chip"
                style={{ ["--rpm-accent" as string]: REGION_ACCENT_HEX[r.id] }}
              >
                <span aria-hidden className="nx-rpm-swatch" />
                <span className="nx-rpm-chip-name">{ar ? r.shortAr : r.shortEn}</span>
                <b className="nx-rpm-chip-count">{n}</b>
                {/* الحالة النشطة لا تُقال باللون وحده (WCAG 1.4.1) */}
                {active && <span className="nx-rpm-chip-flag">{ar ? "الحالية" : "current"}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {/* مفتاح القراءة — بدونه الرسم شكلٌ لا معلومة */}
      <dl className="nx-rpm-key mt-3">
        <div>
          <dt>{ar ? "اللون" : "Colour"}</dt>
          <dd>{ar ? "الإدارة الإقليمية" : "Regional administration"}</dd>
        </div>
        <div>
          <dt>{ar ? "حجم الهالة" : "Halo size"}</dt>
          <dd>{ar ? "عدد المواقع" : "Site count"}</dd>
        </div>
        <div>
          <dt>{ar ? "نقطة أكبر بحلقة" : "Larger ringed dot"}</dt>
          <dd>{ar ? HEALTH_LABEL.critical.ar : HEALTH_LABEL.critical.en}</dd>
        </div>
      </dl>

      {outside > 0 && (
        <p className="mt-3 text-[12px] text-[color:var(--ink-3)]">
          {ar
            ? `${outside} موقعًا بإحداثيات خارج المملكة لم تُرسم.`
            : `${outside} site(s) with coordinates outside the Kingdom were not plotted.`}
        </p>
      )}
    </section>
  );
}

export default RegionPulseMap;
