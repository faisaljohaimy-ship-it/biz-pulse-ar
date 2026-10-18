/**
 * المحاكاة المرجعية للرئيسية — **أرقام صورة المالك كما رُسمت** (قرار N2،
 * ٢٠٢٦/١٠/١٤: «محاكاة موسومة مطابقة (موصى به)»).
 *
 * المصدر: `docs/design/reference/home-command-center-mockup-2026-10-13.jpg`
 * (1536×1024، الوضع الفاتح). كل رقم وكل سهم تغيّر وكل منحنى صغير في الصورة
 * له هنا قيمةٌ تساويه، وكلها `is_simulation: true`، ولا تُعرض إلا تحت شارة
 * «محاكاة» ظاهرة (المادة ٦).
 *
 * ثلاث قواعد تحكم هذا الملف ومستهلكيه:
 *   ① **الحيّ يفوز تلقائيًّا** — متى أعادت قراءةٌ قيمةً مقيسة حيّة لرقمٍ ما
 *     عُرضت هي لا المرجع. والقرار بـ`chooseLive` وحدها، والكشف بـ`liveOf`
 *     (التوثيق لكل رقم في آخر الملف، مع الملف والسطر).
 *   ② **الحيّ لا يُزيَّن بتغيّرٍ محاكى** — قيمةٌ حيّة تعود من `chooseLive`
 *     بلا تغيّر ولا سلسلة (`null`)، فتقرأ خانتها «لم يُقَس». سهمٌ مرجعي فوق
 *     رقمٍ حيّ ادّعاءُ قياسٍ لم يقع (المادة ٢٧).
 *   ③ **لا صفرَ بديلًا للغياب** — الغياب لا يصير صفرًا. قيمةٌ حيّة غائبة (`null`) ليست
 *     قياسًا، فيبقى المرجع الموسوم مكانها.
 *
 * المناطق: معرّفات `RegionId` وحدها؛ الاسم يُقرأ من `regions.ts` (المرجع
 * الجغرافي الوحيد) ولا يُكتب هنا نصًّا. وأخطاء المولِّد الإملائية في الصورة
 * صُحّحت وحدها (مثل «الوسطي» ← اسم المنطقة من `regions.ts`، و«أخر» ← «أخرى»،
 * و«قيد التحقبق» ← «قيد التحقيق»، وأسماء الأشهر).
 *
 * **الترتيب في المصفوفات:** صفّ المؤشرات بترتيب الرسم **من اليسار إلى اليمين**
 * لأنه يقع في غلاف الترتيب `ltr` (قرار D5). وكل قائمة داخل بطاقة بترتيب
 * **القراءة العربية** (الأول هو الأيمن أو الأعلى) لأن البطاقات `dir="rtl"`.
 * ومحور الأشهر في الرسم البياني من يناير إلى ديسمبر يسارًا ← يمينًا كما رُسم.
 */
import { getRegion, REGIONS, type RegionId } from "@/lib/regions";
import type { SecOverview } from "@/lib/sec.functions";
import type { CommandCenterState } from "@/lib/exec/command-center.functions";
import type { RiskBoard, RiskSeverity } from "@/lib/exec/risk-board.functions";
import type { ProviderStatus } from "@/lib/integrations-hub.functions";
import type { ExecKpis } from "@/lib/sec-exec-kpis.functions";
import type { MaintSummary } from "@/lib/maintenance/maint-types";
import type { OmsKpis } from "@/lib/oms.functions.reports";

/* ── النصوص الثابتة ─────────────────────────────────────────────────────── */

/** شارة كل رقم مرجعي — تُعرض بجواره حيثما عُرض. */
export const SIMULATION_BADGE_AR = "مرجعي";
/** خانة التغيّر لقيمةٍ حيّة: لا تاريخ مقيس لها، فلا سهم (المادة ٢٧). */
export const CHANGE_NOT_MEASURED_AR = "لم يُقَس";
/** وسم الصور التوضيحية (قرار N3). */
export const ILLUSTRATIVE_IMAGE_AR = "صورة توضيحية — لا بثّ مرتبط";

/* ── الأنواع ────────────────────────────────────────────────────────────── */

/** سهم التغيّر كما رُسم: الاتجاه والنسبة المئوية. */
export type RefChange = { readonly dir: "up" | "down"; readonly pct: number };

/** رقمٌ مرجعي بما يرافقه في الرسم. `series` اثنتا عشرة نقطة بشكل المنحنى. */
export type RefFigure<V = number> = {
  readonly value: V;
  readonly change?: RefChange | null;
  readonly series?: readonly number[] | null;
};

/**
 * دلالة الحالة كما رُسمت (لونًا) — تُترجم عند العرض إلى شكلٍ وكلمة
 * (`STAT_TONES`: خطر مثمّن · تحذير مثلث · سليم دائرة؛ و`info` محايدة زرقاء).
 * اللون وحده لا يكفي (WCAG 2.2 §1.4.1)، ومثلث الصورة الأحمر يُرسم مثمّنًا.
 */
