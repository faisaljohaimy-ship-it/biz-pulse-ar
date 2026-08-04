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
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FlaskConical } from "lucide-react";
import { HomeTopNav } from "@/components/nav/HomeTopNav";
import { HoloVideoEngine } from "@/components/home/HoloVideoEngine";
import { RegionRosette } from "@/components/blueprint/RegionRosette";
import { PRODUCT_BRAND } from "@/lib/domain";
import { InstrumentPanel, MeasureRail } from "@/components/blueprint/InstrumentPanels";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

/** مراحل خط القرارات — أسماؤها العربية المعتمدة. */
const STAGE_AR: Record<string, string> = {
  proposed: "مقترح",
  prepared: "مجهّز",
  approved: "معتمد",
};

/** لهجات بطاقات الوكلاء — أسماء رموز من طبقة الرموز، لا ألوان نهائية. */
const AGENT_HUES = [
  "var(--tone-cyan)",
  "var(--tone-blue)",
  "var(--tone-violet)",
  "var(--tone-emerald)",
] as const;

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
  const notMeasured = ar ? "لم يُقَس" : "not measured";
  const simulation = data?.simulation ?? true;

  /** نسختان متتاليتان لشريط يلفّ بلا قطع — الثانية زينة محضة. */
  const pipeline = data?.pipeline ?? [];
  const ticker = pipeline.length ? [...pipeline, ...pipeline] : [];

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
      to: "/nx-flow",
    },
    {
      label: ar ? "بانتظار الاعتماد" : "Pending approval",
      value: counters?.proposals_pending ?? null,
      ceiling: 12,
      glyph: "segment" as const,
      accent: "245, 158, 11",
      caption: ar ? "مقترحات موقوفة على قرار بشري" : "Proposals held for a human decision",
      to: "/nx-ops",
    },
    {
      label: ar ? "منجز اليوم" : "Completed today",
      value: counters?.done_today ?? null,
      ceiling: 24,
      glyph: "nest" as const,
      accent: "52, 211, 153",
      caption: ar ? "مهامّ أُغلقت منذ بداية اليوم" : "Tasks closed since the day began",
      to: "/nx-ops",
    },
  ];

  return (
    <main
      className="nx-bp-surface relative min-h-screen overflow-hidden bg-[color:var(--surface)] text-[color:var(--ink)]"
      data-pending={isPending || undefined}
    >
      {/* الأساس الهولوغرامي الحي: الفيلم الصامت + الغطاء + النسيج — كل ما
          فوقه من زجاج يرى حركته عبر backdrop-filter، وتوهّجاته ترث لونها
          من عيّنة الفيديو الحية (--live-rgb). */}
      <HoloVideoEngine />

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

      {/* الشفق اللوني — الفن عامل رئيسي لا خلفية: أربع هالات بألوان المناطق
          الأربع تتنفّس خلف ورق الرسم. اللون يمرّ متغيّرًا (--bp-accent) لا
          قيمة نهائية، فيبقى خاضعًا لقواعد الوضعين في الطبقة العامة. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {REGIONS.map((region, i) => (
          <span
            key={region.id}
            className="nx-bp-aurora"
            style={{
              ["--bp-accent" as string]: REGION_ACCENT_HEX[region.id],
              ["--bp-aurora-i" as string]: i,
            }}
          />
        ))}
      </div>

      {/* جمال الصدر: خيط شفق طيفي أعلى الصفحة + حزمتا ضوء مائلتان + غبار
          نجمي (صنفه معرّف في طبقة المسرح ويعمل عالميًّا). */}
      <span aria-hidden className="nx-bp-ribbon" />
      <span aria-hidden className="nx-bp-beam nx-bp-beam--a" />
      <span aria-hidden className="nx-bp-beam nx-bp-beam--b" />
      <span aria-hidden className="nx-op-dust" />

      <HomeTopNav />

      <div className="relative mx-auto w-full max-w-[1280px] px-4 pb-16 pt-4 sm:px-6">
        <header className="nx-bp-stage" style={{ ["--nx-bp-i" as string]: 0 }}>
          {/* رأس على زجاج: مع الفيلم بكامل سطوعه صار النص العاري فوق أومضاته
              دون 4.5:1 — القشرة الزجاجية تعيد التباين والفيلم يبقى ظاهرًا حولها. */}
          <div className="nx-bp-head-scrim">
            <p className="nx-bp-eyebrow text-[12px] font-bold uppercase tracking-[0.34em]">
              {ar ? "سَدِيد · السطح الهندسي" : "SADEED · Engineering surface"}
            </p>
            {/* الهوية بلسانيها من مصدرها الوحيد: العربية يمينًا والإنجليزية
                يسارًا أيًّا كانت لغة الواجهة (قرار المالك ٢٠٢٦/٠٨/٠٤). */}
            <h1
              dir="rtl"
              className="mt-2 flex flex-wrap items-baseline justify-between gap-4 text-4xl font-black leading-tight sm:text-5xl"
            >
              <span className="nx-bp-title">{PRODUCT_BRAND.ar.name}</span>
              <span className="nx-bp-title tracking-[0.06em]">{PRODUCT_BRAND.en.name}</span>
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm text-[color:var(--ink)]">
              {ar
                ? "أربع مناطق على بوصلة واحدة: الموضع في الرسم هو الموضع على الأرض، وطول القوس هو نسبة الامتثال."
                : "Four regions on one compass: position in the drawing is position on the ground, and arc length is the compliance figure."}
            </p>
          </div>
          <div className="mt-5">
            <MeasureRail label={ar ? "وحدة الرسم ٨" : "grid unit 8"} />
          </div>

          {/* شريط النبض الحي — أرقام صادقة من مصدر الحالة نفسه تملأ الصدر. */}
          <ul
            className="nx-bp-counters mt-5"
            aria-label={ar ? "عدّادات التشغيل الحية" : "Live operating counters"}
          >
            {[
              {
                ar: "وكلاء نشطون",
                en: "Active agents",
                v: counters?.agents_active,
                to: "/nx-flow",
              },
              { ar: "عاجل مفتوح", en: "Urgent open", v: counters?.urgent_open, to: "/nx-ops" },
              {
                ar: "بانتظار الاعتماد",
                en: "Pending approval",
                v: counters?.proposals_pending,
                to: "/nx-ops",
              },
              { ar: "منجز اليوم", en: "Done today", v: counters?.done_today, to: "/nx-ops" },
            ].map((k, i) => (
              <li key={k.en}>
                <Link
                  to={k.to}
                  className="nx-bp-counter nx-bp-float"
                  style={{ ["--pulse-i" as string]: i }}
                >
                  <b>{typeof k.v === "number" ? k.v : notMeasured}</b>
                  <span>{ar ? k.ar : k.en}</span>
                </Link>
              </li>
            ))}
          </ul>
        </header>

        {/* الانقسام الذهبي: 1 : 1.618 مكتوبًا في الشبكة لا مقدَّرًا بالعين. */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.618fr)] lg:items-center">
          <div
            className="nx-bp-stage mx-auto w-full max-w-[430px]"
            style={{ ["--nx-bp-i" as string]: 1 }}
          >
            {/* لوحة الفن المركزية: هالة مخروطية بألوان المناطق تدور خلف
                الوردة، ومداران متعاكسان حولها. ترتيب ألوان الهالة هو ترتيب
                البوصلة نفسه — شمالها أزرق الوسطى وشرقها أخضر الشرقية —
                فالدوران يجري على الحقيقة الجغرافية لا على الزينة. */}
            <div
              className="nx-bp-art relative"
              style={{
                ["--bp-c-n" as string]: REGION_ACCENT_HEX.central,
                ["--bp-c-e" as string]: REGION_ACCENT_HEX.eastern,
                ["--bp-c-s" as string]: REGION_ACCENT_HEX.southern,
                ["--bp-c-w" as string]: REGION_ACCENT_HEX.western,
              }}
            >
              <span aria-hidden className="nx-bp-halo" />
              <span aria-hidden className="nx-bp-orbit nx-bp-orbit--a" />
              {/* هالة فِن — مخروط ألوان المناطق الأربع يدور خلف القلب. */}
              <span aria-hidden className="nx-bp-finn-halo" />
              <RegionRosette values={compliance} activeRegion={regionId} ar={ar} />
              {/* النقر على فِن يدخل الشات — زر شفاف فوق القلب بحلقة تركيز
                  ظاهرة، فيبقى الرسم زينة والفعل عنصرًا وصولًا سليمًا. */}
              <Link
                to="/finn"
                aria-label={ar ? "افتح محادثة فِن" : "Open FINN chat"}
                title={ar ? "تحدث مع فِن" : "Talk to FINN"}
                className="nx-bp-finn-btn"
              />
            </div>
          </div>

          <div
            className="nx-bp-stage grid grid-cols-1 gap-3 sm:grid-cols-2"
            style={{ ["--nx-bp-i" as string]: 2 }}
          >
            {REGIONS.map((region, i) => {
              const pct = compliance[region.id];
              const active = region.id === regionId;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setRegion(region.id)}
                  aria-pressed={active}
                  className="nx-bp-region-btn nx-bp-card group flex min-h-14 items-center gap-3 rounded-2xl p-3 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-cyan)]"
                  style={{
                    ["--bp-accent" as string]: REGION_ACCENT_HEX[region.id],
                    ["--pulse-i" as string]: i + 4,
                  }}
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
            <Link
              key={panel.label}
              to={panel.to}
              className="nx-bp-float block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-cyan)]"
              style={{ ["--pulse-i" as string]: i + 8 }}
            >
              <InstrumentPanel
                label={panel.label}
                value={panel.value}
                ratio={gauge(panel.value, panel.ceiling)}
                glyph={panel.glyph}
                accent={panel.accent}
                caption={panel.caption}
                notMeasured={notMeasured}
                index={i}
              />
            </Link>
          ))}
        </section>

        {/* الوكلاء على المناوبة — امتداد المسرح على صدر الرئيسية. */}
        <section className="nx-bp-stage mt-8" style={{ ["--nx-bp-i" as string]: 4 }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="nx-bp-h2">{ar ? "الوكلاء على المناوبة" : "Agents on shift"}</h2>
            <Link to="/nx-ops" className="nx-bp-more">
              {ar ? "مسرح العمليات الحيّ ←" : "Ops theater →"}
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.agents ?? []).slice(0, 4).map((agent, i) => (
              <Link
                key={agent.id}
                to="/nx-ops"
                className="nx-bp-agent nx-bp-float"
                style={{
                  ["--op-hue" as string]: AGENT_HUES[i % AGENT_HUES.length],
                  ["--pulse-i" as string]: i + 11,
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="nx-bp-agent-dot" data-state={agent.status} aria-hidden />
                  <b>{agent.name_ar}</b>
                </span>
                <i>{agent.task_ar ?? (ar ? "بانتظار مهمة" : "awaiting task")}</i>
              </Link>
            ))}
          </div>
        </section>

        {/* سجل القرارات الجاري — أصناف الشريط من طبقة المسرح نفسها. */}
        <section className="nx-bp-stage mt-8" style={{ ["--nx-bp-i" as string]: 5 }}>
          <h2 className="nx-bp-h2">{ar ? "سجل القرارات — مباشر" : "Decisions — live"}</h2>
          <div className="nx-op-ticker mt-3" data-static={!pipeline.length || undefined}>
            <div className="nx-op-ticker-track">
              {ticker.map((p, i) => (
                <span
                  key={`${p.id}-${i}`}
                  className="nx-op-decision"
                  data-sev={p.severity}
                  aria-hidden={i >= pipeline.length || undefined}
                >
                  <i className="nx-op-stage">{ar ? (STAGE_AR[p.stage] ?? p.stage) : p.stage}</i>
                  <b>{p.title_ar}</b>
                  <span className="nx-op-decision-agent">{p.agent_ar}</span>
                </span>
              ))}
              {ticker.length === 0 && (
                <span className="nx-op-decision">
                  <b>{ar ? "لا قرارات جارية الآن" : "No decisions in flight"}</b>
                </span>
              )}
            </div>
          </div>
        </section>

        <footer
          className="nx-bp-stage mt-8 flex flex-wrap items-center gap-3 border-t border-[color:var(--hairline-soft)] pt-4"
          style={{ ["--nx-bp-i" as string]: 6 }}
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
