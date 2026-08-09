/**
 * المُخطَّط التنفيذي — السطح الهندسي لسَدِيد.
 *
 * مُودَع كمساعد غير مسار (بادئة الشرطة) ليقتطعه الموجّه من حزمة الدخول:
 * ميزانية الأداء تحت السقف بهامش ضيّق، فسطحٌ جديد لا يُحمَّل إلا عند زيارته.
 *
 * ## لغة التصميم
 *
 * **الوحدة قبل الزينة.** التخطيط كلّه يلتزم شبكة ٨px. (مسطرة الوحدة المعلنة
 * أعلى الصفحة أُزيلت بقرار المالك ٢٠٢٦/٠٨/٠٩ مع عدّاداتها الأربعة.)
 *
 * **الصدر ثلاثة أعمدة (أمر المالك ٢٠٢٦/٠٨/٠٩):** «المناطق الأربع فاليمين
 * مستطيلة وسَدِيد فالمنتصف وتحليلات سَدِيد + التنبيهات فاليسار». والصفحة
 * `rtl`، فاليمين هو الطرف المنطقي `start` واليسار `end`: الترتيب يُكتب
 * ترتيبَ خلايا في الشبكة — منطقيًّا لا فيزيائيًّا — فينقلب وحده على الواجهة
 * الإنجليزية، ويتكدّس على الجوال بالترتيب نفسه لأنه ترتيب DOM.
 *
 * (وردة المناطق البوصلية حُذفت في الأمر نفسه: سُئل المالك عنها فأجاب
 * «تحذف». ومعناها — الموضع في الرسم هو الموضع على الأرض — لم يُنقَل إلى
 * بديلٍ يدّعيه: البطاقات المستطيلة قائمة لا خريطة، فلا تقول عن الموضع شيئًا
 * ولا تكذب فيه.)
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
import { PRODUCT_BRAND } from "@/lib/domain";
import { InstrumentPanel } from "@/components/blueprint/InstrumentPanels";
import { PulseGlyph } from "@/components/pulse/PulseGlyph";
import { getCommandCenterState, type CommandSeverity } from "@/lib/exec/command-center.functions";
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
import { SadeedUsageAnalytics } from "@/components/sadeed/SadeedUsageAnalytics";
import { SadeedAnomalyStrip } from "@/components/sadeed/SadeedAnomalyStrip";

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

/**
 * حالة المنطقة ⇄ النغمة.
 *
 * الحالة **تُقرأ من الخادم** (`regions[].severity`) ولا تُشتقّ من نسبة
 * الامتثال: اشتقاقها كان سيعني اختراع عتبات لا مصدر لها، ثم عرضها حكمًا
 * كأنّه قياس (المادة ٢٧). وما لم يصل صفُّ المنطقة أصلًا فلا حالة لها —
 * تُقرأ «لم يُقَس»، لا «سليم».
 *
 * والشدّة نفسها من `STAT_TONES` وحده: أحمر بمثمّن «خطر» · كهرماني بمثلث
 * «تحذير» · أخضر بدائرة «سليم» (WCAG 2.2 §1.4.1) — لا تُعاد كتابتها هنا.
 */