export type RefStatus = "danger" | "warning" | "info" | "healthy";

/** مفاتيح الصور التوضيحية — تطابق مفاتيح `home-images.ts` وأسماء `public/home/*.webp`. */
export type RefImageKey =
  | "cam-equipment-yard"
  | "cam-gate-1"
  | "cam-outer-perimeter"
  | "cam-main-warehouse"
  | "risk-unauthorized-entry"
  | "risk-suspicious-activity"
  | "risk-camera-fault"
  | "risk-contractor-permit"
  | "incident-gate-3"
  | "incident-suspicious-vehicle"
  | "incident-security-report"
  | "incident-sabotage";

/**
 * معرّفات المؤشرات السبعة — **نفس معرّفات سجل `kpis` في `HomeDashboard.tsx`**
 * كي يُربط كل مؤشر بمرجعه بالمعرّف لا بالموضع.
 */
export type RefKpiId =
  "compliance" | "incidents" | "risks" | "guards" | "patrols" | "cameras" | "assets";

export type RefKpi = RefFigure & {
  readonly id: RefKpiId;
  /** الاسم كما رُسم — يُعرض مع القيمة المرجعية. */
  readonly labelAr: string;
  /**
   * الاسم الصادق لأقرب مقياس حيّ — يُعرض **بدل** `labelAr` متى فازت القيمة
   * الحيّة (رقمٌ حيّ تحت اسمٍ ليس اسمه ادّعاء). يساوي `labelAr` حين يكون
   * المقياس الحيّ هو المرسوم نفسه.
   */
  readonly liveLabelAr: string;
  readonly unit: "%" | null;
  readonly change: RefChange;
  readonly series: readonly number[];
  /** شكل المنحنى الصغير كما رُسم. */
  readonly seriesForm: "line" | "bars";
};

/** شارة عدٍّ صغيرة تحت رقم المنطقة على الخريطة. */
export type RefMapBadge = {
  readonly count: number;
  /**
   * لون الرمز كما رُسم. **معنى الشارتين غير مقروء في الصورة** (رموز المولِّد
   * مشوّهة)، فلا يُخترع لهما اسمٌ هنا — انظر open_issues في تقرير المرحلة.
   */
  readonly drawn: RefStatus;
};

export type RefMapRegion = {
  readonly regionId: RegionId;
  /**
   * رقم المنطقة الكبير. مجموع الأربعة 5,997 = «إجمالي الأفراد» في صفّ
   * المؤشرات بالضبط، فهو أفراد المنطقة.
   */
  readonly value: number;
  readonly change: RefChange;
  readonly badges: readonly [RefMapBadge, RefMapBadge];
};

export type RefQuickStatId = "entry-points" | "cameras" | "sites" | "facilities";
export type RefQuickStat = {
  readonly id: RefQuickStatId;
  readonly labelAr: string;
  readonly value: number;
};

export type RefRiskRow = {
  readonly titleAr: string;
  readonly regionId: RegionId;
  /** الموقع كما رُسم بعد اسم المنطقة («محطة G3»). */
  readonly siteAr: string;
  /** الشدّة بمفردات سجل المخاطر — `high` تُرسم «مرتفع»، `medium` «متوسط». */
  readonly severity: Extract<RiskSeverity, "high" | "medium">;
  readonly severityAr: "مرتفع" | "متوسط";
  readonly status: RefStatus;
  readonly minutesAgo: number;
  /** نصّ الزمن كما رُسم. */
  readonly agoAr: string;
  readonly image: RefImageKey;
};

export type RefIncidentRow = {
  readonly titleAr: string;
  readonly regionId: RegionId;
  /** نصّ شارة الحالة كما رُسم. */
  readonly statusAr: string;
  readonly status: RefStatus;
  readonly minutesAgo: number;
  readonly agoAr: string;
  readonly image: RefImageKey;
};

export type RefPatrolSplitId = "active" | "in-progress" | "late";
export type RefPatrolSplit = {
  readonly id: RefPatrolSplitId;
  readonly labelAr: string;
  readonly value: number;
  readonly status: RefStatus;
};

export type RefCameraTile = {
  readonly id: string;
  /** اسم الموقع كما رُسم على الإطار. */
  readonly labelAr: string;
  /**
   * الصورة تكتب «مباشر» قبل ثلاثةٍ من الأسماء الأربعة. **لا تُعرض الكلمة**:
   * لا بثّ مرتبط (N3)، والإطار يحمل «صورة توضيحية — لا بثّ مرتبط» مكانها.
   */
  readonly drawnLiveWord: boolean;
  readonly image: RefImageKey;
};

export type RefRegionPerformance = RefFigure & {
  readonly regionId: RegionId;
  readonly change: RefChange;
};

export type RefChartSeries = {
  readonly id: "risks" | "incidents";
  readonly labelAr: string;
  /** اثنا عشر شهرًا، يناير ← ديسمبر. */
  readonly values: readonly number[];
};

