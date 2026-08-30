/**
 * مشاريع الأمن الصناعي — تصدير «Projects Data» (٢٠٢٦/٠٨/٣٠).
 *
 * أمر المالك: «هذي بيانات المشاريع في قطاع الأمن الصناعي اعكسها في النظام».
 * المجموعة **697 مشروعًا** بأكواد مميّزة، في `projects-report.data.json`.
 *
 * ## لماذا تبقى موسومةً محاكاةً مرجعية (وهذا مُبلَّغ للمالك)
 *
 * الصفوف هنا **لا تُجمَّد**، خلافًا لـ`event-report.real.server` — والفرق
 * مقصود: ذاك جاء بأمرٍ صريح («استبدال المحاكاة بتطبيق الملفات **الحقيقية
 * الحية**»)، وهذا مصدره ملفٌّ اسمه `Projects_Data_Dummy.xlsx` وبريده
 * `@demo-energy.example`. فبنيته حقيقية وقيمه تمثيلية. وترك
 * `markSimulation` يسمها هو ما يُبقي الشارة ظاهرة — والادّعاء بأنها قياسٌ
 * حيّ يخالف المادة ٢٧. تُرفع الشارة بأمرٍ صريح من المالك متى صارت المجموعة
 * إنتاجية.
 *
 * ## الحقيقة الصارمة (المادة ٢٧) — ما لا يحمله المصدر
 *
 * - **الصحّة (`health`)**: مصرَّح بها في **158 صفًّا من 697** فقط
 *   (تصنيف المخاطر + تحليل التأخّر). الباقي `null` ⇒ «لم تُقَس».
 *   الاشتقاق المكتوب: `AT Risk` ⇒ أحمر · `Delayed` ⇒ كهرماني ·
 *   `No Risk`+`On Track` ⇒ أخضر · وما عداه `null`.
 *   القياس: 10 أحمر · 14 كهرماني · 134 أخضر · **539 لم تُقَس**.
 * - **المقاول**: لا عمود له في المصدر إطلاقًا ⇒ `null` في كل صفّ.
 * - **الدائرة (`circle_id`)**: المصدر يحمل «منطقة عمليات» و«خطّ أعمال»،
 *   وهما تصنيفٌ آخر غير دوائر `sec_circles` (مواقع بإحداثيات وعدد موظفين).
 *   مطابقتهما اختلاق تصنيف ⇒ `null`، ويُعرض البديل الحقيقي: منطقة
 *   العمليات والموقع وخطّ الأعمال.
 * - **التواريخ**: البداية في 285 صفًّا والنهاية في 312 من 697 ⇒ الباقي
 *   `null` ويُعرض «لم يُحدَّد» بصيغة الصفحة القائمة.
 *
 * ## أسماء المشاريع تبقى كما وردت
 *
 * التصدير لا يحمل اسمًا عربيًّا لأي مشروع. وترجمة **اسم مشروع رسميّ**
 * اختلاقُ تسمية لا توطينُ مصطلح، فتبقى الأسماء حرفيةً في `name_ar`
 * و`name_en` معًا. أمّا مفردات النظام والموقع وخطّ الأعمال فقوائم مغلقة
 * تُترجَم بلا اختلاق، وهي ما يمنح البطاقة وجهها العربي.
 *
 * ## لماذا `?raw`
 *
 * نصٌّ خام ثم `JSON.parse` — يُبقي 375KB خارج تحليل tsc (لا استدلال نوع
 * على 697 صفًّا) وداخل حزمة الخادم وحدها: هذه الوحدة لا تُستورد إلا
 * ديناميكيًّا داخل معالج دالّة الخادم، فلا تبلغ حزمة العميل.
 */
import rawProjects from "./projects-report.data.json?raw";
import type { SecProject } from "@/lib/sec.functions";

/** صفّ المصدر كما خرج من التحويل المطبَّع. */
export type ProjectsReportSourceRow = {
  id: string;
  ref: string;
  name: string;
  kind_ar: string;
  area_code: string | null;
  area_ar: string | null;
  region_id: string | null;
  location_ar: string | null;
  business_ar: string | null;
  status: string;
  progress: number;
  health: "green" | "amber" | "red" | null;
  budget_sar: number;
  spent_sar: number;
  starts_at: string | null;
  ends_at: string | null;
  manager: string | null;
  contractor: null;
  sites: number | null;
  sites_completed: number | null;
};

const SOURCE: readonly ProjectsReportSourceRow[] = JSON.parse(
  rawProjects,
) as ProjectsReportSourceRow[];

/**
 * الترتيب: الأقرب نهايةً أوّلًا — مرآةُ ترتيب الاستعلام الحيّ
 * (`order("ends_at", { ascending: true })`)، وما لا نهاية له يُذيَّل بدل أن
 * يتصدّر بقيمةٍ فارغة.
 */
export const REAL_SEC_PROJECTS: readonly SecProject[] = SOURCE.map(
  (p) =>
    ({
      id: p.id,
      ref: p.ref,
      circle_id: null,
      name_ar: p.name,
      name_en: p.name,
      kind: p.kind_ar,
      status: p.status,
      progress: p.progress,
      budget_sar: p.budget_sar,
      spent_sar: p.spent_sar,
      starts_at: p.starts_at,
      ends_at: p.ends_at,
      manager: p.manager,
      contractor: null,
      health: p.health,
      area_ar: p.area_ar,
      location_ar: p.location_ar,
      business_ar: p.business_ar,
    }) satisfies SecProject,
).sort((a, b) => {
  if (a.ends_at === b.ends_at) return a.ref.localeCompare(b.ref);
  if (!a.ends_at) return 1;
  if (!b.ends_at) return -1;
  return a.ends_at.localeCompare(b.ends_at);
});

/**
 * عدّادات المجموعة كاملةً — تُحسب مرّةً هنا لا في الصفحة، فبطاقات الإحصاء
 * تصف الـ697 لا الصفحةَ المعروضة منها.
 *
 * و`health_unmeasured` معلومةٌ تُعرض لا تُطوى: أن يكون ثلثا المشاريع بلا
 * تقييم مخاطر **حقيقةٌ إدارية** تستحق الظهور، وإخفاؤها خلف لونٍ افتراضي
 * هو ما يصنع لوحةً تكذب بلطف.
 */
export const REAL_PROJECT_COUNTS = {
  total: REAL_SEC_PROJECTS.length,
  in_progress: REAL_SEC_PROJECTS.filter((p) => p.status === "in-progress").length,
  completed: REAL_SEC_PROJECTS.filter((p) => p.status === "completed").length,
  cancelled: REAL_SEC_PROJECTS.filter((p) => p.status === "cancelled").length,
  health_red: REAL_SEC_PROJECTS.filter((p) => p.health === "red").length,
  health_amber: REAL_SEC_PROJECTS.filter((p) => p.health === "amber").length,
  health_green: REAL_SEC_PROJECTS.filter((p) => p.health === "green").length,
  health_unmeasured: REAL_SEC_PROJECTS.filter((p) => p.health === null).length,
} as const;
