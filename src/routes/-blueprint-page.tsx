/**
 * المُخطَّط التنفيذي — السطح الهندسي لسَدِيد.
 *
 * مُودَع كمساعد غير مسار (بادئة الشرطة) ليقتطعه الموجّه من حزمة الدخول:
 * ميزانية الأداء تحت السقف بهامش ضيّق، فسطحٌ جديد لا يُحمَّل إلا عند زيارته.
 *
 * ## لغة التصميم
 *
 * **الوحدة قبل الزينة.** التخطيط كلّه يلتزم شبكة ٨px، ومسطرة أعلى الصفحة
 * تُعلن هذه الوحدة صراحةً بدل أن تُخفيها. والانقسام الأفقي `1 : 1.618` نسبة
 * ذهبية مكتوبة في الشبكة لا مصادفة بصرية.
 *
 * **الشكل يحمل معنى.** وردة المناطق بوصلة: الغربية غربًا والشرقية شرقًا
 * والجنوبية جنوبًا. الموضع معلومة، لا ترتيب حروف.
 *
 * **الحركة مسرح لا حلية.** الطبقات تدخل متتابعة بمنحنى
 * `cubic-bezier(0.16, 1, 0.3, 1)` — وهو `--nx-ease-out` المعرَّف في النظام
 * أصلًا، ونفسه الذي توصي به Remotion (`Easing.bezier`). والحركة تُكتب
 * بخصائص `translate` و`scale` المستقلّة لا بـ`transform`، إذ الأخيرة تمحو
 * أي إزاحة مركزية سابقة — قاعدة النظام وقاعدة Remotion واحدة هنا.
 *
 * **الصدق العددي (المادة ٢٧).** ما لم يُقَس يُقرأ «لم يُقَس»؛ لا قوس قيمة
 * يُرسم له ولا رقم صفري يوهم بقياس وقع.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FlaskConical } from "lucide-react";
import { HomeTopNav } from "@/components/nav/HomeTopNav";
import { RegionRosette } from "@/components/blueprint/RegionRosette";
import { InstrumentPanel, MeasureRail } from "@/components/blueprint/InstrumentPanels";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

export function BlueprintPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { regionId, setRegion } = useRegion();
  // البوابة الوحيدة `!authLoading`. لا `enabled: !!user` على قراءة عرض —
  // الزائر يرى السطح كاملًا كما يراه صاحب الجلسة.
  const { loading: authLoading } = useAuth();
  const getState = useServerFn(getCommandCenterState);

  const { data, isPending } = useQuery({
    queryKey: ["blueprint-state"],
    queryFn: () => getState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  /** صفر من الخادم يعني «لا قراءة»، لا امتثالًا صفريًّا — فلا يُدرَج. */
  const compliance = useMemo(() => {
    const out: Partial<Record<RegionId, number>> = {};
    for (const row of data?.regions ?? []) {
      if (row.compliance_pct > 0) out[row.region_id] = row.compliance_pct;
    }
    return out;
  }, [data]);

  const counters = data?.counters;
  const average =
    counters?.compliance_avg && counters.compliance_avg > 0 ? counters.compliance_avg : null;
  const notMeasured = ar ? "لم يُقَس" : "not measured";
  const simulation = data?.simulation ?? true;

  /**
   * النسبة تُشتقّ من القيمة نفسها لا من مصدر ثانٍ: لو حُسبت مستقلّةً لأمكن
   * أن يمتلئ الشكل بينما الرقم يقول «لم يُقَس» — وهو تناقض يراه المستخدم
   * ولا يراه أيّ فحص. المقام سقف عرضٍ للشكل فقط، لا يمسّ الرقم المعروض.
   */
  const gauge = (value: number | null, ceiling: number) =>
    value === null ? null : Math.min(1, value / ceiling);

  const panels = [
    {
      label: ar ? "الوكلاء النشطون" : "Active agents",
      value: counters?.agents_active ?? null,
      ceiling: 12,
      glyph: "ridge" as const,
      accent: "34, 211, 238",
      caption: ar ? "وكلاء يعملون الآن على مهامّ مفتوحة" : "Agents currently working open tasks",
    },
    {
      label: ar ? "بانتظار الاعتماد" : "Pending approval",
      value: counters?.proposals_pending ?? null,
      ceiling: 12,
      glyph: "segment" as const,
      accent: "245, 158, 11",
      caption: ar ? "مقترحات موقوفة على قرار بشري" : "Proposals held for a human decision",
    },
    {
      label: ar ? "منجز اليوم" : "Completed today",
      value: counters?.done_today ?? null,
      ceiling: 24,
      glyph: "nest" as const,
      accent: "52, 211, 153",
      caption: ar ? "مهامّ أُغلقت منذ بداية اليوم" : "Tasks closed since the day began",
    },
  ];

  return (
    <main
      className="nx-bp-surface relative min-h-screen overflow-hidden bg-[color:var(--surface)] text-[color:var(--ink)]"
      data-pending={isPending || undefined}
    >
      {/* أثر الفرجار — دوائر إنشاء باهتة تحت كل شيء، بلا أي كلفة شبكية. */}
      <svg
        aria-hidden
        focusable="false"
        className="nx-bp-compass pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="50" cy="34" r="30" fill="none" stroke="currentColor" strokeWidth="0.09" />
        <circle cx="50" cy="34" r="46" fill="none" stroke="currentColor" strokeWidth="0.09" />
        <circle cx="50" cy="34" r="18.5" fill="none" stroke="currentColor" strokeWidth="0.09" />
        <line x1="0" y1="34" x2="100" y2="34" stroke="currentColor" strokeWidth="0.07" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.07" />
      </svg>

      <HomeTopNav />

      <div className="relative mx-auto w-full max-w-[1280px] px-4 pb-16 pt-4 sm:px-6">
        <header className="nx-bp-stage" style={{ ["--nx-bp-i" as string]: 0 }}>
          <p className="text-[12px] font-bold uppercase tracking-[0.34em] text-[color:var(--tone-cyan)]">
            {ar ? "سَدِيد · السطح الهندسي" : "SADEED · Engineering surface"}
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[color:var(--ink)] sm:text-4xl">
            {ar ? "المُخطَّط التنفيذي" : "The Executive Blueprint"}
          </h1>
          <p className="mt-2 max-w-[62ch] text-sm text-[color:var(--ink-2)]">
            {ar
              ? "أربع مناطق على بوصلة واحدة: الموضع في الرسم هو الموضع على الأرض، وطول القوس هو نسبة الامتثال."
              : "Four regions on one compass: position in the drawing is position on the ground, and arc length is the compliance figure."}
          </p>
          <div className="mt-5">
            <MeasureRail label={ar ? "وحدة الرسم ٨" : "grid unit 8"} />
          </div>
        </header>

        {/* الانقسام الذهبي: 1 : 1.618 مكتوبًا في الشبكة لا مقدَّرًا بالعين. */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.618fr)] lg:items-center">
          <div
            className="nx-bp-stage mx-auto w-full max-w-[380px]"
            style={{ ["--nx-bp-i" as string]: 1 }}
          >
            <RegionRosette values={compliance} average={average} activeRegion={regionId} ar={ar} />
          </div>

          <div
            className="nx-bp-stage grid grid-cols-1 gap-3 sm:grid-cols-2"
            style={{ ["--nx-bp-i" as string]: 2 }}
          >
            {REGIONS.map((region) => {
              const pct = compliance[region.id];
              const active = region.id === regionId;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setRegion(region.id)}
                  aria-pressed={active}
                  className="nx-bp-region-btn nx-bp-card group flex min-h-14 items-center gap-3 rounded-2xl p-3 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-cyan)]"
                  style={{ ["--bp-accent" as string]: REGION_ACCENT_HEX[region.id] }}
                >
                  <span aria-hidden className="nx-bp-region-bar" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-[color:var(--ink)]">
                      {ar ? region.shortAr : region.shortEn}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[color:var(--ink-3)]">
                      {ar ? region.labelAr : region.labelEn}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 tabular-nums ${
                      pct === undefined
                        ? "text-[12px] text-[color:var(--ink-3)]"
                        : "text-lg font-black text-[color:var(--ink)]"
                    }`}
                  >
                    {pct === undefined ? notMeasured : `${Math.round(pct)}%`}
                  </span>
                  {/* الحالة النشطة لا تُقال باللون وحده: شارة نصّية تصحبها. */}
                  {active && (
                    <span className="shrink-0 rounded-md border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] px-1.5 py-0.5 text-[12px] font-semibold text-[color:var(--ink)]">
                      {ar ? "الحالية" : "current"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="nx-bp-stage mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          style={{ ["--nx-bp-i" as string]: 3 }}
        >
          {panels.map((panel, i) => (
            <InstrumentPanel
              key={panel.label}
              label={panel.label}
              value={panel.value}
              ratio={gauge(panel.value, panel.ceiling)}
              glyph={panel.glyph}
              accent={panel.accent}
              caption={panel.caption}
              notMeasured={notMeasured}
              index={i}
            />
          ))}
        </section>

        <footer
          className="nx-bp-stage mt-8 flex flex-wrap items-center gap-3 border-t border-[color:var(--hairline-soft)] pt-4"
          style={{ ["--nx-bp-i" as string]: 4 }}
        >
          {simulation && (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] px-3 text-[12px] text-[color:var(--ink-2)]">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              {ar ? "بيانات محاكاة مرجعية" : "Reference simulation"}
            </span>
          )}
          <span className="text-[12px] text-[color:var(--ink-3)]">
            {ar
              ? "الأرقام من مصدر النظام الحيّ. ما لا يصل منه يُقرأ «لم يُقَس» — لا يُستبدل بصفر."
              : "Figures come from the live system source. Whatever does not arrive reads “not measured” — never a substituted zero."}
          </span>
        </footer>
      </div>
    </main>
  );
}

export default BlueprintPage;
