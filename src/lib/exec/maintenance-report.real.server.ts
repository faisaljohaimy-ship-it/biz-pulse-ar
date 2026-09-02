/**
 * أوامر الصيانة — تصدير SAP PM المرفق (٢٠٢٦/٠٩/٠٢).
 *
 * أمر المالك: «اعكس جميع بيانات الصيانة المرفقة في النظام». المجموعة
 * **249 أمر عمل** بأرقام SAP مميّزة، في `maintenance-report.data.json`.
 *
 * ## بياناتٌ إنتاجية — الشارة مرفوعة بأمر المالك
 *
 * أُدرجت أوّلًا موسومةً «محاكاة مرجعية» لأن اسم الملف
 * (`MaintenanceDummy_Data.xlsx`) يقول تمثيلًا — سابقة المشاريع نفسها.
 * **وأقرّ المالك ٢٠٢٦/٠٩/٠٢: «ارفع شارة المحاكاة، بيانات الصيانة
 * إنتاجية».** فأُزيل `is_simulation` وجُمّدت الصفوف كصفوف
 * `projects-report.real.server`: التجميد هو الآلية لا الزينة —
 * `walkSimulation` يتخطّى `Object.isFrozen`، فلا يُعاد وسم صفٍّ مجمّد
 * حين يمرّ بديل `resilient` على `markSimulation`.
 *
 * **ولم يتغيّر شيء آخر بهذا الأمر:** «إنتاجية» تعني أن القيم حقيقية، لا
 * أن الحقول الغائبة صارت مقيسة — الـ97 بلا أولوية والإغلاق بلا تاريخ
 * والموكَّل بلا عمود تبقى `null` كما قاسها التصدير (المادة ٢٧).
 *
 * ## الخريطة الموثقة (تصدير SAP ← صفّ أمر العمل) — قياس التحويل
 *
 * - `kind`: نوع الأمر HSPM ⇒ وقائية (96) · HSCM ⇒ تصحيحية (153).
 * - `status`: حالة المستخدم Completed ⇒ closed (223) ·
 *   In Progress ⇒ in_progress (13) · PLAN ⇒ open (13).
 * - `priority`: نصّ الأولوية High* ⇒ high (103) · Medium* ⇒ medium (49) ·
 *   **وفارغ في 97 صفًّا ⇒ `null`** يُعرض «لم تُحدَّد» (المادة ٢٧ — جلّها
 *   أوامر وقائية لا يمنحها SAP أولوية، واختلاق «متوسط» لها كذب). نافذة
 *   SLA الحرفية (مثل «High (8H)») محفوظة في الملاحظات.
 * - `asset_kind`: من وصف الموقع الوظيفي — CCTV Systems ⇒ cctv (117) ·
 *   Control Room ⇒ control_room (43) · Physical Security ⇒
 *   physical_security (43) · Access Control Systems ⇒ access_control (40)
 *   · منشآت مفردة ⇒ facility (5) · perimeter (1). والمفاتيح الثلاثة
 *   الجديدة أُضيفت إلى `WO_ASSET_KIND_AR` بعربيّتها.
 * - `asset_code`: رمز الموقع الوظيفي (مثل `1410-QAS-FC-ABFSE-103-C`) —
 *   ممتلئ في كل صفّ، ورقم المعدّة (حين وُجد، 157 صفًّا) في الملاحظات.
 * - `area_ar`: مجموعة التخطيط EOA ⇒ الشرقية (168) · SOA ⇒ الجنوبية (45)
 *   · COA ⇒ الوسطى (19) · WOA ⇒ الغربية (17) — خريطة المشاريع نفسها.
 * - `opened_at`: تاريخ الإنشاء (بدقة يوم — المصدر بلا وقت، فلا وقت
 *   مختلَق). `due_at`: تاريخ الإنهاء الأساسي (243؛ الغائب `null`).
 *
 * ## ما لا يحمله المصدر (المادة ٢٧) — يبقى `null` ولا يُخترع
 *
 * - **`closed_at`**: أعمدة الإنهاء الفعلي كلّها فارغة في التصدير
 *   (Actual finish / Actual Order Finish Date: 0 من 249) ⇒ `null` حتى
 *   للمُغلَقة — الحالة مقيسة والتاريخ غير مقيس، ولا يُستعار من «التاريخ
 *   المرجعي» لأن دلالته في SAP غير محسومة هنا.
 * - **`assigned_to` والمقاول**: لا عمود موكَّل في التصدير — «Entered by»
 *   منشئ الأمر لا منفّذه، فيبقى في الملاحظات «أنشأه: …» ويظهر عمود
 *   الموكَّل «—» صادقًا.
 * - **`site_id`/`building_id`**: لا ربط بمواقع `sec_sites` — رمز الموقع
 *   الوظيفي هو العنوان الحقيقي وقد نُقل كما هو.
 *
 * ## العناوين تبقى كما وردت
 *
 * 140 عنوانًا عربيًّا و109 إنجليزية من المصدر — تُنقل حرفيًّا في
 * `title_ar` و`title_en` معًا (ترجمة سجلّ رسمي اختلاق تسمية، كسابقة
 * المشاريع).
 *
 * ## لماذا `?raw`
 *
 * نصّ خام ثم `JSON.parse` — يُبقي 139KB خارج تحليل tsc وداخل حزمة الخادم
 * وحدها: الوحدة لا تُستورد إلا ديناميكيًّا داخل معالجات دوال الخادم.
 */