export type RefDonutSlice = {
  readonly id: string;
  readonly labelAr: string;
  /** النسبة كما كُتبت في المفتاح. */
  readonly pct: number;
  /**
   * عددٌ **مشتقّ** لا مرسوم: الصورة تكتب المجموع (128) والنسب وحدها، فاختير
   * لكل شريحة أقرب عدد صحيح يُعيد نسبتها المكتوبة بالتقريب ويُكمل المجموع.
   */
  readonly count: number;
};

export type RefSystemId = "cctv" | "access" | "patrols" | "sap" | "iot";
export type RefSystemRow = {
  readonly id: RefSystemId;
  readonly labelAr: string;
  /** النسبة كما رُسمت. */
  readonly value: number;
  /** كلمة الحالة كما رُسمت. */
  readonly stateAr: "يعمل";
  readonly status: RefStatus;
  /** الاسم الصادق لأقرب مقياس حيّ — يُعرض متى فازت القيمة الحيّة. */
  readonly liveLabelAr: string;
};

type Section = { readonly is_simulation: true };

export type HomeReference = {
  readonly is_simulation: true;
  readonly source: "reference";
  readonly kpis: readonly RefKpi[];
  readonly map: Section & {
    readonly regions: readonly RefMapRegion[];
    readonly quickStats: readonly RefQuickStat[];
  };
  readonly risks: Section & { readonly rows: readonly RefRiskRow[] };
  readonly incidents: Section & { readonly rows: readonly RefIncidentRow[] };
  readonly patrols: Section & {
    readonly totalLabelAr: string;
    readonly total: RefFigure & { readonly change: RefChange };
    readonly split: readonly RefPatrolSplit[];
  };
  readonly cameras: Section & { readonly tiles: readonly RefCameraTile[] };
  readonly regionsPerformance: Section & {
    readonly periodLabelAr: string;
    readonly rows: readonly RefRegionPerformance[];
  };
  readonly incidentsRisksChart: Section & {
    readonly periodLabelAr: string;
    readonly months: readonly string[];
    readonly yTicks: readonly number[];
    /** بترتيب مفتاح الرسم في القراءة العربية: المخاطر ثم الحوادث. */
    readonly series: readonly RefChartSeries[];
    /**
     * أعمدةٌ زرقاء مرسومة **بلا مفتاح** في الصورة (المفتاح يسمّي الخطّين
     * وحدهما): ثمانية أعمدة صلبة للأشهر الأولى، وما بعدها أشباحٌ باهتة ⇐ `null`.
     * من يرسمها يحتاج لها اسمًا يقرّره المالك، أو يتركها.
     */
    readonly columns: readonly (number | null)[];
  };
  readonly incidentTypes: Section & {
    readonly total: number;
    readonly totalLabelAr: string;
    readonly slices: readonly RefDonutSlice[];
  };
  readonly systems: Section & { readonly rows: readonly RefSystemRow[] };
};

/* ── التجميد ────────────────────────────────────────────────────────────── */

/** تجميدٌ عميق: المرجع لا يُعدَّل في مكانه أبدًا — أي كتابة عليه ترمي. */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

const up = (pct: number): RefChange => ({ dir: "up", pct });

/* ── القيم — مقروءة من الصورة ───────────────────────────────────────────── */

/**
 * **المنحنيات الصغيرة** قِيست من بكسلات الصورة: لكل بطاقة أعلى بكسلٍ مشبع في
 * كل عمود، ثم اثنتا عشرة عيّنة متساوية على امتداد الخطّ، ثم إسقاطٌ خطّي
 * ينتهي بقيمة البطاقة نفسها (آخر نقطة = الرقم المعروض). وأعمدة «المخاطر
 * الحرجة» أطوالها مقيسة من أساسها (صفر) بالنسبة نفسها.
 */
