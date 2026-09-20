/**
 * نطاق المنطقة — **عقدٌ واحد** يحكم ما يُعرض في كل سطح.
 *
 * ## العطل الذي وُجد هذا الملفّ لأجله
 *
 * كان `RegionProvider` يبدّل **اللون والاسم** فقط. وقِيس في الشيفرة:
 * `/sec` يكتب في ترويسته `region.labelAr` («الأمن الصناعي — المنطقة
 * الوسطى») ثم ينادي `getSecOverview()` **بلا وسيط منطقة** — فالمناطق
 * الأربع تعرض الأرقام نفسها تحت أربعة عناوين مختلفة.
 *
 * وهذا أسوأ من بياناتٍ عشوائية: عنوانٌ يقول «الوسطى» فوق أرقامٍ عالمية
 * **يُقرأ إثباتًا** عن الوسطى. والقارئ لا يملك ما يكشف به الخطأ.
 *
 * ## القاعدة: لا سطح يعرض بيانات بلا استراتيجية نطاقٍ معلنة
 *
 * لكل مصدر بيانات هنا **تصريحٌ مكتوب** بكيفية انحصاره في المنطقة. وثلاثة
 * منها مشروعة، والرابع ممنوع:
 *
 * - `db-region` — للجدول عمود `region` بقيم `regions.ts` ⇒ يُرشَّح في القاعدة.
 * - `db-region-code` — العمود اسمه `region_code` ⇒ كذلك.
 * - `reference` — لا بُعد منطقة في القاعدة، فتُقدَّم مجموعة `regionSim`
 *   المرجعية الخاصة بالمنطقة. مشروعٌ لأن البديل عرض أرقامٍ عالمية تحت
 *   عنوان منطقة.
 * - `cross-region` — الرقم **غير قابلٍ للتفكيك** بحكم المصدر، فيُعرض
 *   جملةً **ومعلَّمًا أنه لكل المناطق**. مشروع بشرط الإفصاح.
 * - وما لا تصريح له ⇒ يسقط الحارس. **الصمت ليس خيارًا.**
 *
 * ## ولماذا النطاق في العنوان لا في التخزين وحده
 *
 * كان محفوظًا في `localStorage` حصرًا. فرابطٌ يُرسَل من مديرٍ في الشرقية
 * إلى زميلٍ في الجنوبية **يفتح عند كلٍّ منهما على منطقةٍ مختلفة** — ونفس
 * الرابط يعطي رقمين. وهو ما يجعل الإحالة إلى شاشةٍ بعينها مستحيلة في
 * نظامٍ مؤسسيّ.
 *
 * فالعنوان هو المرجع (`?region=central`)، والتخزين تفضيلٌ يُستأنف به عند
 * الدخول بلا وسيط — بهذا الترتيب لا العكس.
 */
import { DEFAULT_REGION_ID, REGIONS, type RegionId } from "@/lib/regions";

/** اسم الوسيط في العنوان — عقدٌ حيّ: تغييره يُيتّم كل رابطٍ مُرسَل. */
export const REGION_PARAM = "region";

/** مفتاح التفضيل المحفوظ — قائمٌ من قبل، لا يُعاد تسميته. */
export const REGION_STORAGE_KEY = "nexios.region";

/** هل النصّ معرّف منطقةٍ صالح؟ */
export function isRegionId(value: unknown): value is RegionId {
  return typeof value === "string" && REGIONS.some((r) => r.id === value);
}

/**
 * ترتيب الأسبقية: **العنوان ثمّ التفضيل ثمّ الافتراضي.**
 *
 * وكلّ مُدخَلٍ يُتحقَّق منه: وسيطٌ مجهول في العنوان (`?region=drop`) يسقط
 * إلى التالي ولا يُمرَّر إلى استعلام.
 */
export function resolveRegionScope(input: {
  readonly fromUrl?: string | null;
  readonly fromStorage?: string | null;
}): RegionId {
  if (isRegionId(input.fromUrl)) return input.fromUrl;
  if (isRegionId(input.fromStorage)) return input.fromStorage;
  return DEFAULT_REGION_ID;
}