import rawMaintenance from "./maintenance-report.data.json?raw";
import type { OmsWorkOrderRow } from "./showcase-simulation.server";

/** صفّ المصدر كما خرج من التحويل المطبَّع. */
export type MaintenanceReportSourceRow = {
  id: string;
  ref: string;
  kind: "preventive" | "corrective";
  status: "open" | "in_progress" | "closed";
  priority: "high" | "medium" | null;
  priority_window: string | null;
  title: string;
  asset_kind: string;
  asset_code: string;
  system_desc: string;
  area_code: string;
  area_ar: string;
  equipment: string | null;
  equipment_desc: string | null;
  opened_at: string;
  due_at: string | null;
  created_by: string | null;
  notification_desc: string | null;
  cycle_text: string | null;
  planned_cost_sar: number;
  actual_cost_sar: number;
};

const SOURCE: readonly MaintenanceReportSourceRow[] = JSON.parse(
  rawMaintenance,
) as MaintenanceReportSourceRow[];

export type RealWorkOrderRow = OmsWorkOrderRow & {
  area_ar: string;
};

/**
 * الملاحظات من المقيس وحده: المنشئ والمعدّة والبلاغ ودورة الصيانة ونافذة
 * الأولوية والتكاليف حين سُجّلت — لا سطر لحقلٍ غائب.
 */
function buildNotes(r: MaintenanceReportSourceRow): string | null {
  const parts: string[] = [];
  if (r.created_by) parts.push(`أنشأه: ${r.created_by}`);
  parts.push(`المجموعة المخططة: ${r.area_code} (${r.area_ar})`);
  if (r.equipment)
    parts.push(`المعدّة: ${r.equipment}${r.equipment_desc ? ` (${r.equipment_desc})` : ""}`);
  if (r.asset_kind === "facility") parts.push(`المنشأة: ${r.system_desc}`);
  if (r.notification_desc) parts.push(`البلاغ: ${r.notification_desc}`);
  if (r.cycle_text) parts.push(`دورة الصيانة: ${r.cycle_text}`);
  if (r.priority_window) parts.push(`نافذة الأولوية: ${r.priority_window}`);
  if (r.planned_cost_sar > 0)
    parts.push(`التكلفة المخططة: ${r.planned_cost_sar.toLocaleString("en-US")} ر.س`);
  if (r.actual_cost_sar > 0)
    parts.push(`التكلفة الفعلية: ${r.actual_cost_sar.toLocaleString("en-US")} ر.س`);
  return parts.length ? parts.join(" · ") : null;
}

/** الترتيب: الأحدث إنشاءً أوّلًا — مرآة الاستعلام الحيّ (`opened_at` تنازليًّا). */
export const REAL_SEC_WORK_ORDERS: readonly RealWorkOrderRow[] = SOURCE.map((r) =>
  // التجميد صفًّا صفًّا: هو ما يمنع `markSimulation` من وسمها (يتخطّى
  // `Object.isFrozen`). والتجميد لا يمنع `sort` أدناه — هي تعيد ترتيب
  // المراجع ولا تمسّ محتواها.
  Object.freeze<RealWorkOrderRow>({
    id: r.id,
    ref: r.ref,
    site_id: null,
    building_id: null,
    asset_kind: r.asset_kind,
    asset_code: r.asset_code,
    kind: r.kind,
    title_ar: r.title,
    title_en: r.title,
    priority: r.priority,
    status: r.status,
    assigned_to: null,
    contractor: null,
    opened_at: r.opened_at,
    due_at: r.due_at,
    closed_at: null,
    approved_at: null,
    approved_by: null,
    completion_notes: null,
    notes: buildNotes(r),
    source_incident_id: null,
    attachments: [],
    area_ar: r.area_ar,
  }),
).sort((a, b) => b.opened_at.localeCompare(a.opened_at) || a.ref.localeCompare(b.ref));

/** عدّادات المجموعة كاملةً — تُحسب مرّة هنا، وتصف الـ249 لا المعروض منها. */
export const REAL_WORK_ORDER_COUNTS = {
  total: REAL_SEC_WORK_ORDERS.length,
  closed: REAL_SEC_WORK_ORDERS.filter((w) => w.status === "closed").length,
  open: REAL_SEC_WORK_ORDERS.filter((w) => w.status === "open").length,
  in_progress: REAL_SEC_WORK_ORDERS.filter((w) => w.status === "in_progress").length,
  preventive: REAL_SEC_WORK_ORDERS.filter((w) => w.kind === "preventive").length,
  corrective: REAL_SEC_WORK_ORDERS.filter((w) => w.kind === "corrective").length,
  priority_high: REAL_SEC_WORK_ORDERS.filter((w) => w.priority === "high").length,
  priority_medium: REAL_SEC_WORK_ORDERS.filter((w) => w.priority === "medium").length,
  priority_unmeasured: REAL_SEC_WORK_ORDERS.filter((w) => w.priority === null).length,
} as const;
