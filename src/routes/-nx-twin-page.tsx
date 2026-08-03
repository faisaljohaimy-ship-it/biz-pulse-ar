/**
 * اتجاه ج — «التوأم الحيّ».
 *
 * المبدأ: **البُعد الثالث يحمل المعنى**. المناطق ليست صفوفًا في جدول بل
 * أعمدة ضوء ترتفع من مستوٍ متساوي القياس — وارتفاع العمود هو نسبة
 * الامتثال. الفرق بين ٩١٪ و٤٥٪ يُرى كفرق ارتفاع قبل أن يُقرأ كرقم.
 *
 * والمشهد يتنفّس: أنابيب بيانات تسري من القلب إلى كل عمود بنبض متحرّك،
 * وثلاث طبقات عمق خلف كل شيء (شبكة بعيدة · توهّج أوسط · تعتيم قريب) تصنع
 * مسافة حقيقية لا ظلًّا مرسومًا.
 *
 * لوحات الحالة تطفو فوق المشهد بارتفاع مركَّب (ظلّ مزدوج + حافة مضيئة)،
 * فتُقرأ فوقه لا فيه.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CC_ALERTS,
  CC_REGIONS,
  CC_REGION_METRICS,
} from "@/components/executive/command/commandCenterData";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

const W = 760;
const H = 520;
const HUB = { x: W / 2, y: 276 };

/** مواضع الأعمدة على المستوى المتساوي القياس — معينٌ حول القلب. */
const PADS: Record<RegionId, { x: number; y: number }> = {
  central: { x: W / 2, y: 146 },
  eastern: { x: W / 2 + 236, y: 276 },
  southern: { x: W / 2, y: 424 },
  western: { x: W / 2 - 236, y: 276 },
};