export const HOME_REFERENCE: HomeReference = deepFreeze<HomeReference>({
  is_simulation: true,
  source: "reference",
  kpis: [
    {
      id: "compliance",
      labelAr: "الحالة الأمنية العامة",
      liveLabelAr: "الامتثال العام",
      unit: "%",
      value: 96,
      change: up(4),
      seriesForm: "line",
      series: [89, 92, 92, 90, 91, 94, 95, 93, 95, 97, 95, 96],
    },
    {
      id: "incidents",
      labelAr: "الحوادث النشطة",
      liveLabelAr: "البلاغات المفتوحة",
      unit: null,
      value: 7,
      change: up(40),
      seriesForm: "line",
      series: [1, 3, 3, 3, 6, 7, 6, 5, 4, 7, 7, 7],
    },
    {
      id: "risks",
      labelAr: "المخاطر الحرجة",
      // `critical` تُطوى على `high` في سجل المخاطر (risk-board.functions.ts:44-47).
      liveLabelAr: "مخاطر عالية",
      unit: null,
      value: 12,
      change: up(20),
      seriesForm: "bars",
      series: [3, 4, 8, 11, 7, 6, 4, 6, 8, 11, 14, 12],
    },
    {
      id: "guards",
      labelAr: "إجمالي الأفراد",
      liveLabelAr: "حرّاس المواقع",
      unit: null,
      value: 5997,
      change: up(3),
      seriesForm: "line",
      series: [5780, 5852, 5852, 5794, 5881, 5881, 5881, 5968, 5939, 5983, 5997, 5997],
    },
    {
      id: "patrols",
      labelAr: "الدوريات النشطة",
      liveLabelAr: "الدوريات النشطة",
      unit: null,
      value: 312,
      change: up(6),
      seriesForm: "line",
      series: [280, 290, 300, 295, 285, 292, 292, 300, 300, 312, 312, 312],
    },
    {
      id: "cameras",
      labelAr: "الكاميرات العاملة",
      liveLabelAr: "الكاميرات المتصلة",
      unit: null,
      value: 1248,
      change: up(2),
      seriesForm: "line",
      series: [1215, 1228, 1238, 1240, 1233, 1228, 1235, 1240, 1238, 1245, 1248, 1248],
    },
    {
      id: "assets",
      labelAr: "الأصول الحرجة",
      // `assets_offline` يعدّ `offline || degraded` (sec.functions.ts:374).
      liveLabelAr: "أصول خارج الخدمة",
      unit: null,
      value: 892,
      change: up(1),
      seriesForm: "line",
      series: [870, 884, 890, 887, 880, 882, 889, 889, 884, 892, 894, 892],
    },
  ],
  map: {
    is_simulation: true,
    regions: [
      {
        regionId: "central",
        value: 1876,
        change: up(15),
        badges: [
          { count: 5, drawn: "danger" },
          { count: 2, drawn: "info" },
        ],
      },
      {
        regionId: "western",
        value: 1341,
        change: up(8),
        badges: [
          { count: 3, drawn: "healthy" },
          { count: 2, drawn: "info" },
        ],
      },
      {
        regionId: "eastern",
        value: 1532,
        change: up(11),
        badges: [
          { count: 4, drawn: "warning" },
          { count: 1, drawn: "info" },
        ],
      },
      {
        regionId: "southern",
        value: 1248,
        change: up(12),
        badges: [
          { count: 6, drawn: "warning" },
          { count: 1, drawn: "healthy" },
        ],
      },
    ],
    // «إحصائيات سريعة» بترتيب القراءة: الأيمن أولًا.
    quickStats: [
      { id: "entry-points", labelAr: "نقاط الدخول", value: 214 },
      { id: "cameras", labelAr: "الكاميرات", value: 1248 },
      { id: "sites", labelAr: "المواقع", value: 186 },
      { id: "facilities", labelAr: "المرافق", value: 48 },
    ],
  },
  risks: {
    is_simulation: true,
    rows: [
      {
        titleAr: "محاولة دخول غير مصرح بها",
        regionId: "eastern",
        siteAr: "محطة G3",
        severity: "high",
        severityAr: "مرتفع",
        status: "danger",
        minutesAgo: 15,
        agoAr: "منذ 15 دقيقة",
        image: "risk-unauthorized-entry",
      },
      {
        titleAr: "نشاط مشبوه بالقرب من الأصول",
        regionId: "central",
        siteAr: "مرفق B2",
        severity: "high",
        severityAr: "مرتفع",
        status: "danger",
        minutesAgo: 32,
        agoAr: "منذ 32 دقيقة",
        image: "risk-suspicious-activity",
      },
      {
        titleAr: "تعطل كاميرا مراقبة",
        regionId: "western",
        siteAr: "مرفق W1",
        severity: "medium",
        severityAr: "متوسط",
        status: "warning",
        minutesAgo: 60,
        agoAr: "منذ ساعة",
        image: "risk-camera-fault",
      },
      {
        titleAr: "انتهاء تصريح مقاول",
        regionId: "southern",
        siteAr: "موقع S4",
        severity: "medium",
        severityAr: "متوسط",
        status: "warning",
        minutesAgo: 120,
        agoAr: "منذ ساعتين",
        image: "risk-contractor-permit",
      },
    ],
  },
  incidents: {
    is_simulation: true,
    rows: [
      {
        titleAr: "دخول غير مصرح - بوابة 3",
        regionId: "central",
        statusAr: "حالة استجابة جارية",
        status: "danger",
        minutesAgo: 18,
        agoAr: "منذ 18 دقيقة",
        image: "incident-gate-3",
      },
      {
        titleAr: "مركبة مشبوهة",
        regionId: "western",
        statusAr: "قيد التحقيق",
        status: "warning",
        minutesAgo: 45,
        agoAr: "منذ 45 دقيقة",
        image: "incident-suspicious-vehicle",
      },
      {
        titleAr: "بلاغ أمني",
        regionId: "eastern",
        statusAr: "قيد المتابعة",
        status: "info",
        minutesAgo: 60,
        agoAr: "منذ ساعة",
        image: "incident-security-report",
      },
      {
        titleAr: "اشتباه عملية تخريب",
        regionId: "southern",
        statusAr: "تم الاحتواء",
        status: "healthy",
        minutesAgo: 180,
        agoAr: "منذ 3 ساعات",
        image: "incident-sabotage",
      },
    ],
  },
  patrols: {
    is_simulation: true,
    totalLabelAr: "إجمالي الدوريات اليوم",
    total: { value: 312, change: up(6) },
    split: [
      { id: "active", labelAr: "نشطة", value: 268, status: "healthy" },
      { id: "in-progress", labelAr: "قيد التنفيذ", value: 32, status: "warning" },
      { id: "late", labelAr: "متأخرة", value: 12, status: "danger" },
    ],
  },
  cameras: {
    is_simulation: true,
    // بترتيب القراءة في الشبكة: الأعلى الأيمن، الأعلى الأيسر، الأسفل الأيمن، الأسفل الأيسر.
    tiles: [
      {
        id: "equipment-yard",
        labelAr: "ساحة المعدات",
        drawnLiveWord: true,
        image: "cam-equipment-yard",
      },
      { id: "gate-1", labelAr: "بوابة 1", drawnLiveWord: false, image: "cam-gate-1" },
      {
        id: "outer-perimeter",
        labelAr: "المحيط الخارجي",
        drawnLiveWord: true,
        image: "cam-outer-perimeter",
      },
      {
        id: "main-warehouse",
        labelAr: "المستودع الرئيسي",
        drawnLiveWord: true,
        image: "cam-main-warehouse",
      },
    ],
  },
  regionsPerformance: {
    is_simulation: true,
    periodLabelAr: "هذا الشهر",
    // ترتيب `REGIONS` — في بطاقةٍ `rtl` يقع أوّلها يمينًا كما رُسم.
    rows: [
      { regionId: "central", value: 96, change: up(5) },
      { regionId: "western", value: 94, change: up(3) },
      { regionId: "eastern", value: 92, change: up(4) },
      { regionId: "southern", value: 90, change: up(6) },
    ],
  },
  incidentsRisksChart: {
    is_simulation: true,
    // الصورة تكتب «6 أشهر» فوق محورٍ من يناير إلى ديسمبر؛ والمعتمد اثنا عشر
    // شهرًا، فالوسم يقول ما يُرسم (انظر open_issues).
    periodLabelAr: "12 شهرًا",
    months: [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ],
    yTicks: [0, 50, 100, 150, 200, 250],
    // مقروءة من بكسلات الخطّين: صفر المحور عند y=975 و50 وحدة لكل 15.75px،
    // واثنتا عشرة عيّنة متساوية بين أول نقطة (x=664) وآخرها (x=964).
    series: [
      {
        id: "risks",
        labelAr: "المخاطر",
        values: [75, 96, 78, 87, 92, 102, 119, 137, 163, 179, 165, 160],
      },
      {
        id: "incidents",
        labelAr: "الحوادث",
        values: [73, 94, 75, 52, 37, 48, 67, 88, 111, 121, 121, 159],
      },
    ],
    columns: [165, 114, 149, 171, 152, 130, 151, 162, null, null, null, null],
  },
  incidentTypes: {
    is_simulation: true,
    total: 128,
    totalLabelAr: "إجمالي الحوادث",
    slices: [
      { id: "unauthorized-entry", labelAr: "دخول غير مصرح", pct: 32, count: 41 },
      { id: "suspicious-activity", labelAr: "نشاط مشبوه", pct: 24, count: 31 },
      { id: "sabotage", labelAr: "تخريب / عبث", pct: 14, count: 18 },
      { id: "fire-safety", labelAr: "حريق / سلامة", pct: 10, count: 13 },
      { id: "other", labelAr: "أخرى", pct: 20, count: 25 },
    ],
  },
  systems: {
    is_simulation: true,
    rows: [
      {
        id: "cctv",
        labelAr: "نظام المراقبة (CCTV)",
        value: 99,
        stateAr: "يعمل",
        status: "healthy",
        liveLabelAr: "متوسط صحّة الكاميرات",
      },
      {
        id: "access",
        labelAr: "نظام الدخول",
        value: 98,
        stateAr: "يعمل",
        status: "healthy",
        liveLabelAr: "متوسط صحّة البوابات",
      },
      {
        id: "patrols",
        labelAr: "نظام الدوريات",
        value: 97,
        stateAr: "يعمل",
        status: "healthy",
        liveLabelAr: "إنجاز نقاط التفتيش",
      },
      {
        id: "sap",
        labelAr: "تكامل SAP",
        value: 100,
        stateAr: "يعمل",
        status: "healthy",
        // الحيّ كلمة صحّة لا نسبة (integrations-hub.functions.ts:250-271).
        liveLabelAr: "تكامل SAP",
      },
      {
        id: "iot",
        labelAr: "منصة IoT",
        value: 96,
        stateAr: "يعمل",
        status: "healthy",
        liveLabelAr: "حسّاسات في الإنذار",
      },
    ],
  },
});

