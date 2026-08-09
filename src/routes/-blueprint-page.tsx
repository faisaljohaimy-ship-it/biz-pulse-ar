/**
 * المُخطَّط التنفيذي — السطح الهندسي لسَدِيد.
 *
 * مُودَع كمساعد غير مسار (بادئة الشرطة) ليقتطعه الموجّه من حزمة الدخول:
 * ميزانية الأداء تحت السقف بهامش ضيّق، فسطحٌ جديد لا يُحمَّل إلا عند زيارته.
 *
 * ## لغة التصميم
 *
 * **الوحدة قبل الزينة.** التخطيط كلّه يلتزم شبكة ٨px، والانقسام الأفقي
 * `1 : 1.618` نسبة ذهبية مكتوبة في الشبكة لا مصادفة بصرية. (مسطرة الوحدة
 * المعلنة أعلى الصفحة أُزيلت بقرار المالك ٢٠٢٦/٠٨/٠٩ مع عدّاداتها الأربعة.)
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
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { HoloVideoEngine } from "@/components/home/HoloVideoEngine";
import { RegionRosette } from "@/components/blueprint/RegionRosette";
import { PRODUCT_BRAND } from "@/lib/domain";
import { InstrumentPanel } from "@/components/blueprint/InstrumentPanels";
import { PulseGlyph } from "@/components/pulse/PulseGlyph";
import { getCommandCenterState } from "@/lib/exec/command-center.functions";
import { getRiskBoard, type RiskSeverity } from "@/lib/exec/risk-board.functions";
// نغمات الشدّة تُستهلك من مصدرها المحروس (`stat-tone.contract.test.ts`) ولا
// تُعاد كتابتها هنا: أحمر بمثمّن «خطر» · كهرماني بمثلث «تحذير» · أخضر
// بدائرة «سليم». الشكل والكلمة يحملان المعنى، فاللون ليس ناقله الوحيد
// (WCAG 2.2 §1.4.1).
import { STAT_TONES, type StatTone } from "@/components/sec/sec-shell";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGIONS, REGION_ACCENT_HEX, getRegion, type RegionId } from "@/lib/regions";
import { SadeedStagePresence } from "@/components/sadeed/SadeedStagePresence";

/** مراحل خط القرارات — أسماؤها العربية المعتمدة. */
const STAGE_AR: Record<string, string> = {
  proposed: "مقترح",
  prepared: "مجهّز",
  approved: "معتمد",
};

/** الشدّة ⇄ النغمة: تقابل واحدة بواحدة، فلا شدّة بلا شكل يميّزها. */
const SEVERITY_TONE: Record<RiskSeverity, StatTone> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

const SEVERITY_LABEL: Record<RiskSeverity, { ar: string; en: string }> = {
  high: { ar: "عالية", en: "High" },
  medium: { ar: "متوسطة", en: "Medium" },
  low: { ar: "منخفضة", en: "Low" },
};

const SEVERITY_ORDER: RiskSeverity[] = ["high", "medium", "low"];

/** شارة المحاكاة — نصّها ومظهرها واحد أينما ظهرت على هذا السطح. */
function SimChip({ ar }: { ar: boolean }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] px-3 text-[12px] text-[color:var(--ink-2)]">
      <FlaskConical className="h-3.5 w-3.5" aria-hidden />
      {ar ? "بيانات محاكاة مرجعية" : "Reference simulation"}
    </span>
  );
}

