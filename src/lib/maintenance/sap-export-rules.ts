/**
 * قواعد تحويل «تصدير SAP PM» (أوامر العمل — IW38) إلى أوامر `maint_orders` —
 * أمر المالك ٢٠٢٦/١٠/٠٦: «ازل بيانات المحاكاة واعتمد هذه البيانات المرفقة
 * كبيانات فعلية وحقيقية».
 *
 * الملف (`MaintenanceDummy_Data.xlsx`) هو نفسه تصدير الـ249 أمرًا المعتمد
 * إنتاجيًّا بأمر المالك ٢٠٢٦/٠٩/٠٢ («ارفع شارة المحاكاة، بيانات الصيانة
 * إنتاجية») — اسمه يقول «Dummy» ومضمونه تصدير SAP حقيقي البنية. والخريطة
 * هنا هي الخريطة الموثقة في `maintenance-report.real.server.ts` نفسها، مع
 * تصحيحٍ هندسي واحد مقيس (انظر `sapStatus`).
 *
 * دوالّ خالصة بصياغة TypeScript قابلة للنزع (يستوردها سكربت الاستيراد عبر
 * `node --experimental-strip-types`).
 */
// مسارٌ نسبيّ بامتداده: يستورده سكربت الاستيراد تحت Node حيث لا يُحلّ `@/`.
import { cleanText, toIsoDate, toNumber } from "./cm-log-rules.ts";
import type { OrderStatus, Stage } from "./cm-log-rules.ts";

export type MaintKind = "corrective" | "preventive";
export type MaintRegion = "central" | "western" | "eastern" | "southern";
export type SapSystem = "CCTV" | "GATE" | "ACS" | "CONTROL" | "PIDS";

/** نوع الأمر: HSPM وقائية · HSCM تصحيحية. غيرهما ⇐ `null` (لا تخمين). */
export function sapKind(orderType: string | null | undefined): MaintKind | null {
  const t = (orderType ?? "").trim().toUpperCase();
  if (t === "HSPM") return "preventive";
  if (t === "HSCM") return "corrective";
  return null;
}

/**
 * مجموعة التخطيط ⇐ المنطقة (معرّفات `regions.ts`، المرجع الجغرافي الوحيد).
 * EOA الشرقية · SOA الجنوبية · COA الوسطى · WOA الغربية — الخريطة نفسها
 * المعتمدة في التصدير السابق.
 */
export function plannerRegion(group: string | null | undefined): MaintRegion | null {
  switch ((group ?? "").trim().toUpperCase()) {
    case "EOA":
      return "eastern";
    case "SOA":
      return "southern";
    case "COA":
      return "central";
    case "WOA":
      return "western";
    default:
      return null;
  }
}

/**
 * وصف الموقع الوظيفي ⇐ النظام. «Control Room» (شاشات ومحطات عمل وتغذية
 * احتياطية) نظامٌ قائم بذاته في SAP فيُحفظ كذلك (`CONTROL`) لا يُذاب في
 * الكاميرات؛ و«Perimeter Intrusion» ⇐ `PIDS`. وما كان اسم منشأة مفردة (خمسة
 * صفوف) ⇐ `null` «غير محدّد» — لا نظام يُستنتج من اسم مبنى.
 */
export function sapSystem(flDescription: string | null | undefined): SapSystem | null {
  const d = (flDescription ?? "").trim().toLowerCase();
  if (d === "cctv systems") return "CCTV";
  if (d === "physical security") return "GATE";
  if (d === "access control systems") return "ACS";
  if (d === "control room") return "CONTROL";
  if (d.startsWith("perimeter in")) return "PIDS";
  return null;
}

/** اسم المنشأة حين يكون وصف الموقع الوظيفي اسم منشأة لا نظامًا. */
export function sapFacilityName(flDescription: string | null | undefined): string | null {
  const d = (flDescription ?? "").replace(/\s+/g, " ").trim();
  return d && sapSystem(d) === null ? d : null;
}

/**
 * الحالة والمرحلة من حالة المستخدم وحالة النظام معًا.
 *
 * - **Completed** ⇐ مُنجز/مغلق ١٠٠٪ (وعلامة الحذف DLFL بعد الإنجاز أرشفةٌ لا إلغاء).
 * - **In Progress** (REL — مُطلق للتنفيذ، وكلفةٌ مرحَّلة) ⇐ مفتوح «الفني في
 *   الموقع» ٣٥٪: أدنى مرحلة يسندها الدليل — بدأ التنفيذ، ولا دليل على أبعد منه.
 * - **PLAN مع CLSD + DLFL + NCMP** ⇐ **ملغى**: أُغلق في SAP دون إنجاز وعليه علامة
 *   حذف وبلا كلفة. *تصحيحٌ هندسي* للخريطة السابقة التي عدّتها «مفتوحة» —
 *   فكانت ١٣ صيانةً وقائية ملغاة تُحسب أوامرَ معلّقة متأخرة.
 * - **PLAN** بلا ذلك ⇐ مفتوح «مسجَّل» ١٠٪.
 * - غير ذلك ⇐ `null` — يُتخطّى الصفّ ويُبلَّغ، لا يُخمَّن.
 */
export function sapStatus(
  userStatus: string | null | undefined,
  systemStatus: string | null | undefined,
): { status: OrderStatus; stage: Stage } | null {
  const u = (userStatus ?? "").trim().toLowerCase();
  const sys = new Set((systemStatus ?? "").toUpperCase().split(/\s+/).filter(Boolean));
  if (u === "completed") return { status: "completed", stage: "closed" };
  if (u === "in progress") return { status: "open", stage: "on_site" };
  if (u === "plan") {
    if (sys.has("CLSD") && sys.has("DLFL") && sys.has("NCMP"))
      return { status: "cancelled", stage: "registered" };
    return { status: "open", stage: "registered" };
  }
  return null;
}