/* ── الوصول بالمعرّف ────────────────────────────────────────────────────── */

const byId = <T, K extends keyof T>(rows: readonly T[], key: K, id: T[K], what: string): T => {
  const hit = rows.find((r) => r[key] === id);
  if (!hit) throw new Error(`home-reference: لا مرجع لـ${what} «${String(id)}»`);
  return hit;
};

export const refKpi = (id: RefKpiId): RefKpi => byId(HOME_REFERENCE.kpis, "id", id, "المؤشر");
export const refMapRegion = (id: RegionId): RefMapRegion =>
  byId(HOME_REFERENCE.map.regions, "regionId", id, "المنطقة");
export const refRegionPerformance = (id: RegionId): RefRegionPerformance =>
  byId(HOME_REFERENCE.regionsPerformance.rows, "regionId", id, "أداء المنطقة");
export const refSystem = (id: RefSystemId): RefSystemRow =>
  byId(HOME_REFERENCE.systems.rows, "id", id, "النظام");

/**
 * سطر المنطقة كما رُسم: «المنطقة {الاسم} - {الموقع}». الاسم من `regions.ts`
 * وحده — لا اسم منطقة مكتوب في هذا الملف.
 */
export function regionLineAr(regionId: RegionId, siteAr?: string | null): string {
  const name = getRegion(regionId).shortAr;
  return siteAr ? `المنطقة ${name} - ${siteAr}` : `المنطقة ${name}`;
}

