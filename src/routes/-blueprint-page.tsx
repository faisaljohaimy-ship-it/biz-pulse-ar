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
 * **الصدر ثلاثة أعمدة.** أمر المالك ٢٠٢٦/٠٨/٠٩ وضع «المناطق الأربع
 * فاليمين مستطيلة وسَدِيد فالمنتصف وتحليلات سَدِيد + التنبيهات فاليسار». ثم
 * حُذف «كشف الشذوذ» (٢٠٢٦/٠٨/١٠)، ثم انتقلت التحليلات يمين المساعد، ثم
 * حُذفت هي الأخرى في اليوم نفسه واستقرّ الصدر على:
 * **المناطق يمينًا · سَدِيد وسطًا · توصيات سَدِيد يسارًا.**
 *
 * والصفحة `rtl`، فاليمين هو الطرف المنطقي `start` واليسار `end`: الترتيب
 * يُكتب ترتيبَ خلايا في الشبكة — منطقيًّا لا فيزيائيًّا — فينقلب وحده على
 * الواجهة الإنجليزية، ويتكدّس على الجوال بالترتيب نفسه لأنه ترتيب DOM.
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
 *
 * ## المداخل — WCAG 2.2 §2.4.5 «أكثر من طريق»
 *
 * الرئيسية **خارج القشرة**: لا شريط جانبي لها ولا `TopUtilityBar`، وشريطها
 * العلوي حُذف بأمر المالك ٢٠٢٦/٠٨/٠٩. فكلّ ما يصل منها إلى بقية النظام هو
 * ما يُكتب في نسيج هذه الصفحة نفسها.
 *
 * **ولم يبقَ منه إلا طبقةٌ واحدة: بطاقات المناطق الأربع** ← `/sec`
 * (كانت `/nx-cockpit?region=…` حتى حُجبت القمرة بأمر المالك ٢٠٢٦/٠٨/١٢).
 *
 * سقطت الطبقتان الأخريان بأمرَي المالك في يومين متتاليين: «لوحة المؤشرات
 * التنفيذية» (٢٠٢٦/٠٨/١٠) وكانت ستّ بطاقاتٍ روابطَ تحمل أسماء وجهاتها، ثم
 * «مداخل النظام» في التذييل (٢٠٢٦/٠٨/١١) وكانت ثمانية مداخل ثابتة **لا
 * تسقط ببيانات**.
 *
 * **والأثر يُسجَّل بصراحة ولا يُعوَّض من تلقاء النفس:** لم يبقَ من هذه
 * الصفحة طريقٌ إلى `/guide` ولا `/mission-control` ولا `/situation-room`
 * ولا `/risk` ولا `/governance` ولا `/sec/reports` ولا `/agents` ولا
 * `/sadeed` ولا `/sec/kpi` ولا `/sec/incidents` ولا `/urgent-ops` — تُبلَغ
 * كلّها من الشريط الجانبي وخريطة النظام في بقيّة القشرة، لا من هنا.
 * وإعادةُ أيٍّ منها إضافةٌ لم تُطلَب، لا تنفيذٌ للأمر.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { HoloVideoEngine } from "@/components/home/HoloVideoEngine";
import { PRODUCT_BRAND } from "@/lib/domain";
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
  // غير المقيس نغمةٌ محايدة لا خضراء: «سليم» حكمٌ يقتضي قياسًا وقع.
  unmeasured: "default",
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
  unmeasured: { ar: "لم يُقَس", en: "Not measured" },
};