export function NxTwinPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { regionId, setRegion } = useRegion();
  const { loading: authLoading } = useAuth();
  const getState = useServerFn(getCommandCenterState);

  const { data } = useQuery({
    queryKey: ["twin-state"],
    queryFn: () => getState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const live = useMemo(() => {
    const out: Partial<Record<RegionId, number>> = {};
    for (const r of data?.regions ?? [])
      if (r.compliance_pct > 0) out[r.region_id] = r.compliance_pct;
    return out;
  }, [data]);

  const c = data?.counters;
  const dash = "—";
  const avg = c?.compliance_avg && c.compliance_avg > 0 ? c.compliance_avg : null;

  const hud = [
    { ar: "الوكلاء", en: "Agents", v: c?.agents_active, hint: ar ? "يعملون الآن" : "working now" },
    {
      ar: "بانتظار الاعتماد",
      en: "Pending",
      v: c?.proposals_pending,
      hint: ar ? "قرار بشري" : "human decision",
    },
    {
      ar: "عاجل مفتوح",
      en: "Urgent",
      v: c?.urgent_open,
      hint: ar ? "داخل نافذة SLA" : "inside SLA",
    },
    { ar: "منجز اليوم", en: "Done", v: c?.done_today, hint: ar ? "منذ الفجر" : "since dawn" },
  ];

  return (
    <main className="nx-tw relative min-h-screen overflow-hidden bg-[color:var(--surface)] text-[color:var(--ink)]">
      {/* ثلاث طبقات عمق — بعيدة، وسطى، قريبة. */}
      <span aria-hidden className="nx-tw-far" />
      <span aria-hidden className="nx-tw-mid" />
      <span aria-hidden className="nx-tw-near" />

      <div className="relative mx-auto w-full max-w-[1280px] px-5 pb-14 pt-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="nx-tw-eyebrow">{ar ? "سَدِيد · التوأم الحيّ" : "SADEED · Living Twin"}</p>
            <h1 className="nx-tw-title">
              {ar ? "أربع مناطق، مشهد واحد" : "Four regions, one scene"}
            </h1>
          </div>
          <p className="nx-tw-avg">
            <span className="nx-tw-avg-v">{avg === null ? dash : `${avg}%`}</span>
            <span className="nx-tw-avg-k">{ar ? "متوسط الامتثال" : "mean compliance"}</span>
          </p>
        </header>

        {/* ── المشهد ─────────────────────────────────────────────────── */}
        <div className="nx-tw-stage mt-6">
          <svg viewBox={`0 0 ${W} ${H}`} className="nx-tw-svg" aria-hidden focusable="false">
            {/* أرضية متساوية القياس */}
            <g className="nx-tw-floor">
              {Array.from({ length: 9 }, (_, i) => {
                const t = (i - 4) * 58;
                return (
                  <g key={i}>
                    <line x1={HUB.x + t} y1={HUB.y - 128} x2={HUB.x + t + 150} y2={HUB.y + 22} />
                    <line x1={HUB.x + t} y1={HUB.y - 128} x2={HUB.x + t - 150} y2={HUB.y + 22} />
                  </g>
                );
              })}
            </g>

            {/* القلب */}
            <g className="nx-tw-hub">
              <ellipse cx={HUB.x} cy={HUB.y} rx="30" ry="12" />
              <ellipse cx={HUB.x} cy={HUB.y} rx="16" ry="6.5" className="nx-tw-hub-in" />
            </g>

            {/* أنابيب البيانات — نبض يسري من القلب إلى كل عمود */}
            {REGIONS.map((region, i) => {
              const p = PADS[region.id];
              return (
                <g
                  key={`c-${region.id}`}
                  style={{ ["--tw-accent" as string]: REGION_ACCENT_HEX[region.id] }}
                >
                  <line x1={HUB.x} y1={HUB.y} x2={p.x} y2={p.y} className="nx-tw-conduit" />
                  <line
                    x1={HUB.x}
                    y1={HUB.y}
                    x2={p.x}
                    y2={p.y}
                    className="nx-tw-pulse"
                    style={{ ["--tw-i" as string]: i }}
                  />
                </g>
              );
            })}

            {/* الأعمدة — ارتفاع الضوء هو النسبة */}
            {REGIONS.map((region) => {
              const p = PADS[region.id];
              const pct = live[region.id];
              const h = pct === undefined ? 0 : 24 + (pct / 100) * 118;
              const active = region.id === regionId;
              return (
                <g
                  key={region.id}
                  className="nx-tw-node"
                  data-active={active || undefined}
                  style={{ ["--tw-accent" as string]: REGION_ACCENT_HEX[region.id] }}
                >
                  <ellipse cx={p.x} cy={p.y} rx="52" ry="21" className="nx-tw-pad" />
                  <ellipse cx={p.x} cy={p.y} rx="34" ry="13" className="nx-tw-pad-in" />
                  {pct !== undefined && (
                    <>
                      <rect
                        x={p.x - 15}
                        y={p.y - h}
                        width="30"
                        height={h}
                        rx="4"
                        className="nx-tw-tower"
                      />
                      <ellipse cx={p.x} cy={p.y - h} rx="15" ry="6" className="nx-tw-cap" />
                    </>
                  )}
                  <text
                    x={p.x}
                    y={p.y + 42}
                    textAnchor="middle"
                    className="nx-tw-name"
                    fill="currentColor"
                  >
                    {ar ? region.shortAr : region.shortEn}
                  </text>
                  <text
                    x={p.x}
                    y={pct === undefined ? p.y - 34 : p.y - h - 16}
                    textAnchor="middle"
                    className="nx-tw-val"
                    fill="currentColor"
                    data-empty={pct === undefined || undefined}
                  >
                    {pct === undefined ? (ar ? "لم يُقَس" : "not measured") : `${Math.round(pct)}%`}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* لوحات الحالة الطافية */}
          <div className="nx-tw-hud">
            {hud.map((x) => (
              <article key={x.en} className="nx-tw-card">
                <b className="nx-tw-card-v">{typeof x.v === "number" ? x.v : dash}</b>
                <span className="nx-tw-card-k">{ar ? x.ar : x.en}</span>
                <span className="nx-tw-card-h">{x.hint}</span>
              </article>
            ))}
          </div>
        </div>

        {/* ── محدّد المنطقة + مؤشراتها ───────────────────────────────── */}
        <section className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="nx-tw-panel">
            <h2 className="nx-tw-h2">{ar ? "اختر منطقة" : "Select a region"}</h2>
            <div className="grid grid-cols-2 gap-2">
              {REGIONS.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setRegion(region.id)}
                  aria-pressed={region.id === regionId}
                  className="nx-tw-pick"
                  style={{ ["--tw-accent" as string]: REGION_ACCENT_HEX[region.id] }}
                >
                  <span className="nx-tw-pick-dot" aria-hidden />
                  <span className="truncate">{ar ? region.shortAr : region.shortEn}</span>
                  {region.id === regionId && (
                    <i className="nx-tw-pick-mark">{ar ? "الحالية" : "on"}</i>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="nx-tw-panel">
            <h2 className="nx-tw-h2">
              {ar ? "مؤشرات المنطقة الحالية" : "Current region indicators"}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CC_REGION_METRICS.map((m) => (
                <span key={m.key} className="nx-tw-metric">
                  <b>{CC_REGIONS[regionId].metrics[m.key]}</b>
                  <i>{ar ? m.ar : m.en}</i>
                </span>
              ))}
            </div>
            <ul className="nx-tw-timeline">
              {(data?.urgent ?? []).slice(0, 3).map((a) => (
                <li key={a.id}>
                  <span className="nx-tw-tl-dot" data-level="high" aria-hidden />
                  <b className="truncate">{a.title_ar}</b>
                  <i className="shrink-0">{a.department}</i>
                </li>
              ))}
              {CC_ALERTS.map((a) => (
                <li key={a.en}>
                  <span className="nx-tw-tl-dot" data-level={a.level} aria-hidden />
                  <b className="truncate">{ar ? a.ar : a.en}</b>
                  <i className="shrink-0">{a.time}</i>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

export default NxTwinPage;