/** ترتيب `REGIONS` نفسه — يُستعمل لاختبار أن المرجع لا يخترع ترتيبًا. */
export const REF_REGION_ORDER: readonly RegionId[] = REGIONS.map((r) => r.id);

/* ── الاختيار بين الحيّ والمرجع ─────────────────────────────────────────── */

export type Chosen<V> = {
  readonly value: V;
  /** `null` دائمًا للحيّ ⇐ خانة التغيّر تقرأ «لم يُقَس». */
  readonly change: RefChange | null;
  /** `null` دائمًا للحيّ ⇐ لا منحنى مرسوم فوق رقمٍ حيّ. */
  readonly series: readonly number[] | null;
  /** `true` ⇐ تُعرض شارة «محاكاة» بجوار الرقم، ويُعرض الاسم المرسوم. */
  readonly simulated: boolean;
};

/** قيمةٌ حيّة مقيسة: لا `null` ولا `undefined`، والعدد منتهٍ (لا `NaN`). */
function isMeasured<V>(v: V | null | undefined): v is V {
  if (v === null || v === undefined) return false;
  return typeof v !== "number" || Number.isFinite(v);
}

/**
 * **القاعدة الواحدة لكل رقم مرسوم** (N2):
 *   - القراءة حيّة **و**القيمة مقيسة ⇐ القيمة الحيّة، بلا تغيّر ولا سلسلة،
 *     و`simulated: false`؛
 *   - وإلا (القراءة محاكاة، أو قيد التحميل، أو حيّة بلا قياسٍ لهذا الرقم)
 *     ⇐ المرجع كاملًا بتغيّره وسلسلته، و`simulated: true` ⇐ شارة «محاكاة».
 *
 * لا يُخلط المصدران في رقمٍ واحد: لا قيمة حيّة بسهمٍ مرجعي، ولا قيمة مرجعية
 * بلا شارة.
 */
export function chooseLive<V>(
  liveValue: V | null | undefined,
  isLive: boolean,
  ref: RefFigure<V>,
): Chosen<V> {
  if (isLive && isMeasured(liveValue)) {
    return { value: liveValue, change: null, series: null, simulated: false };
  }
  return {
    value: ref.value,
    change: ref.change ?? null,
    series: ref.series ?? null,
    simulated: true,
  };
}

/** الاسم المعروض: المرسوم مع المرجع، والصادق مع الحيّ. */
export function labelOf(
  fig: { readonly labelAr: string; readonly liveLabelAr?: string },
  simulated: boolean,
): string {
  return simulated ? fig.labelAr : (fig.liveLabelAr ?? fig.labelAr);
}

/* ── كشف الحيّ من المحاكاة — لكل قراءة ─────────────────────────────────── */

/**
 * هل تحمل القيمة وسم المحاكاة؟ `markSimulation` يسِم الجذر وكل عنصر مصفوفة
 * بـ`is_simulation = true` ما لم يكن مجمّدًا (showcase-simulation.server.ts:36-55،
 * والوسم نفسه :45-46)، و`resilient` يمرّر البديل وحده به (:1160-1183، السطران
 * 1174 و1181). صفوف القاعدة الحيّة لا تمرّ منه فلا تحمله.
 */
export function isSimulationMarked(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { is_simulation?: unknown }).is_simulation === true
  );
}

/**
 * كاشفات الحياة لكل قراءة في `home-reads.ts`. كلها تُعيد `false` للبيانات
 * الغائبة (تحميل/خطأ)، فيبقى المرجع الموسوم — لا رقم يُدّعى حيًّا قبل وصوله.
 */
