/**
 * مسوّدة أمر العمل — التحقّق وبناء الحمولة، **منطقٌ خالص**.
 *
 * لماذا خارج المكوّن: النافذة لا تملك مخطط `zod` ولا `react-hook-form` —
 * نموذجها `useState` مسطّح وتحقّقها شرطٌ على `disabled`. فالقاعدة «الموكَّل
 * والمقاول يُرسَلان فعلًا لا يُعرضان فقط» و«الإرجاع يوجب سببًا» لا يمكن
 * إثباتها باختبارٍ يقرأ نصّ JSX. وهنا تُكتب مرّة، ويقرؤها المكوّن والحارس
 * معًا — فما يُختبر هو ما يُرسَل.
 */
import { DEFAULT_ASSIGNEE_TEAM, DEFAULT_CONTRACTOR, FAULT_TYPES } from "./constants";

export type FaultTypeKey = (typeof FAULT_TYPES)[number]["key"];

/** قرار الاعتماد — `none` هو الافتراض: يُنشأ الأمر بانتظار الاعتماد. */
export type ApprovalChoice = "none" | "approve" | "return";

export type WorkOrderDraft = {
  title_ar: string;
  kind: "preventive" | "corrective";
  priority: "low" | "medium" | "high" | "critical";
  fault_type: string;
  /** yyyy-MM-dd أو "" — صيغة حقل التاريخ نفسها، بلا تغيير عقد `due_at`. */
  due_at: string;
  notes: string;
  decision: ApprovalChoice;
};

/** أدنى طول لسبب الإرجاع — «مرفوض» وحدها ليست سببًا يُبنى عليه تصحيح. */
export const RETURN_REASON_MIN = 10;

export const ERR_TITLE_REQUIRED = "العنوان مطلوب";
export const ERR_FAULT_TYPE_REQUIRED = "نوع العطل مطلوب";
export const ERR_RETURN_REASON_REQUIRED = "سبب الإرجاع مطلوب في الملاحظات";

const FAULT_KEYS: ReadonlySet<string> = new Set(FAULT_TYPES.map((f) => f.key));

/** أوّل خطأٍ عربيّ، أو `null` إن صحّت المسوّدة. */
export function validateWorkOrderDraft(draft: WorkOrderDraft): string | null {
  if (draft.title_ar.trim().length < 3) return ERR_TITLE_REQUIRED;
  if (!FAULT_KEYS.has(draft.fault_type)) return ERR_FAULT_TYPE_REQUIRED;
  if (draft.decision === "return" && draft.notes.trim().length < RETURN_REASON_MIN) {
    return ERR_RETURN_REASON_REQUIRED;
  }
  return null;
}

/** تسمية زرّ الإنشاء تتبع القرار — وضوحٌ تنفيذيّ قبل الضغط لا بعده. */
export function createButtonLabel(decision: ApprovalChoice): string {
  if (decision === "approve") return "إنشاء واعتماد";
  if (decision === "return") return "إنشاء وإرجاع";
  return "إنشاء";
}

export type WorkOrderPayload = {
  title_ar: string;
  kind: "preventive" | "corrective";
  priority: "low" | "medium" | "high" | "critical";
  fault_type: string;
  assignee_team: string;
  contractor_name: string;
  due_at?: string;
  notes?: string;
  decision: ApprovalChoice;
};

/**
 * الحمولة المرسَلة إلى الخادم.
 *
 * **الموكَّل والمقاول من الثوابت لا من الحقلين المعروضين**: الحقلان معطّلان
 * في الواجهة، فقراءة قيمتهما منها تجعل تعطيلًا يسقط يومًا يغيّر ما يُكتب في
 * القاعدة. والقيمتان تُرسَلان دائمًا — لا «تُترك للواجهة».
 *
 * ونهاية اليوم المحلي للاستحقاق: أمرُ اليوم نفسه لا يُحسب «متأخرًا» منذ
 * لحظة إنشائه (سلوك محفوظ من ٢٠٢٦/٠٨/٢٠).
 */
export function buildWorkOrderPayload(draft: WorkOrderDraft): WorkOrderPayload {
  return {
    title_ar: draft.title_ar.trim(),
    kind: draft.kind,
    priority: draft.priority,
    fault_type: draft.fault_type,
    assignee_team: DEFAULT_ASSIGNEE_TEAM,
    contractor_name: DEFAULT_CONTRACTOR,
    due_at: draft.due_at ? new Date(`${draft.due_at}T23:59:59`).toISOString() : undefined,
    notes: draft.notes.trim() || undefined,
    decision: draft.decision,
  };
}