// وغير المقيس **معروضٌ** لا مطويّ: عدده خبرٌ عن جودة البيانات نفسها، وطيّه
// يجعل لوحةً ناقصة القياس تبدو مكتملة.
const SEVERITY_ORDER: RiskSeverity[] = ["high", "medium", "low", "unmeasured"];

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
      // `!== null` لا `> 0`: الصفر قياسٌ (امتثال ٠٪) لا غياب.
      if (row.compliance_pct !== null) out[row.region_id] = row.compliance_pct;
    }
    return out;
  }, [data]);

  const counters = data?.counters;
  const notMeasured = ar ? "لم يُقَس" : "not measured";

  const regionName = (id: RegionId) => (ar ? getRegion(id).shortAr : getRegion(id).shortEn);

  /** صفوف المناطق — تُقرأ في بطاقات المناطق وحالتها. */
  const regionRows = data?.regions ?? [];

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
  const simulation = data?.simulation ?? true;

  /** نسختان متتاليتان لشريط يلفّ بلا قطع — الثانية زينة محضة. */
  const pipeline = data?.pipeline ?? [];
  const ticker = pipeline.length ? [...pipeline, ...pipeline] : [];

  /* حُذفت لوحات المؤشّرات الثلاث من الرئيسية بأمر المالك: «الوكلاء
     النشطون» ثم «بانتظار الاعتماد» و«منجز اليوم» (٢٠٢٦/٠٨/١٠). ومعها
     مولّد النسبة `gauge` ومكوّن `InstrumentPanel` — بقاؤهما بلا مستهلك
     يُغري بإعادة التركيب. والعدّادات نفسها باقية في العقد، تقرؤها
     `/nx-ops` و`/nx-flow`. */

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
                كيف يُقرأ رسمه.

                **وعدّ المناطق رُفع من التعريف بأمر المالك ٢٠٢٦/٠٨/١٢**
                («استبدل ما بعد جميع المناطق — الوسطى الغربية الشرقية
                الجنوبية — بالسعودية»): التعريف يقول النطاق، والأسماء الأربعة
                معروضةٌ ببطاقاتها تحت هذا السطر مباشرة — فسردُها هنا تكرارٌ
                يزاحم الجملة التعريفية.

                ولا يعني هذا انفكاكًا عن `regions.ts`: المرجع الجغرافي الوحيد
                باقٍ مصدرًا للبطاقات وللشبكة (سطرا 289 و501). المرفوع تكرارٌ
                نصّي، لا مصدر بيانات. */}
            <p className="nx-bp-lede mt-3">
              {ar
                ? "مساعد ذكاء اصطناعي يعطي رؤية تنفيذية على الأمن الصناعي في جميع المناطق السعودية."
                : "An AI assistant giving executive visibility into industrial security across all Saudi regions."}
            </p>
            {/* حُذف سطر «المناطق الأربع وحالتها على طرف…» بأمر المالك
                ٢٠٢٦/٠٨/٠٩: كان يصف تخطيط الصفحة بالكلمات فوق الصفحة نفسها،
                والتخطيط ظاهرٌ للعين تحته مباشرة. */}
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
                    {/* كل منطقة تفتح على معلوماتها: الوجهة كانت القمرة
                        الموحّدة /nx-cockpit حتى حُجبت بأمر المالك ٢٠٢٦/٠٨/١٢،
                        فصارت مظلّة الأمن الصناعي /sec — والاختيار العام
                        (`setRegion`) يواكب الوجهة قبل الانتقال فتفتح الشاشة
                        على منطقة البطاقة.
                        بلا `nx-bp-card` عمدًا — انظر تعليل بطاقات الشدّة:
                        زجاجها قاعدةٌ خارج الطبقات فتمحو خلفية النغمة وحدّها
                        فيستوي «خطر» و«تحذير». الأساس `.nx-home-region` ولا
                        يكتب `background` ولا `border-color`. */}
                    <Link
                      to="/sec"
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
                      {/* حُذفت دائرة النبض من بطاقة المنطقة بأمر المالك
                          ٢٠٢٦/٠٨/١١. والنسبة المكتوبة إلى جوارها تقول ما كان
                          القوس يقوله — والغياب يبقى نصًّا «لم يُقَس»
                          (المادة ٢٧) لا شكلًا فارغًا. */}
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

          {/* ── يسارًا (end) · توصيات سَدِيد ─────────────────────────────
              أمر المالك ٢٠٢٦/٠٨/١٠: «احذف تحليلات الاستخدام واستبدلها
              بسَدِيد في المنتصف، وضع توصيات سَدِيد على يسار بطاقة سَدِيد».
              فصار الصدر: المناطق يمينًا · المساعد وسطًا · توصياته يسارًا.
              والقائمة عمودٌ واحد لا عمودان: كانت `lg:grid-cols-2` وهي في
              عرض الصفحة كاملًا، وصارت في ثلث العرض.

              كل توصية: عنوان · سبب · إجراء مقترح. مصدرها `getRiskBoard` —
              المسار الحيّ يبنيها من المعالجة المسجَّلة في صف المخاطرة نفسه ولا
              يؤلّف إجراءً، والبديل محاكاة مرجعية موسومة. */}
          <section
            className="nx-bp-stage w-full"
            style={{ ["--nx-bp-i" as string]: 3 }}
            aria-labelledby="nx-rec-heading"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="nx-bp-h2" id="nx-rec-heading">
                {ar
                  ? `توصيات ${PRODUCT_BRAND.assistantName}`
                  : `${PRODUCT_BRAND.en.name} advisories`}
              </h2>
            </div>
            {recommendations.length ? (
              <ul className="mt-3 grid grid-cols-1 gap-3">
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
          {/* وإلى جوار الرأس مدخلٌ إلى الوحدة نفسها: ما تعرضه هذه الصفحة
              لقطةٌ للقراءة لا سجلٌّ يُتصرَّف فيه — لا فرز ولا تصفية ولا
              تخفيف. و`/risk` كانت على بُعد ثلاث نقرات من الرئيسية (بطاقة
              منطقة ← القمرة ← خريطة النظام ← المخاطر)، فصارت نقرةً واحدة
              من الموضع الذي يسأل فيه القارئ عنها. */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="nx-dash-subhead">{ar ? "سجل المخاطر" : "Risk register"}</h3>
            <Link
              to="/risk"
              className="nx-bp-card inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[13px] font-bold text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-cyan)]"
            >
              <ArrowRight aria-hidden data-flip-rtl className="h-4 w-4 shrink-0" />
              {ar ? "افتح سجل المخاطر الكامل" : "Open the full risk register"}
            </Link>
          </div>
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

        {/* سجل القرارات الجاري — أصناف الشريط من طبقة المسرح نفسها.

            **العنوان كان يقول «مباشر» بلا شارة محاكاة.** والصفوف تأتي من
            `pipeline`، وهي عند سقوط المسار الحيّ صفوفٌ مكتوبة يدويًّا في
            `buildCommandCenterSimulation` («تعليق تصريح عمل ساخن — رياح
            نشطة»…). فكان القسم الوحيد بلا شارة محاكاة — وهو بالضبط القسم
            الذي يدّعي عنوانه المباشرة. وقد حُذفت الشارات كلّها من الشاشة
            بأمر المالك ٢٠٢٦/٠٨/١١، وحُذف معها ادّعاء «مباشر» فبقي العنوان
            «سجل القرارات» بلا دعوى. */}
        <section className="nx-bp-stage mt-8" style={{ ["--nx-bp-i" as string]: 8 }}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="nx-bp-h2">{ar ? "سجل القرارات" : "Decisions"}</h2>
          </div>
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
          className="nx-bp-stage mt-8 border-t border-[color:var(--hairline-soft)] pt-4"
          style={{ ["--nx-bp-i" as string]: 9 }}
        >
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* هذا السطر كان على الفيلم مباشرةً بلا زجاج تحته وبأخفّ درجات
              الحبر — فيمرّ تحته قوس النفق الساطع فيهبط تباينه إلى ١٫٤٢:١.
              الحلّ رفعُ الحبر درجةً ووضعُ حشوة السطح تحته (نفس علاج
              `.nx-bp-head-scrim`)، لا تعتيمُ الفيلم. */}
            <span className="nx-bp-note text-[12px] text-[color:var(--ink-2)]">
              {ar
                ? "الأرقام من مصدر النظام الحيّ. ما لا يصل منه يُقرأ «لم يُقَس» — لا يُستبدل بصفر."
                : "Figures come from the live system source. Whatever does not arrive reads “not measured” — never a substituted zero."}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default BlueprintPage;
