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
 * الرئيسية **خارج القشرة**: لا شريط جانبي لها، وشريطها العلوي حُذف بأمر
 * المالك ٢٠٢٦/٠٨/٠٩، وقشرة الأعلى (الجرس والمبدّل والرجوع والهوم) أُزيلت
 * من النظام كاملًا ٢٠٢٦/٠٩/١٠. فكلّ ما يصل منها إلى بقية النظام هو ما
 * يُكتب في نسيج هذه الصفحة نفسها.
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
 *
 * **ثم طُلبت (٢٠٢٦/٠٩/٢٩).** أمر المالك بتطبيق تصميم لوحة القيادة «مع تفعيل
 * جميع الأيقونات» أعاد إلى الصفحة الشريط الجانبي والترويسة، ومؤشراتٍ سبعة
 * ولوحات تشغيل كلُّ واحدٍ منها رابطٌ إلى شاشته (`HomeDashboard.tsx`). وبقي
 * بأمره نفسه: العنوان، وتوصيات سَدِيد، وسجل القرارات، وسطر الإفصاح. وبقي
 * بلا مساس: بطاقة المخاطر الواحدة (V5)، وغياب لوحات الوكلاء الثلاث.
 */
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { HoloVideoEngine } from "@/components/home/HoloVideoEngine";
import { SystemSidebar } from "@/components/nav/SystemSidebar";
import { SystemHeader } from "@/components/nav/SystemHeader";
import { CommandPalette } from "@/components/executive/CommandPalette";
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
import { REGIONS, REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";
import { SadeedStagePresence } from "@/components/sadeed/SadeedStagePresence";
import { HomeKpiRow, HomeOperations, SadeedQuickAsk } from "@/components/home/HomeDashboard";

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

  /** لوحة المخاطر المجمّعة وتوصيات سَدِيد — نفس بوابة القراءة: `!authLoading` وحدها، لا `!!user`. */
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

  /* ── المخاطر — مدخلٌ واحد ─────────────────────────────────────────────
     **حُذفت لوحة «سجل المخاطر»** — الجدول التفصيلي وزرّ فتح السجل الكامل
     وسطر المخاطر بلا إسناد — بأمر المالك V4 (فقرة 846) ٢٠٢٦/٠٨/٢٤.
     **وحُذفت بعدها البطاقات المجمّعة** — الأربع «حسب الشدّة» وشبكة
     «حسب المنطقة» — في جولة V5 (مراجعة العميل)، وحلّ محلّها مدخلٌ واحد
     إلى `/sec/risks`. وذهب معهما عدّاداهما: دالّةٌ تبقى بلا مستهلك تُعاد
     إلى الشاشة يومًا لأنها «موجودة».
     والهوك `getRiskBoard` ليس تركةً: تقرؤه توصيات سَدِيد، والإجمالي يبقى
     مشتقًّا من `risk.rows` لا من حقل مستقل. */
  const riskRows = risk?.rows ?? [];
  const riskMeasured = risk !== undefined;

  const recommendations = risk?.recommendations ?? [];
  const riskSimulation = risk?.simulation ?? true;

  return (
    <main
      className="nx-bp-surface relative flex min-h-screen overflow-x-clip bg-[color:var(--surface)] text-[color:var(--ink)]"
      data-pending={isPending || undefined}
    >
      {/* الشريط الجانبي للنظام (أمر المالك ٢٠٢٦/٠٩/٢٩) — المكوّن نفسه في قشرة
          النظام. و`overflow-x-clip` لا `overflow-hidden`: الثانية تجعل `main`
          حاويةَ سكرول فيفقد الشريط لصوقه (`sticky`) ويمضي مع الصفحة. ولوحة
          الأوامر تُركَّب هنا لأن القشرة لا تركّبها على `/` — وبدونها يصير زرّ
          البحث في الترويسة ميتًا. */}
      <SystemSidebar />
      <CommandPalette />
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

      {/* **المبدّل يأتي من الجذر لا من هنا (أمرا ٢٠٢٦/٠٨/٢٧ و٢٠٢٦/٠٩/١١).**
          الصفحة نطاقُه الوحيد، لكن مصدره `TopBar` المركَّب في الجذر.
          وتركيبه هنا ثانيةً يضع مبدّلَين متراكبَين بفارق 8px — قِيس فعلًا
          حين كانت الصفحة تركّب مبدّلها بعلّة «خارج القشرة فلا شريط لها». */}
      <div className="relative mx-auto w-full min-w-0 max-w-[1280px] flex-1 px-4 pb-16 pt-4 sm:px-6">
        <div className="-mx-4 -mt-4 mb-4 sm:-mx-6">
          <SystemHeader withMenu />
        </div>
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
              {/* الاسم العربي وحده بخط النطاق التحريري عبر الفئة المتولدة من
                  الرمز — لا اسم خط مكتوبًا هنا (المصدر الوحيد في طبقة الرموز).
                  الفئة على span لا على `h1` عمدًا — والقياس الحيّ أثبته:
                  ① `text-[1.12em]`: الخط النسخي يحتاج +١٠–١٥٪ ليكافئ حضور
                     السانس، والوحدة النسبية تتبع مقاسَي الأب (4xl/5xl) معًا.
                  ② الوزن يقيس 700 من قاعدة spans في توجيه البولد الشامل —
                     وجه Bold المودَع الحقيقي (المودَع 400/700 فقط)، فلا
                     أداة وزن تُكتب هنا لتوهم أنها النافذة.
                  ③ لا أداة `leading-*` على الامتداد: الصنف المرافق للفئة
                     يقيس عليه 1.8 فيسع الصاعد/النازل — وسطر `h1` نفسه
                     مثبَّت 1.3 بقاعدة `:where(h1..h6)` خارج الطبقات، لكن
                     الموروث لا يزاحم المباشر على الـspan.
                  والامتداد الإنجليزي يبقى على خطّه — قرار النطاق (أ).
                  (وترويسات `.nx-bp-h2` وسطر `.nx-bp-lede` مستبعَدان عمدًا:
                  قاعدتاهما خارج الطبقات تثبّتان 14px/800 و15px/600 فتغلبان
                  أدوات Tailwind، والخط النسخي بحجم مثبَّت صغير هو مظهر
                  «الخطّين المتنازعين» لا التناغم.) */}
              <span className="nx-bp-title font-amiri text-[1.12em]">{PRODUCT_BRAND.ar.name}</span>
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

        {/* ════ المؤشرات السبعة (أمر المالك ٢٠٢٦/٠٩/٢٩ — تصميم لوحة القيادة)
            كل مؤشر رابطٌ إلى شاشته، ومصدره قراءةٌ قائمة؛ ما لم يُقَس يُقرأ
            «لم يُقَس». التفصيل في `HomeDashboard.tsx`. */}
        <HomeKpiRow />

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
                  <li key={region.id} className="relative">
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
                      className={`nx-home-region flex min-h-20 items-center gap-3 rounded-2xl border p-3 pb-11 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-cyan)] ${tone.card}`}
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
                    {/* `pb-11` على البطاقة يحجز لهذا الرابط صفًّا بارتفاع لمسه
                        (44px) — بعد تركيب الشريط الجانبي (٢٠٢٦/٠٩/٢٩) ضاق العمود
                        فصارت رقاقة «الحالية» تقع تحت الرابط المطلَق. رُئي
                        بلقطةٍ على 1280 لا باختبار. */}
                    {/* REQ-022 (فقرة 846): «سهم في الكاردز يوديه لسجل المخاطر
                        الأمنية». رابط مستقل أخٌ لرابط البطاقة — لا <a> داخل
                        <a> — مطلَق الموضع داخل <li relative>، فالبطاقة كلها
                        رابط أصلًا. ظاهر دائمًا بشفافية 60٪ تشتد عند
                        hover/focus-visible (نمط سهم ExecDrilldownDialog):
                        الظهور بالتمرير وحده لا وجود له على الجوال.

                        ٢٠٢٦/٠٩/١٣ — ‏12px لا 11: `scripts/ui-audit.mjs` يفرض
                        `MIN_FONT = 12`، وهذا الرابط كان يكسره على البطاقات
                        الأربع في كل مقاسات المؤشّر. لم يظهر عامًا لأن فحص
                        الإنتاج كان يتخطّى نفسه صامتًا؛ فلمّا شُغِّل أوّل مرّة
                        أعطى `text 11px <A> "سجل المخاطر"` ×4 على ثلاثة
                        مقاسات. */}
                    <Link
                      to="/sec/risks"
                      aria-label={
                        ar
                          ? `سجل المخاطر الأمنية — ${region.labelAr}`
                          : `Security risk register — ${region.labelEn}`
                      }
                      className="absolute bottom-1 end-1 z-[1] inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[12px] font-bold text-[color:var(--ink-2)] opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-cyan)]"
                    >
                      {ar ? "سجل المخاطر" : "Risk register"}
                      <ChevronLeft aria-hidden className="h-4 w-4 shrink-0" />
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
            {/* أسئلة سريعة تحت المساعد كما في التصميم (٢٠٢٦/٠٩/٢٩) — تفتح
                لوحة سَدِيد الواحدة وترسل السؤال. */}
            <SadeedQuickAsk />
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

        {/* ════ لوحات التشغيل (أمر المالك ٢٠٢٦/٠٩/٢٩): الخريطة وحالة الأنظمة ·
            البلاغات والدوريات والكاميرات · الامتثال حسب المنطقة. */}
        <HomeOperations />

        {/* ════ ٣ · المخاطر — بطاقة واحدة بسهم ═══════════════════════════
            **جولة V5 (مراجعة العميل — الشركة السعودية للطاقة).** كان القسم
            يعرض اثنتي عشرة بطاقة: أربعًا «حسب الشدّة» وثمانيًا «حسب
            المنطقة». والملاحظة الحرفية: الرئيسية شاشةُ مدخلٍ لا شاشةُ
            تحليل — العدّ المفصَّل مكانه `/sec/risks` نفسها، فتكراره هنا
            يُطيل الصفحة على الجوال ويؤخّر الوصول إلى السجل.
            فحُذفت **البطاقات الأربع الممنوعة** («حسب الشدّة») وشبكة
            المناطق معها، وحلّ محلّها مدخلٌ واحد: بطاقة تحمل الإجمالي وسهمًا
            إلى السجل الكامل. البيانات نفسها (`getRiskBoard`) باقية —
            الحذف حذفُ عرضٍ لا إلغاءُ مصدر: توصيات سَدِيد أعلاه تقرأ الاستعلام
            نفسه. */}
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

          <Link
            to="/sec/risks"
            aria-label={ar ? "افتح سجل المخاطر" : "Open the risk register"}
            className="nx-bp-card group mt-3 flex min-h-[4.5rem] items-center justify-between gap-4 rounded-2xl p-4 transition-colors hover:border-primary/50"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="nx-dash-label">{ar ? "سجل المخاطر" : "Risk register"}</span>
              <span className="nx-dash-caption">
                {ar
                  ? "كل المخاطر المسجَّلة بشدّتها ومنطقتها وحالة معالجتها"
                  : "Every logged risk with severity, region and treatment"}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="nx-dash-value text-[color:var(--ink)]">
                {riskMeasured ? (
                  <span className="tabular-nums">{riskRows.length}</span>
                ) : (
                  <span className="nx-dash-absent">{notMeasured}</span>
                )}
              </span>
              {/* السهم في RTL يشير إلى اليسار — جهة المضيّ قُدمًا. */}
              <ArrowLeft
                aria-hidden
                className={`h-5 w-5 text-[color:var(--tone-cyan)] transition-transform group-hover:-translate-x-0.5 ${ar ? "" : "rotate-180"}`}
              />
            </span>
          </Link>
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
              {/* **كان السطر يقول «الأرقام من مصدر النظام الحيّ» — بلا ذكرٍ
                  للمحاكاة**، ولوحات الرئيسية كلّها تنهض من المحاكاة المرجعية
                  متى لم يصل المصدر الحيّ (`resilient()`). وهو الإفصاح الوحيد
                  الباقي بعد رفع الشارات (٢٠٢٦/٠٨/١١)، فلا يصحّ أن يدّعي الحياة.
                  نقضه حارس الجودة ٢٠٢٦/٠٩/٢٩. */}
              {ar
                ? "الأرقام من مصدر النظام الحيّ متى وصل، وإلا فمن محاكاةٍ مرجعية مدمجة. ما لا يُقاس يُقرأ «لم يُقَس» — لا يُستبدل بصفر."
                : "Figures come from the live system source when it responds, otherwise from a built-in reference simulation. Whatever is not measured reads “not measured” — never a substituted zero."}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default BlueprintPage;
