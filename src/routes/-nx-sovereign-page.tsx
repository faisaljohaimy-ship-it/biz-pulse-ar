/**
 * اتجاه ب — «السيادي».
 *
 * المبدأ: **الطباعة هي العمارة**. لا شبكة بطاقات ولا حاويات زجاجية — بل
 * صفحة تقرير سيادي: عنوان بحجم يوقف العين، رقم واحد ضخم يحمل الصفحة،
 * وشعيرات ذهبية تفصل الأقسام كما تفصل خطوط الطباعة أعمدة الجريدة.
 *
 * الهندسة الإسلامية هنا **بنية لا ورق حائط**: النجمة الثمانية (مربّعان
 * متقاطعان بزاوية ٤٥°) تُرصف رصفًا حقيقيًّا وتحمل لوحة كاملة، لا تُرشّ
 * خلفيةً باهتة. والذهب رمز واحد (`--sv-gold`) يتبدّل بالوضع، فلا لون
 * نهائي في أي عنصر.
 *
 * الكثافة تأتي من النصّ نفسه: جداول، أعمدة، سطور بيانات — كما يمتلئ تقرير
 * سنوي بالمعلومة لا بالفراغ.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CC_REGIONS, CC_REGION_METRICS } from "@/components/executive/command/commandCenterData";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

/** رصف النجمة الثمانية — مربّعان متقاطعان بزاوية ٤٥° كما في التوريق. */
function GirihField({ className = "" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden focusable="false">
      <defs>
        <pattern id="sv-girih" width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="16" y="16" width="40" height="40" />
            <rect x="16" y="16" width="40" height="40" transform="rotate(45 36 36)" />
            <circle cx="36" cy="36" r="4.5" />
            <path d="M0 36h12M60 36h12M36 0v12M36 60v12" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sv-girih)" />
    </svg>
  );
}