/**
 * الأولوية من نصّها: High* ⇐ high · Medium* ⇐ medium · فارغ ⇐ `null` «لم تُحدَّد»
 * (جلّها وقائية لا يمنحها SAP أولوية — اختلاق «متوسطة» لها كذب، المادة ٢٧).
 */
export function sapPriority(text: string | null | undefined): "high" | "medium" | null {
  const t = (text ?? "").trim().toLowerCase();
  if (t.startsWith("high")) return "high";
  if (t.startsWith("medium")) return "medium";
  return null;
}

/**
 * «Entered by»: رقمٌ من ٥–٦ أرقام ⇐ الرقم الوظيفي لمنشئ الأمر (صيغة أرقام
 * المنشأة نفسها في `staff-entry.ts`). ورمز `IP…` ⇐ أمرٌ ولّدته خطة صيانة
 * وقائية آليًّا — لا موظف، فلا رقم وظيفي.
 */
export function sapEnteredBy(v: unknown): { staff: string | null; planGenerated: boolean } {
  const s = String(v ?? "").trim();
  if (/^\d{5,6}$/.test(s)) return { staff: s, planGenerated: false };
  return { staff: null, planGenerated: /^IP\d+$/i.test(s) };
}

// ── صفّ التصدير ⇐ أمر عمل ─────────────────────────────────────────────────

/** أعمدة التصدير بفهارسها (ورقة IW38 كما قيست — ٤١ عمودًا). */
export const SAP_COL = {
  order: 0,
  orderType: 1,
  systemStatus: 2,
  userStatus: 3,
  priorityText: 5,
  description: 6,
  techObjectDesc: 7,
  objectTypeName: 8,
  equipment: 10,
  functionalLocation: 11,
  flDescription: 12,
  plannerGroup: 13,
  createdOn: 14,
  enteredBy: 15,
  basicFinish: 20,
  plannedCost: 28,
  actualCost: 29,
  notification: 30,
  maintenancePlan: 33,
  cycleText: 35,
} as const;

export interface SapOrderImport {
  ref: string;
  source_row: number;
  kind: MaintKind;
  region: MaintRegion | null;
  site: string | null;
  system: SapSystem | null;
  component: string | null;
  description: string | null;
  priority: "high" | "medium" | null;
  status: OrderStatus;
  stage: Stage;
  requested_at: string | null;
  due_at: string | null;
  sap_wo: string;
  maintenance_cost: number | null;
  planned_cost: number | null;
  functional_location: string | null;
  equipment: string | null;
  planner_group: string | null;
  entered_by_staff: string | null;
  plan_generated: boolean;
  sla_text: string | null;
  sap_system_status: string | null;
  notification: string | null;
  maintenance_plan: string | null;
  maintenance_cycle: string | null;
}

export type SapSkip = { sourceRow: number; reason: "no_order" | "unknown_kind" | "unknown_status" };

/**
 * صفّ التصدير ⇐ أمر. `completed_at` لا يُملأ: أعمدة الإنهاء الفعلي فارغة في
 * التصدير كلّه — الحالة مقيسة والتاريخ غير مقيس (المادة ٢٧). والكلفة الفعلية
 * تُنقل كما هي ولو صفرًا: صفر SAP قيمةٌ مسجَّلة لا غياب.
 */
export function toSapOrder(r: readonly unknown[], sourceRow: number): SapOrderImport | SapSkip {
  const order = cleanText(r[SAP_COL.order]);
  if (!order || !/^\d{8,12}$/.test(order)) return { sourceRow, reason: "no_order" };
  const kind = sapKind(cleanText(r[SAP_COL.orderType]));
  if (!kind) return { sourceRow, reason: "unknown_kind" };
  const st = sapStatus(cleanText(r[SAP_COL.userStatus]), cleanText(r[SAP_COL.systemStatus]));
  if (!st) return { sourceRow, reason: "unknown_status" };
  const fl = cleanText(r[SAP_COL.flDescription]);
  const by = sapEnteredBy(r[SAP_COL.enteredBy]);
  return {
    ref: order,
    source_row: sourceRow,
    kind,
    region: plannerRegion(cleanText(r[SAP_COL.plannerGroup])),
    site: sapFacilityName(fl),
    system: sapSystem(fl),
    component: cleanText(r[SAP_COL.objectTypeName]) ?? cleanText(r[SAP_COL.techObjectDesc]),
    description: cleanText(r[SAP_COL.description]),
    priority: sapPriority(cleanText(r[SAP_COL.priorityText])),
    status: st.status,
    stage: st.stage,
    requested_at: toIsoDate(r[SAP_COL.createdOn]),
    due_at: toIsoDate(r[SAP_COL.basicFinish]),
    sap_wo: order,
    maintenance_cost: toNumber(r[SAP_COL.actualCost]),
    planned_cost: toNumber(r[SAP_COL.plannedCost]),
    functional_location: cleanText(r[SAP_COL.functionalLocation]),
    equipment: cleanText(r[SAP_COL.equipment]),
    planner_group: cleanText(r[SAP_COL.plannerGroup])?.toUpperCase() ?? null,
    entered_by_staff: by.staff,
    plan_generated: by.planGenerated,
    sla_text: cleanText(r[SAP_COL.priorityText]),
    sap_system_status: cleanText(r[SAP_COL.systemStatus]),
    notification: cleanText(r[SAP_COL.notification]),
    maintenance_plan: cleanText(r[SAP_COL.maintenancePlan]),
    maintenance_cycle: cleanText(r[SAP_COL.cycleText]),
  };
}