/**
 * كيف ينحصر سطحٌ ما في المنطقة.
 *
 * `cross-region` يحمل سببًا إجباريًّا — رقمٌ يُعرض لكل المناطق دون بيان
 * السبب يُقرأ رقمَ المنطقة المعروضة.
 */
export type RegionStrategy =
  | { readonly kind: "db-region"; readonly table: string }
  | { readonly kind: "db-region-code"; readonly table: string }
  | { readonly kind: "reference"; readonly why: string }
  | { readonly kind: "cross-region"; readonly why: string };

/**
 * السجلّ المعلَن — **مصدر الحقيقة لما ينحصر وما لا ينحصر.**
 *
 * يُقرأ في المراجعة قبل أن يُقرأ في الشيفرة: من أراد أن يعرف «هل هذا
 * الرقم يخصّ المنطقة؟» يجد الجواب هنا مكتوبًا، لا مستنبطًا من استعلام.
 */
export const REGION_STRATEGY = {
  /* ── ما يُرشَّح في القاعدة فعلًا ─────────────────────────────────── */
  permits: { kind: "db-region", table: "permits" },
  hcis_assessments: { kind: "db-region", table: "hcis_assessments" },
  hcis_findings: { kind: "db-region", table: "hcis_findings" },
  hcis_inspections: { kind: "db-region", table: "hcis_inspections" },
  hcis_compliance: { kind: "db-region-code", table: "hcis_compliance_status" },

  /* ── ما لا بُعد منطقة له في القاعدة ─────────────────────────────── */
  // `sec_incidents` و`sec_work_orders` لا يحملان منطقة، ولا يصلان إليها
  // عبر `site_id → sec_sites` لأن `sec_circles` نفسه بلا عمود منطقة،
  // ودوائره المبذورة (makkah/jeddah/madinah/taif/tabuk) **كلّها غربية** —
  // فترشيحُ «الوسطى» عليها يعطي صفرًا لا «بيانات الوسطى».
  sec_overview: {
    kind: "reference",
    why: "لا عمود منطقة على sec_* ولا مسار إليها عبر الدوائر (كلّها غربية في البذرة)",
  },
  sec_incidents: {
    kind: "reference",
    why: "sec_incidents بلا عمود منطقة؛ site_id → sec_sites → sec_circles بلا منطقة",
  },
  sec_work_orders: {
    kind: "reference",
    why: "sec_work_orders بلا عمود منطقة؛ نفس سلسلة الدوائر",
  },

  /* ── ما يبقى جملةً بحكم المصدر، ويُفصح عنه ──────────────────────── */
  staff_access_log: {
    kind: "cross-region",
    why: "سجلّ دخولٍ بالرقم الوظيفي — الدخول إلى النظام لا إلى منطقة",
  },
  ai_usage_log: {
    kind: "cross-region",
    why: "استهلاك الذكاء يُحاسَب على المشروع كلّه لا على منطقة",
  },
} as const satisfies Record<string, RegionStrategy>;

export type RegionSurface = keyof typeof REGION_STRATEGY;

/** التصريح المعلن لسطحٍ ما. */
export function strategyOf(surface: RegionSurface): RegionStrategy {
  return REGION_STRATEGY[surface];
}

/** هل يُرشَّح هذا السطح في القاعدة؟ */
export function isDbScoped(surface: RegionSurface): boolean {
  const k = REGION_STRATEGY[surface].kind;
  return k === "db-region" || k === "db-region-code";
}

/** اسم العمود الذي يُرشَّح عليه، أو `null` لغير المُرشَّح في القاعدة. */
export function regionColumnOf(surface: RegionSurface): "region" | "region_code" | null {
  const s = REGION_STRATEGY[surface];
  if (s.kind === "db-region") return "region";
  if (s.kind === "db-region-code") return "region_code";
  return null;
}

/**
 * نصّ الإفصاح لما لا ينحصر — يُعرض بجانب الرقم لا في حاشيةٍ بعيدة.
 *
 * `null` لما ينحصر فعلًا: إفصاحٌ في غير موضعه يُفقد الإفصاحَ معناه.
 */
export function crossRegionNotice(surface: RegionSurface): string | null {
  const s = REGION_STRATEGY[surface];
  return s.kind === "cross-region" ? `لكل المناطق — ${s.why}` : null;
}