export const liveOf = {
  /**
   * `getSecOverview` (home-reads.ts:42-47 · sec.functions.ts:273-310): المسار
   * الحيّ يعيد كائنًا بلا وسم (:356-377)؛ والبديل يبدأ من محاكاةٍ موسومة الجذر
   * (showcase-simulation.server.ts:1004) ويمرّ بـ`resilient` (:1174/1181).
   * يحكم: المواقع والحرّاس والدوريات والأصول والكاميرات (تنبيهات CCTV).
   */
  sec: (d: SecOverview | undefined): boolean => d !== undefined && !isSimulationMarked(d),
  /**
   * **البلاغات تُقرأ من صفوفها لا من الحاوية.** البديل يضع صفوف «تقرير
   * البلاغات» الحقيقية المجمّدة (sec.functions.ts:295-307 ·
   * event-report.real.server.ts:120-122)، والمجمَّد لا يُوسم
   * (showcase-simulation.server.ts:45)؛ فالحاوية «محاكاة» والبلاغات حقيقية.
   * السابقة نفسها في `computeExecDrilldown` (sec-exec-kpis.functions.ts:1040-1052).
   */
  secIncidents: (d: SecOverview | undefined): boolean =>
    d !== undefined && !d.incidents.some(isSimulationMarked),
  /**
   * `getCommandCenterState` (home-reads.ts:54-60 · command-center.functions.ts:266-277):
   * الحيّ `source: "database"` و`simulation` من وسم صفوف المهام العاجلة
   * والمساندة (:227-234)؛ والبديل `source: "reference"` و`simulation: true`
   * (showcase-simulation.server.ts:2683-2687).
   */
  state: (d: CommandCenterState | undefined): boolean =>
    d !== undefined && d.source === "database" && d.simulation === false,
  /**
   * `getRiskBoard` (home-reads.ts:61-66 · risk-board.functions.ts:161-173):
   * **محاكاة دائمًا اليوم** — `sim_risks` جدول العرض المبذور فيُكتب
   * `simulation: true` حتى على المسار الحيّ (:149-158)، والبديل
   * `source: "reference"` (showcase-simulation.server.ts:2913).
   */
  risk: (d: RiskBoard | undefined): boolean =>
    d !== undefined && d.source === "database" && d.simulation === false,
  /**
   * مزوّد تكامل من `getIntegrationsOverview` (home-reads.ts:67-72 ·
   * integrations-hub.functions.ts:135-151): صفّ البديل موسوم
   * (`is_simulation?` مصرَّح به :35-40، والبنّاء showcase-simulation.server.ts:1679).
   */
  provider: (p: ProviderStatus | undefined): boolean => p !== undefined && !isSimulationMarked(p),
  /**
   * `getExecKpis` (home-reads.ts:78-85 · sec-exec-kpis.functions.ts:288-323):
   * **لا وسم يصل اليوم** — `resilient` يسِم مصادر البديل (:297-320 ·
   * showcase-simulation.server.ts:473)، ثم `computeExecKpis(sources)` (:322)
   * يبني كائنًا جديدًا بلا الوسم. فالحيّ والمحاكاة لا يتمايزان، والكاشف
   * **يفشل مغلقًا**: لا يعدّ القراءة حيّة إلا بتصريحٍ صريح
   * `is_simulation === false` من الخادم (لا يصدر بعد — انظر open_issues).
   */
  execKpis: (d: ExecKpis | undefined): boolean =>
    (d as { is_simulation?: unknown } | undefined)?.is_simulation === false,
  /**
   * `getMaintSummary` (home-reads.ts:91-98 · maint.functions.ts:135-153):
   * بيانات حقيقية بلا محاكاة ولا بديل — `source: "database"` (:144-148) أو
   * خطأٌ عربي (:149-152). لا رقم في الصورة يُسنَد إليها، **ولا يُستبدل رقمٌ
   * منها بمرجعٍ أبدًا** (استثناء الصيانة في CLAUDE.md).
   */
  maint: (d: MaintSummary | undefined): boolean => d !== undefined && d.source === "database",
  /**
   * `getOmsKpis` (home-reads.ts:48-53 · oms.functions.reports.ts:204-256):
   * البديل (:240-254) يمرّ بـ`resilient` فيُوسم جذره. لا رقم مرجعي يُسنَد إليه.
   */
  oms: (d: OmsKpis | undefined): boolean => d !== undefined && !isSimulationMarked(d),
} as const;