export function NxSovereignPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { regionId, setRegion } = useRegion();
  const { loading: authLoading } = useAuth();
  const getState = useServerFn(getCommandCenterState);

  const { data } = useQuery({
    queryKey: ["sovereign-state"],
    queryFn: () => getState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const live = useMemo(() => {
    const out: Partial<Record<RegionId, number>> = {};
    for (const r of data?.regions ?? [])
      // `!== null` لا `> 0`: الصفر قياسٌ (امتثال ٠٪) لا غياب.
      if (r.compliance_pct !== null) out[r.region_id] = r.compliance_pct;
    return out;
  }, [data]);

  const c = data?.counters;
  const dash = "—";
  const avg = c?.compliance_avg && c.compliance_avg > 0 ? c.compliance_avg : null;

  const ledger = [
    { ar: "الوكلاء النشطون", en: "Active agents", v: c?.agents_active },
    { ar: "بانتظار الاعتماد", en: "Pending approval", v: c?.proposals_pending },
    { ar: "أعمال عاجلة", en: "Urgent work", v: c?.urgent_open },
    { ar: "قيد المعالجة", en: "In progress", v: c?.support_processing },
    { ar: "منجز اليوم", en: "Completed today", v: c?.done_today },
  ];

  return (
    <main className="nx-sv min-h-screen bg-[color:var(--surface)] text-[color:var(--ink)]">
      {/* ── الترويسة السيادية ─────────────────────────────────────────── */}
      <header className="nx-sv-band">
        <div className="nx-sv-wrap">
          <p className="nx-sv-eyebrow">
            {ar
              ? "المملكة العربية السعودية · الأمن الصناعي"
              : "Kingdom of Saudi Arabia · Industrial Security"}
          </p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
            <div>
              <h1 className="nx-sv-title">{ar ? "سَدِيد" : "SADEED"}</h1>
              <p className="nx-sv-lede">
                {ar
                  ? "منصّة إنجاز الأعمال التنفيذية لأربع مناطق صناعية — توجيهٌ واحد، وأربع لوحات تنفيذ، وسجلّ واحد لا يقبل التأويل."
                  : "The executive work-execution platform across four industrial regions — one directive, four execution boards, a single record that admits no interpretation."}
              </p>
            </div>

            {/* الرقم الحامل — يقود الصفحة كما يقود الرقم غلافَ تقرير سنوي. */}
            <div className="nx-sv-figure">
              <span className="nx-sv-figure-value">{avg === null ? dash : avg}</span>
              {avg !== null && <span className="nx-sv-figure-unit">%</span>}
              <span className="nx-sv-figure-label">
                {avg === null
                  ? ar
                    ? "الامتثال — لم يُقَس"
                    : "compliance — not measured"
                  : ar
                    ? "متوسط الامتثال عبر المناطق الأربع"
                    : "mean compliance across the four regions"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── الشريط الهندسي: النجمة الثمانية تحمل لوحة، لا تُرشّ خلفية ──── */}
      <section className="nx-sv-girih-band">
        <GirihField className="nx-sv-girih" />
        <div className="nx-sv-wrap relative">
          <ul className="nx-sv-ledger">
            {ledger.map((l) => (
              <li key={l.en}>
                <b className="nx-sv-ledger-v">{typeof l.v === "number" ? l.v : dash}</b>
                <span className="nx-sv-ledger-k">{ar ? l.ar : l.en}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── أطروحات المناطق — كل منطقة صفحة مزدوجة في التقرير ─────────── */}
      <section className="nx-sv-wrap nx-sv-regions">
        <h2 className="nx-sv-h2">{ar ? "المناطق الأربع" : "The four regions"}</h2>
        <div className="grid gap-px sm:grid-cols-2">
          {REGIONS.map((region, i) => {
            const panel = CC_REGIONS[region.id];
            const pct = live[region.id];
            const active = region.id === regionId;
            return (
              <button
                key={region.id}
                type="button"
                onClick={() => setRegion(region.id)}
                aria-pressed={active}
                className="nx-sv-spread text-start"
                style={{ ["--sv-accent" as string]: REGION_ACCENT_HEX[region.id] }}
              >
                <span className="nx-sv-spread-no">{String(i + 1).padStart(2, "0")}</span>
                <span className="nx-sv-spread-head">
                  <b className="nx-sv-spread-name">{ar ? region.shortAr : region.shortEn}</b>
                  {active && <i className="nx-sv-mark">{ar ? "الحالية" : "current"}</i>}
                </span>
                <span className="nx-sv-spread-sub">{ar ? panel.subtitleAr : panel.subtitleEn}</span>

                <span className="nx-sv-spread-pct">
                  {pct === undefined ? (
                    <i className="nx-sv-nm">{ar ? "لم يُقَس" : "not measured"}</i>
                  ) : (
                    <>
                      {Math.round(pct)}
                      <em className="nx-sv-pct-sign">%</em>
                    </>
                  )}
                </span>

                <span className="nx-sv-rule" />

                <span className="nx-sv-table">
                  {CC_REGION_METRICS.map((m) => (
                    <span key={m.key} className="nx-sv-row">
                      <i className="nx-sv-row-k">{ar ? m.ar : m.en}</i>
                      <i className="nx-sv-row-dots" aria-hidden />
                      <b className="nx-sv-row-v">{panel.metrics[m.key]}</b>
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── جدول المبادرات — تقرير سنوي بشعيرات ذهبية ──────────────────── */}
      <section className="nx-sv-wrap nx-sv-initiatives">
        <h2 className="nx-sv-h2">{ar ? "المبادرات الجارية" : "Running initiatives"}</h2>
        <table className="nx-sv-tbl">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th>{ar ? "المبادرة" : "Initiative"}</th>
              <th className="hidden sm:table-cell">{ar ? "المنطقة" : "Region"}</th>
              <th className="text-end">{ar ? "الإنجاز" : "Progress"}</th>
            </tr>
          </thead>
          <tbody>
            {REGIONS.flatMap((region) =>
              CC_REGIONS[region.id].initiatives.map((it) => ({ region, it })),
            ).map(({ region, it }, i) => (
              <tr key={`${region.id}-${it.en}`}>
                <td className="nx-sv-num">{String(i + 1).padStart(2, "0")}</td>
                <td className="font-semibold">{ar ? it.ar : it.en}</td>
                <td className="hidden sm:table-cell text-[color:var(--ink-2)]">
                  {ar ? region.shortAr : region.shortEn}
                </td>
                <td className="text-end">
                  <span className="nx-sv-progress" style={{ ["--sv-p" as string]: `${it.pct}%` }}>
                    <b className="nx-sv-num">{it.pct}%</b>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="nx-sv-wrap nx-sv-foot">
        <span>{ar ? "بيانات محاكاة مرجعية" : "Reference simulation"}</span>
        <span className="nx-sv-foot-rule" aria-hidden />
        <span>{ar ? "ما لم يُقَس يُقرأ «لم يُقَس»" : "unmeasured reads “not measured”"}</span>
      </footer>
    </main>
  );
}

export default NxSovereignPage;