const REGION_SEVERITY_TONE: Record<CommandSeverity, StatTone> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  healthy: "success",
  idle: "default",
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

  /**
   * حالة المنطقة كما تُعرض: نغمة `STAT_TONES` + كلمتها.
   *
   * ثلاث حالات لا اثنتان — والفرق بينها هو موضع المادة ٢٧ كلّه:
   * ① لا صفَّ للمنطقة أصلًا ⇐ «لم يُقَس»، لا «سليم» ولا نغمة تُطمئن.
   * ② صفٌّ بشدّة معروفة ⇐ نغمتها وشكلها وكلمتها من `STAT_TONES`.
   * ③ صفٌّ بشدّة لا تقابل إنذارًا (`idle`) ⇐ «بلا تصنيف»: قياسٌ وقع ولم
   *    يُنتج حكمًا، فلا يُقال عنه «لم يُقَس» ولا يُرفع إلى «سليم».
   */
  const regionStatus = (id: RegionId) => {
    const row = regionRows.find((r) => r.region_id === id);
    if (!row) return { tone: STAT_TONES.default, label: notMeasured };
    const tone = STAT_TONES[REGION_SEVERITY_TONE[row.severity]];
    return { tone, label: tone.badge ?? (ar ? "بلا تصنيف" : "unclassified") };
  };

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

      {/* (أثر الفرجار — دوائر الإنشاء الثلاث والخطّان المتقاطعان
          (`.nx-bp-compass`) — أُزيل بأمر المالك ٢٠٢٦/٠٨/٠٩: «قم بإزالة
          البوصلة وعبارتها». كان يرسم مركزَ بوصلةٍ عند 50٪/34٪ — موضع الوردة
          المحذوفة — فبقاؤه بعدها يشير إلى مركزٍ لم يعد فيه شيء.) */}

      {/* الشفق اللوني وخيطه وحزمتا الضوء حُذفت (قرار المالك ٢٠٢٦/٠٨/٠٩، تاليًا
          لحذف الوردة والبوصلة). أربع هالات مخروطية بألوان المناطق كانت تدور
          خلف السطح، فتُقرأ بوصلةً ثانية بعد أن حُذفت الأولى — وهي زخرفة لا
          تحمل معنًى: ترتيب ألوانها لم يكن يقول عن المنطقة شيئًا يُقاس.
          والغبار النجمي بقي: صنفه `nx-op-dust` معرَّف في طبقة المسرح وله
          مستهلكون آخرون، ونسيجُه ساكن لا يدور. */}

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
                ? "المناطق الأربع وحالتها على طرف، وسَدِيد في الوسط، وتحليلاته وتنبيهاته على الطرف المقابل — سطح واحد بلا تنقّل."
                : "The four regions and their status on one side, SADEED in the middle, and its analytics and alerts on the other — one surface, no navigation."}
            </p>
          </div>
        </header>

        {/* ════ صدر الصفحة — ثلاثة أعمدة (أمر المالك ٢٠٢٦/٠٨/٠٩) ═══════════
            المناطق `start` · سَدِيد وسطًا · تحليلاته وتنبيهاته `end`.
            الشبكة معرَّفة في `.nx-home-triad` بأعمدة منطقية لا فيزيائية،
            فترتيب DOM هو ترتيب العرض في الاتجاهين، وهو نفسه ترتيب التكديس
            على الجوال (عمود واحد دون `lg`). */}
        <section className="nx-home-triad mt-8">
          {/* ── يمينًا (start) · المناطق الأربع بطاقات مستطيلة ───────────── */}
          <section
            className="nx-bp-stage"
            style={{ ["--nx-bp-i" as string]: 1 }}
            aria-labelledby="nx-regions-heading"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="nx-bp-h2" id="nx-regions-heading">
                {ar ? "المناطق الأربع" : "The four regions"}
              </h2>
              {simulation && <SimChip ar={ar} />}
            </div>
            {/* الأسماء والترتيب واللكنات من `regions.ts` وحده — لا حرف منها
                مكتوب هنا (المرجع الجغرافي الوحيد). */}
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {REGIONS.map((region, i) => {
                const pct = compliance[region.id];
                const active = region.id === regionId;
                const { tone, label } = regionStatus(region.id);
                const ToneIcon = tone.icon;
                return (
                  <li key={region.id}>
                    {/* كل منطقة تفتح على معلوماتها في القمرة الموحدة (قرار
                        المالك)، والاختيار العام يواكب الوجهة قبل الانتقال.
                        بلا `nx-bp-card` عمدًا — انظر تعليل بطاقات الشدّة:
                        زجاجها قاعدةٌ خارج الطبقات فتمحو خلفية النغمة وحدّها
                        فيستوي «خطر» و«تحذير». الأساس `.nx-home-region` ولا
                        يكتب `background` ولا `border-color`. */}
                    <Link
                      to="/nx-cockpit"
                      search={{ region: region.id }}
                      onClick={() => setRegion(region.id)}
                      aria-label={ar ? `افتح معلومات ${region.labelAr}` : `Open ${region.labelEn}`}
                      className={`nx-home-region flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-cyan)] ${tone.card}`}
                      style={{
                        ["--bp-accent" as string]: REGION_ACCENT_HEX[region.id],
                        ["--pulse-i" as string]: i + 4,
                      }}
                    >
                      {/* شعيرة لكنة المنطقة — هوية المنطقة على حافة البطاقة،
                          وخلفيتها وحدّها مملوكان للنغمة. تُمزج نحو الحبر في
                          الوضع الفاتح (`--bp-accent-eff`) وإلا سقطت دون 3:1. */}
                      <span aria-hidden className="nx-home-accent" />
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
                        {/* الحالة: شكلٌ وكلمة معًا — مثمّن «خطر» · مثلث
                            «تحذير» · دائرة «سليم» — فلا يحملها اللون وحده. */}
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {ToneIcon && (
                            <ToneIcon aria-hidden className={`h-4 w-4 shrink-0 ${tone.iconCls}`} />
                          )}
                          <span className={`nx-dash-chip border ${tone.badgeCls}`}>{label}</span>
                          {/* الحالة النشطة لا تُقال باللون وحده كذلك. */}
                          {active && (
                            <span className="nx-dash-chip border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] text-[color:var(--ink)]">
                              {ar ? "الحالية" : "current"}
                            </span>
                          )}
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ── وسطًا · المساعد ───────────────────────────────────────────
              فتحة تركيب لا مكوّن: المساعد يُبنى في مسار مستقل ويُركَّب هنا.
              الحاوية تنطوي كلّيًّا وهي فارغة (`.nx-dash-slot:empty`) — فلا
              صندوق فارغ ولا فجوة قبل أن يصلها المكوّن.
              لا تُستورد هنا أي وحدة كوبايلوت: الاستيراد يجرّ الحزمة إلى مسار
              الدخول ويكسر ميزانية الأداء قبل أن يصل المكوّن أصلًا. */}
          <section
            id="sadeed-assistant-slot"
            data-slot="assistant"
            aria-label={ar ? `المساعد ${PRODUCT_BRAND.assistantName}` : PRODUCT_BRAND.en.name}
            className="nx-dash-slot nx-bp-stage w-full"
            style={{ ["--nx-bp-i" as string]: 2 }}
          >
            <SadeedStagePresence />
          </section>

          {/* ── يسارًا (end) · تحليلات سَدِيد ثم تنبيهاته ─────────────────
              الاثنان يقرآن لقطة محاكاة حتمية موسومة بشارتها الخاصة
              (`SimBadge`)، فلا يُنسب إليهما قياس حيّ. */}
          <div className="nx-bp-stage flex flex-col gap-4" style={{ ["--nx-bp-i" as string]: 3 }}>
            <SadeedUsageAnalytics />
            <SadeedAnomalyStrip />
          </div>
        </section>

        <section
          className="nx-bp-stage mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          style={{ ["--nx-bp-i" as string]: 4 }}
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
          style={{ ["--nx-bp-i" as string]: 5 }}
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