/*
 * ═══ لكل رقمٍ مرسوم: من أين قيمته الحيّة، ومتى تُعدّ حيّة ═══════════════════
 *
 * الصيغة: الرقم ← القراءة · القيمة الحيّة · الكاشف · ملاحظات (ملف:سطر).
 * «مرجع دائمًا» = لا قراءة في `home-reads.ts` تقيسه اليوم.
 *
 * ── صفّ المؤشرات ──
 * compliance «الحالة الأمنية العامة» ← state · متوسط `regions[].compliance_pct`
 *   حيث `!== null` (الصفر قياس، command-center.functions.ts:195-207)، و`null`
 *   حين لا منطقة مقيسة · `liveOf.state`. لا يُستعمل `counters.compliance_avg`:
 *   يعيد 0 حين لا قياس (:254-261). وتحفّظ: وسم `simulation` يتبع المهام
 *   والمساندة لا صفوف `hcis_compliance_status` (لا يُقرأ وسمها، :70).
 * incidents «الحوادث النشطة» ← sec · `counts.incidents_open` · `liveOf.secIncidents`
 *   (حقيقي في المسارين اليوم). المسار الحيّ يعدّ داخل صفحة الـ200 المسقوفة
 *   (sec.functions.ts:321-325 و367)؛ والبديل يعدّ التقرير كاملًا (:304).
 * risks «المخاطر الحرجة» ← risk · عدد `rows` بشدّة `high` · `liveOf.risk`
 *   (محاكاة دائمًا اليوم، risk-board.functions.ts:149-158).
 * guards «إجمالي الأفراد» ← sec · مجموع `sites[].guards_count` (sec.functions.ts:16)
 *   متى وُجد موقع، وإلا `null` · `liveOf.sec`.
 * patrols «الدوريات النشطة» ← sec · `counts.patrols_active` (sec.functions.ts:370،
 *   من صفحة 200 دورية :326-330) · `liveOf.sec`.
 * cameras «الكاميرات العاملة» ← execKpis · `cameras_online` من `cameras_total`
 *   (sec-exec-kpis.functions.ts:264-265) · `liveOf.execKpis` (يفشل مغلقًا).
 * assets «الأصول الحرجة» ← sec · `counts.assets_offline` (sec.functions.ts:374،
 *   كمية أخرى غير المرسومة ⇐ `liveLabelAr`) · `liveOf.sec`.
 *
 * ── الخريطة ──
 * فقاعات المناطق (الرقم والتغيّر والشارتان) ← مرجع دائمًا: لا توزيع على
 *   المناطق مقيس — `assets_active: null` و`incidents_open: null` لكل منطقة
 *   (command-center.functions.ts:208-217)، ولا عمود منطقة على `sec_sites` ولا
 *   على `sec_incidents` (:25-26 و186-190).
 * إحصائيات سريعة: المرافق ← مرجع دائمًا (لا قراءة لها) · المواقع ← sec
 *   `counts.sites` (sec.functions.ts:366) · `liveOf.sec` · الكاميرات ← execKpis
 *   `cameras_total` · نقاط الدخول ← execKpis `gates_total`
 *   (sec-exec-kpis.functions.ts:267) · كلاهما `liveOf.execKpis`.
 *
 * ── صفّ التشغيل ──
 * أبرز المخاطر ← risk `rows` (risk-board.functions.ts:122-129): العنوان والمنطقة
 *   (`null` ⇐ «لم يُقَس») والشدّة والحالة — بلا رمز موقع ولا زمن · `liveOf.risk`.
 * الحوادث النشطة ← sec `incidents` (العنوان والحالة و`reported_at`؛ لا منطقة
 *   لها، ولا يُعرض `owner` أبدًا — SEC-01 و§3.3) · `liveOf.secIncidents`.
 * الدوريات الميدانية ← sec `patrols` (مسقوفة بـ200) بحالاتها الأربع
 *   (مجدولة · نشطة · مكتملة · فائتة) لا الثلاث المرسومة — الحيّ يُعرض بكلماته
 *   هو · `liveOf.sec`. ونسبة ↑6% مرجعية وحدها.
 * كاميرات مباشرة ← الصور توضيحية دائمًا (N3)؛ والوسوم من sec `cctv`
 *   (`camera_code` و`alert_type`) متى `liveOf.sec`، وإلا وسوم المرجع.
 *
 * ── صفّ التحليلات ──
 * الأداء الأمني للمناطق ← state `regions[].compliance_pct` لكل منطقة
 *   (`!== null`) · `liveOf.state` · الاسم الحيّ «نسبة الامتثال».
 * إحصائيات الحوادث والمخاطر ← مرجع دائمًا: لا سلسلة شهرية في أي قراءة
 *   (البلاغات صفحة 200 صفّ مسقوفة، و`sim_risks` بلا عمود زمن مقروء).
 * توزيع أنواع الحوادث ← sec `incidents[].category` · `liveOf.secIncidents`.
 *   المجموع الحيّ عدد الصفحة المسقوفة، فيُسمّى «آخر N بلاغًا» لا «إجمالي الحوادث».
 * حالة الأنظمة: CCTV ← `cctv_health` (:266) · الدخول ← `access_health` (:269)
 *   · الدوريات ← `patrol_completion` (:277) · IoT ← `sensors_alarming` من
 *   `sensors_total` (:270-271) — كلها execKpis و`liveOf.execKpis`؛
 *   SAP ← مزوّد `sap` في integrations (integrations-hub.functions.ts:250-271)
 *   · `liveOf.provider` · الحيّ كلمة صحّة لا نسبة.
 */