export function BlueprintPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { regionId, setRegion } = useRegion();
  // البوابة الوحيدة `!authLoading`. لا `enabled: !!user` على قراءة عرض —
  // الزائر يرى السطح كاملًا كما يراه صاحب الجلسة.
  const { loading: authLoading } = useAuth();
  const getState = useServerFn(getCommandCenterState);
  const getRisks = useServerFn(getRiskBoard);

  const { data, isPending } = useQuery({
    queryKey: ["blueprint-state"],
    queryFn: () => getState(),
    enabled: !authLoading,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  /** سجل المخاطر — نفس بوابة القراءة: `!authLoading` وحدها، لا `!!user`. */
  const { data: risk } = useQuery({
    queryKey: ["blueprint-risk-board"],
    queryFn: () => getRisks(),
    enabled: !authLoading,
    staleTime: 60_000,
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
      beatSeconds: 0.82,
      accent: "34, 211, 238",
      caption: ar ? "وكلاء يعملون الآن على مهامّ مفتوحة" : "Agents currently working open tasks",
      to: "/nx-flow",
    },
    {
      label: ar ? "بانتظار الاعتماد" : "Pending approval",
      value: counters?.proposals_pending ?? null,
      ceiling: 12,
      beatSeconds: 0.94,
      accent: "245, 158, 11",
      caption: ar ? "مقترحات موقوفة على قرار بشري" : "Proposals held for a human decision",
      to: "/nx-ops",
    },
    {
      label: ar ? "منجز اليوم" : "Completed today",
      value: counters?.done_today ?? null,
      ceiling: 24,
      beatSeconds: 1.06,
      accent: "52, 211, 153",
      caption: ar ? "مهامّ أُغلقت منذ بداية اليوم" : "Tasks closed since the day began",
      to: "/nx-ops",
    },
  ];

  /* ── شبكة بطاقات الداشبورد ────────────────────────────────────────────
     مؤشرات تنفيذية للأمن الصناعي عبر المناطق الأربع. كل قيمة تأتي من
     `getCommandCenterState` — عدّاداتها أو صفوف مناطقها — وما لم يصل يُقرأ
     «لم يُقَس» لا صفرًا (المادة ٢٧).

     التمييز المقصود: صفرٌ **مقيس** (وصلت الصفوف وعُدّت فكانت صفرًا) يُعرض
     رقمًا؛ وغيابُ الصفوف أصلًا يُعرض نصًّا. لذلك الشرط على وجود الصفوف لا
     على قيمة المجموع. الاستثناء الوحيد الامتثال: صفرُه من الخادم يعني «لا
     قراءة» — وهي القاعدة المكتوبة أصلًا في هذا الملف أعلاه. */
  const regionRows = data?.regions ?? [];
  const measuredCompliance = regionRows.filter((r) => r.compliance_pct > 0);
  const rankCompliance = (dir: 1 | -1) =>
    measuredCompliance.length
      ? measuredCompliance.reduce((best, row) =>
          (row.compliance_pct - best.compliance_pct) * dir > 0 ? row : best,
        )
      : null;
  const topRegion = rankCompliance(1);
  const lowRegion = rankCompliance(-1);
  const regionName = (id: RegionId) => (ar ? getRegion(id).shortAr : getRegion(id).shortEn);

  const dashCards: Array<{
    key: string;
    label: string;
    value: number | null;
    suffix?: string;
    caption: string;
  }> = [
    {
      key: "compliance",
      label: ar ? "متوسط الامتثال" : "Average compliance",
      value: counters && counters.compliance_avg > 0 ? counters.compliance_avg : null,
      suffix: "%",
      caption: ar ? "متوسط المناطق الأربع مجتمعة" : "Mean across the four regions",
    },
    {
      key: "incidents",
      label: ar ? "البلاغات المفتوحة" : "Open incidents",
      value: regionRows.length ? regionRows.reduce((s, r) => s + r.incidents_open, 0) : null,
      caption: ar ? "بلاغات لم تُغلق في المناطق كلّها" : "Incidents not yet closed, all regions",
    },
    {
      key: "urgent",
      label: ar ? "المهامّ العاجلة" : "Urgent tasks",
      value: counters?.urgent_open ?? null,
      caption: ar ? "مهامّ داخل مهلة استجابة سارية" : "Tasks inside a live response window",
    },
    {
      key: "support",
      label: ar ? "طلبات المساندة" : "Support requests",
      value: counters?.support_processing ?? null,
      caption: ar ? "طلبات قيد المعالجة الآن" : "Requests in processing right now",
    },
    {
      key: "top-region",
      label: ar ? "أعلى منطقة امتثالًا" : "Highest compliance",
      value: topRegion?.compliance_pct ?? null,
      suffix: "%",
      caption: topRegion
        ? regionName(topRegion.region_id)
        : ar
          ? "لا منطقة مقيسة بعد"
          : "No measured region yet",
    },
    {
      key: "low-region",
      label: ar ? "أدنى منطقة امتثالًا" : "Lowest compliance",
      value: lowRegion?.compliance_pct ?? null,
      suffix: "%",
      caption: lowRegion
        ? regionName(lowRegion.region_id)
        : ar
          ? "لا منطقة مقيسة بعد"
          : "No measured region yet",
    },
  ];

  /* ── المخاطر (البند ١٢ب · «الاثنان معًا») ──────────────────────────────
     البطاقات المجمّعة والجدول يقرآن **الصفوف نفسها**: العدّ مشتقٌّ من
     `risk.rows` لا من حقل عدّ مستقل، فيستحيل أن تقول البطاقة رقمًا ويعرض
     الجدول تحتها غيره. */
  const riskRows = risk?.rows ?? [];
  const riskMeasured = risk !== undefined;
  const countBySeverity = (s: RiskSeverity) => riskRows.filter((r) => r.severity === s).length;
  const countByRegion = (id: RegionId) => riskRows.filter((r) => r.region_id === id).length;
  const unassignedRisks = riskRows.filter((r) => r.region_id === null).length;
  const sortedRiskRows = [...riskRows].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
      a.ref.localeCompare(b.ref, "en"),
  );
  const recommendations = risk?.recommendations ?? [];
  const riskSimulation = risk?.simulation ?? true;

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

      {/* حُذف الشريط العلوي (قرار المالك ٢٠٢٦/٠٨/٠٩، البند ١٢). مبدّل الوضع
          كان يركبه وحده على هذه الصفحة — وهي خارج القشرة فلا `TopUtilityBar`
          لها — فبقي مركّبًا هنا وإلا سقط الوضع الفاتح (المادة ٣٢). */}
      <div className="relative z-20 flex justify-end px-4 pt-3 sm:px-6">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-4 pb-16 pt-4 sm:px-6">
        <header className="nx-bp-stage" style={{ ["--nx-bp-i" as string]: 0 }}>
          {/* رأس على زجاج: مع الفيلم بكامل سطوعه صار النص العاري فوق أومضاته
              دون 4.5:1 — القشرة الزجاجية تعيد التباين والفيلم يبقى ظاهرًا حولها. */}
          <div className="nx-bp-head-scrim">
            {/* الهوية بلسانيها من مصدرها الوحيد: العربية يمينًا والإنجليزية
                يسارًا أيًّا كانت لغة الواجهة (قرار المالك ٢٠٢٦/٠٨/٠٤). */}
            <h1
              dir="rtl"
              className="mt-2 flex flex-wrap items-baseline justify-between gap-4 text-4xl font-black leading-tight sm:text-5xl"
            >
              <span className="nx-bp-title">{PRODUCT_BRAND.ar.name}</span>
              <span className="nx-bp-title tracking-[0.06em]">{PRODUCT_BRAND.en.name}</span>
            </h1>
            {/* تعريف المنتج أولًا (بند المالك ٢٠٢٦/٠٨/٠٩): ما هو سَدِيد قبل
                كيف يُقرأ رسمه. أسماء المناطق مشتقّة من `regions.ts` — المرجع
                الجغرافي الوحيد — فلا تُكتب يدويًّا ولا تتخلّف عن مصدرها. */}
            <p className="nx-bp-lede mt-3">
              {ar
                ? `مساعد ذكاء اصطناعي يعطي رؤية تنفيذية على الأمن الصناعي في جميع المناطق — ${REGIONS.map((r) => r.shortAr).join(" · ")} — من سطح واحد.`
                : `An AI assistant giving executive visibility into industrial security across all regions — ${REGIONS.map((r) => r.shortEn).join(" · ")} — from a single surface.`}
            </p>
            <p className="mt-2 max-w-[62ch] text-sm text-[color:var(--ink)]">
              {ar
                ? "أربع مناطق على بوصلة واحدة: الموضع في الرسم هو الموضع على الأرض، وطول القوس هو نسبة الامتثال."
                : "Four regions on one compass: position in the drawing is position on the ground, and arc length is the compliance figure."}
            </p>
          </div>
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
              {/* هالة المساعد — مخروط ألوان المناطق الأربع يدور خلف القلب.
                  الصنف يبقى `nx-bp-sadeed-*`: معرّف آلة لا اسم عرض. */}
              <span aria-hidden className="nx-bp-sadeed-halo" />
              <RegionRosette values={compliance} activeRegion={regionId} ar={ar} />
              {/* النقر على قلب الوردة يدخل محادثة المساعد — زر شفاف فوق القلب
                  بحلقة تركيز ظاهرة، فيبقى الرسم زينة والفعل عنصرًا وصولًا
                  سليمًا. الاسم المعروض من `PRODUCT_BRAND` وحده (توحيد اسم
                  المساعد على «سَدِيد» — قرار المالك ٢٠٢٦/٠٨/٠٩)؛ المسار
                  `/sadeed` معرّف توجيه لا يراه مستخدم فيبقى كما هو. */}
              <Link
                to="/sadeed"
                aria-label={
                  ar
                    ? `افتح محادثة ${PRODUCT_BRAND.assistantName}`
                    : `Open ${PRODUCT_BRAND.en.name} chat`
                }
                title={
                  ar ? `تحدث مع ${PRODUCT_BRAND.assistantName}` : `Talk to ${PRODUCT_BRAND.en.name}`
                }
                className="nx-bp-sadeed-btn"
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
                /* كل منطقة تفتح على معلوماتها في القمرة الموحدة (قرار المالك)،
                   والاختيار العام يواكب الوجهة قبل الانتقال. */
                <Link
                  key={region.id}
                  to="/nx-cockpit"
                  search={{ region: region.id }}
                  onClick={() => setRegion(region.id)}
                  aria-label={ar ? `افتح معلومات ${region.labelAr}` : `Open ${region.labelEn}`}
                  className="nx-bp-region-btn nx-bp-card group flex min-h-14 items-center gap-3 rounded-2xl p-3 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-cyan)]"
                  style={{
                    ["--bp-accent" as string]: REGION_ACCENT_HEX[region.id],
                    ["--pulse-i" as string]: i + 4,
                  }}
                >
                  {/* أيقونة المنطقة — دائرة نبض بلون المنطقة نفسه، وقوسها
                      نسبة الامتثال المعروضة إلى جوارها. لم تُقَس ⇐ لا قوس
                      (المادة ٢٧)، والدائرة تنبض لأن المنطقة حيّة لا لأنها
                      مقيسة. الإيقاع يتفاوت بالترتيب فلا تخفق الأربع معًا. */}
                  <PulseGlyph
                    accent={REGION_ACCENT_HEX[region.id]}
                    beatSeconds={0.86 + i * 0.11}
                    size={32}
                    ratio={pct === undefined ? null : pct / 100}
                  />
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
                </Link>
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
                beatSeconds={panel.beatSeconds}
                accent={panel.accent}
                caption={panel.caption}
                notMeasured={notMeasured}
                index={i}
              />
            </Link>
          ))}
        </section>

        {/* ════ ١ · شبكة بطاقات الداشبورد ════════════════════════════════
            عودة لوحة المؤشرات إلى الرئيسية (قرار المالك ٢٠٢٦/٠٨/٠٩ · البند ٩).
            القيم من `getCommandCenterState` وحدها، والغياب نصّ لا صفر. */}
        <section
          className="nx-bp-stage mt-8"
          style={{ ["--nx-bp-i" as string]: 4 }}
          aria-labelledby="nx-dash-heading"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="nx-bp-h2" id="nx-dash-heading">
              {ar ? "لوحة المؤشرات التنفيذية" : "Executive indicators"}
            </h2>
            {simulation && <SimChip ar={ar} />}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dashCards.map((card) => (
              <div key={card.key} className="nx-bp-card nx-dash-card rounded-2xl p-4">
                <div className="nx-dash-label">{card.label}</div>
                <div className="nx-dash-value text-[color:var(--ink)]">
                  {card.value === null ? (
                    <span className="nx-dash-absent">{notMeasured}</span>
                  ) : (
                    <span className="tabular-nums">
                      {card.value}
                      {card.suffix ?? ""}
                    </span>
                  )}
                </div>
                <div className="nx-dash-caption">{card.caption}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ════ ٤ · موضع المساعد — منتصف الصفحة ═══════════════════════════
            فتحة تركيب لا مكوّن: المساعد يُبنى في مسار مستقل، ويُركَّب هنا
            داخل الحاوية أدناه. الحاوية مركزية بعرض مضبوط وتنطوي كلّيًّا وهي
            فارغة (`.nx-dash-slot:empty { display: none }`) — فلا صندوق فارغ
            ولا فجوة رأسية على الإنتاج قبل أن يصلها المكوّن.
            لا تُستورد هنا أي وحدة كوبايلوت: الاستيراد يجرّ الحزمة إلى مسار
            الدخول ويكسر ميزانية الأداء قبل أن يصل المكوّن أصلًا. */}
        <section
          id="sadeed-assistant-slot"
          data-slot="assistant"
          aria-label={ar ? `المساعد ${PRODUCT_BRAND.assistantName}` : PRODUCT_BRAND.en.name}
          className="nx-dash-slot nx-bp-stage mx-auto mt-8 w-full max-w-[760px]"
          style={{ ["--nx-bp-i" as string]: 5 }}
        >
          <SadeedStagePresence />
        </section>

        {/* ════ ٢ · توصيات سَدِيد ═════════════════════════════════════════
            كل توصية: عنوان · سبب · إجراء مقترح. مصدرها `getRiskBoard` —
            المسار الحيّ يبنيها من المعالجة المسجَّلة في صف المخاطرة نفسه ولا
            يؤلّف إجراءً، والبديل محاكاة مرجعية موسومة. */}
        <section
          className="nx-bp-stage mt-8"
          style={{ ["--nx-bp-i" as string]: 6 }}
          aria-labelledby="nx-rec-heading"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="nx-bp-h2" id="nx-rec-heading">
              {ar ? `توصيات ${PRODUCT_BRAND.assistantName}` : `${PRODUCT_BRAND.en.name} advisories`}
            </h2>
            {riskSimulation && <SimChip ar={ar} />}
          </div>
          {recommendations.length ? (
            <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {recommendations.map((rec) => {
                const tone = STAT_TONES[SEVERITY_TONE[rec.severity]];
                const ToneIcon = tone.icon;
                return (
                  /* لا `nx-bp-card` هنا عمدًا: زجاجها قاعدةٌ **خارج الطبقات**
                     فتعلو أدوات Tailwind كلّها مهما تأخّرت (قاعدة الطبقات في
                     CSS: غير المُطبَّق يسبق المُطبَّق)، فتمحو خلفية النغمة
                     وحدّها — ويبقى «خطر» و«تحذير» بلا فرق في الخلفية والحدّ.
                     الأساس هنا `.nx-dash-rec` ولا يكتب `background` ولا
                     `border-color`، فيبقى الفرق كاملًا كما يشترطه العقد. */
                  <li key={rec.id} className={`nx-dash-rec rounded-2xl border p-4 ${tone.card}`}>
                    <div className="flex items-start gap-2">
                      {ToneIcon && (
                        <ToneIcon
                          aria-hidden
                          className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconCls}`}
                        />
                      )}
                      <h3 className="nx-dash-rec-title">{rec.title_ar}</h3>
                      {tone.badge && (
                        <span className={`nx-dash-chip shrink-0 border ${tone.badgeCls}`}>
                          {tone.badge}
                        </span>
                      )}
                    </div>
                    <p className="nx-dash-rec-line">
                      <b>{ar ? "السبب: " : "Why: "}</b>
                      {rec.why_ar}
                    </p>
                    <p className="nx-dash-rec-line">
                      <b>{ar ? "الإجراء المقترح: " : "Proposed action: "}</b>
                      {rec.action_ar}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="nx-dash-empty mt-3">
              {ar ? "لا توصيات قائمة الآن." : "No advisories right now."}
            </p>
          )}
        </section>

        {/* ════ ٣ · المخاطر — بطاقات مجمّعة + جدول تفصيلي ═════════════════
            «الاثنان معًا» (اختيار المالك · البند ١٢ب). البطاقات والجدول
            يقرآن الصفوف نفسها، فلا يتناقضان. */}
        <section
          className="nx-bp-stage mt-8"
          style={{ ["--nx-bp-i" as string]: 7 }}
          aria-labelledby="nx-risk-heading"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="nx-bp-h2" id="nx-risk-heading">
              {ar ? "المخاطر" : "Risks"}
            </h2>
            {riskSimulation && <SimChip ar={ar} />}
          </div>

          {/* حسب الشدّة — النغمة من `STAT_TONES`: الشكل (مثمّن/مثلث/دائرة)
              والكلمة يحملان الشدّة، فبطاقةٌ عدّها صفرٌ تبقى مقروءة ولا
              تحتاج لونًا يُفسَّر وحده. */}
          <h3 className="nx-dash-subhead mt-4">{ar ? "حسب الشدّة" : "By severity"}</h3>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SEVERITY_ORDER.map((sev) => {
              const tone = STAT_TONES[SEVERITY_TONE[sev]];
              const ToneIcon = tone.icon;
              const count = countBySeverity(sev);
              return (
                /* بلا `nx-bp-card` — انظر التعليل في بطاقات التوصيات: زجاجها
                   خارج الطبقات فيمحو خلفية النغمة وحدّها. */
                <div key={sev} className={`nx-risk-card rounded-2xl border p-4 ${tone.card}`}>
                  <div className="flex items-center gap-1.5">
                    {ToneIcon && (
                      <ToneIcon aria-hidden className={`h-4 w-4 shrink-0 ${tone.iconCls}`} />
                    )}
                    <span className="nx-dash-label">
                      {ar
                        ? `مخاطر شدّتها ${SEVERITY_LABEL[sev].ar}`
                        : `${SEVERITY_LABEL[sev].en} severity`}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`nx-dash-value ${tone.value}`}>
                      {riskMeasured ? (
                        <span className="tabular-nums">{count}</span>
                      ) : (
                        <span className="nx-dash-absent">{notMeasured}</span>
                      )}
                    </span>
                    {tone.badge && (
                      <span className={`nx-dash-chip border ${tone.badgeCls}`}>{tone.badge}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* حسب المنطقة — الأسماء من `regions.ts`، لا حرف منها مكتوب هنا. */}
          <h3 className="nx-dash-subhead mt-5">{ar ? "حسب المنطقة" : "By region"}</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {REGIONS.map((region) => (
              <div
                key={region.id}
                className="nx-bp-card nx-risk-region rounded-2xl p-3"
                style={{ ["--bp-accent" as string]: REGION_ACCENT_HEX[region.id] }}
              >
                <div className="nx-dash-label">{ar ? region.shortAr : region.shortEn}</div>
                <div className="nx-dash-value text-[color:var(--ink)]">
                  {riskMeasured ? (
                    <span className="tabular-nums">{countByRegion(region.id)}</span>
                  ) : (
                    <span className="nx-dash-absent">{notMeasured}</span>
                  )}
                </div>
                <div className="nx-dash-caption">{ar ? "مخاطرة مسجَّلة" : "logged risks"}</div>
              </div>
            ))}
          </div>
          {riskMeasured && unassignedRisks > 0 && (
            <p className="nx-dash-empty mt-2">
              {ar
                ? `${unassignedRisks} مخاطرة بلا إسناد لمنطقة في المصدر — منطقتها تُقرأ «${notMeasured}» ولا تُخمَّن.`
                : `${unassignedRisks} risk(s) carry no region in the source — their region reads “${notMeasured}” and is never guessed.`}
            </p>
          )}

          {/* الجدول التفصيلي — رأس دلالي، والتمرير الأفقي داخل الحاوية
              وحدها: الصفحة نفسها لا تُمرَّر أفقيًّا على 390px. */}
          <h3 className="nx-dash-subhead mt-5">{ar ? "سجل المخاطر" : "Risk register"}</h3>
          <div className="nx-risk-scroll nx-bp-card mt-2 overflow-x-auto rounded-2xl">
            <table className="nx-risk-table">
              <caption className="sr-only">
                {ar
                  ? "سجل المخاطر: الخطر والمنطقة والشدّة والحالة"
                  : "Risk register: risk, region, severity, status"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{ar ? "الخطر" : "Risk"}</th>
                  <th scope="col">{ar ? "المنطقة" : "Region"}</th>
                  <th scope="col">{ar ? "الشدّة" : "Severity"}</th>
                  <th scope="col">{ar ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRiskRows.map((row) => {
                  const tone = STAT_TONES[SEVERITY_TONE[row.severity]];
                  const ToneIcon = tone.icon;
                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="nx-risk-ref">{row.ref}</span>
                        <span className="nx-risk-title">{row.title_ar}</span>
                      </td>
                      <td>
                        {row.region_id ? (
                          regionName(row.region_id)
                        ) : (
                          <span className="nx-dash-absent">{notMeasured}</span>
                        )}
                      </td>
                      <td>
                        <span className={`nx-dash-chip inline-flex border ${tone.badgeCls}`}>
                          {ToneIcon && <ToneIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />}
                          {ar ? SEVERITY_LABEL[row.severity].ar : SEVERITY_LABEL[row.severity].en}
                        </span>
                      </td>
                      <td>{row.status_ar}</td>
                    </tr>
                  );
                })}
                {sortedRiskRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="nx-dash-empty">
                      {ar ? "لم تصل صفوف المخاطر بعد." : "No risk rows have arrived yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* سجل القرارات الجاري — أصناف الشريط من طبقة المسرح نفسها. */}
        <section className="nx-bp-stage mt-8" style={{ ["--nx-bp-i" as string]: 8 }}>
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
          style={{ ["--nx-bp-i" as string]: 9 }}
        >
          {simulation && <SimChip ar={ar} />}
          {/* هذا السطر كان على الفيلم مباشرةً بلا زجاج تحته وبأخفّ درجات
              الحبر — فيمرّ تحته قوس النفق الساطع فيهبط تباينه إلى ١٫٤٢:١.
              الحلّ رفعُ الحبر درجةً ووضعُ حشوة السطح تحته (نفس علاج
              `.nx-bp-head-scrim`)، لا تعتيمُ الفيلم. */}
          <span className="nx-bp-note text-[12px] text-[color:var(--ink-2)]">
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
