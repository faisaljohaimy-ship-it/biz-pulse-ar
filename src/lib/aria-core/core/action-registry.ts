/**
 * ActionRegistry — canonical catalogue of safe action types ARIA can plan.
 * Phase 3: preparation only. No action performs real external work.
 */

export type ActionType =
  | "summarize"
  | "analyze"
  | "draft"
  | "prepare_report"
  | "prepare_email"
  | "prepare_meeting"
  | "prepare_task"
  | "open_route"
  | "suggest_automation"
  | "simulate_decision"
  | "request_approval"
  | "escalate"
  | "no_action";

export interface ActionDefinition {
  readonly type: ActionType;
  readonly label_ar: string;
  readonly label_en: string;
  /** Baseline risk when this action is executed with valid inputs. */
  readonly baselineRisk: "info" | "low" | "medium" | "high" | "critical";
  /** External-communication or data-mutation actions require approval. */
  readonly approvalRequired: boolean;
  /** Minimum role hint — Permission Guard maps this to the caller's role. */
  readonly minimumRole: "viewer" | "operator" | "manager" | "executive" | "system";
  /** Human-readable description of what this action produces. */
  readonly outputHint_ar: string;
  readonly outputHint_en: string;
}

const REGISTRY: Readonly<Record<ActionType, ActionDefinition>> = {
  summarize: {
    type: "summarize",
    label_ar: "تلخيص",
    label_en: "Summarize",
    baselineRisk: "info",
    approvalRequired: false,
    minimumRole: "viewer",
    outputHint_ar: "ملخص تنفيذي قصير.",
    outputHint_en: "Short executive summary.",
  },
  analyze: {
    type: "analyze",
    label_ar: "تحليل",
    label_en: "Analyze",
    baselineRisk: "low",
    approvalRequired: false,
    minimumRole: "viewer",
    outputHint_ar: "تحليل موجّه لهدف تنفيذي.",
    outputHint_en: "Focused analysis for an executive goal.",
  },
  draft: {
    type: "draft",
    label_ar: "صياغة مسودة",
    label_en: "Draft",
    baselineRisk: "low",
    approvalRequired: false,
    minimumRole: "operator",
    outputHint_ar: "مسودة نصية للمراجعة قبل الاستخدام.",
    outputHint_en: "Text draft for review before use.",
  },
  prepare_report: {
    type: "prepare_report",
    label_ar: "تحضير تقرير",
    label_en: "Prepare report",
    baselineRisk: "low",
    approvalRequired: true,
    minimumRole: "manager",
    outputHint_ar: "تقرير جاهز للنشر بعد الموافقة.",
    outputHint_en: "Report ready for publishing after approval.",
  },
  prepare_email: {
    type: "prepare_email",
    label_ar: "تحضير بريد",
    label_en: "Prepare email",
    baselineRisk: "medium",
    approvalRequired: true,
    minimumRole: "operator",
    outputHint_ar: "مسودة بريد جاهزة للإرسال بعد الاعتماد.",
    outputHint_en: "Email draft ready to send after approval.",
  },
  prepare_meeting: {
    type: "prepare_meeting",
    label_ar: "تحضير اجتماع",
    label_en: "Prepare meeting",
    baselineRisk: "low",
    approvalRequired: true,
    minimumRole: "manager",
    outputHint_ar: "دعوة اجتماع بجدول أعمال مقترح.",
    outputHint_en: "Meeting invite with a proposed agenda.",
  },
  prepare_task: {
    type: "prepare_task",
    label_ar: "تحضير مهمة",
    label_en: "Prepare task",
    baselineRisk: "low",
    approvalRequired: false,
    minimumRole: "operator",
    outputHint_ar: "مهمة عمل قابلة للإسناد.",
    outputHint_en: "Assignable work task.",
  },
  open_route: {
    type: "open_route",
    label_ar: "فتح شاشة",
    label_en: "Open route",
    baselineRisk: "info",
    approvalRequired: false,
    minimumRole: "viewer",
    outputHint_ar: "توجيه المستخدم إلى الشاشة المناسبة.",
    outputHint_en: "Navigate the user to the appropriate screen.",
  },
  suggest_automation: {
    type: "suggest_automation",
    label_ar: "اقتراح أتمتة",
    label_en: "Suggest automation",
    baselineRisk: "low",
    approvalRequired: true,
    minimumRole: "manager",
    outputHint_ar: "اقتراح أتمتة عملية متكررة.",
    outputHint_en: "Automation proposal for a recurring process.",
  },
  simulate_decision: {
    type: "simulate_decision",
    label_ar: "محاكاة قرار",
    label_en: "Simulate decision",
    baselineRisk: "info",
    approvalRequired: false,
    minimumRole: "viewer",
    outputHint_ar: "محاكاة نتائج قرار قبل اتخاذه.",
    outputHint_en: "Simulate outcomes before making a decision.",
  },
  request_approval: {
    type: "request_approval",
    label_ar: "طلب موافقة",
    label_en: "Request approval",
    baselineRisk: "medium",
    approvalRequired: true,
    minimumRole: "operator",
    outputHint_ar: "طلب موافقة رسمية لصاحب القرار.",
    outputHint_en: "Formal approval request for the decision owner.",
  },
  escalate: {
    type: "escalate",
    label_ar: "تصعيد",
    label_en: "Escalate",
    baselineRisk: "high",
    approvalRequired: true,
    minimumRole: "manager",
    outputHint_ar: "تصعيد إلى المستوى الأعلى للمراجعة.",
    outputHint_en: "Escalate to the next level for review.",
  },
  no_action: {
    type: "no_action",
    label_ar: "لا يلزم إجراء",
    label_en: "No action",
    baselineRisk: "info",
    approvalRequired: false,
    minimumRole: "viewer",
    outputHint_ar: "لا توجد خطوة تنفيذية مطلوبة الآن.",
    outputHint_en: "No executive step is required right now.",
  },
};

export const actionRegistry = {
  list(): readonly ActionDefinition[] {
    return Object.values(REGISTRY);
  },
  get(type: ActionType): ActionDefinition {
    return REGISTRY[type];
  },
  has(type: string): type is ActionType {
    return Object.prototype.hasOwnProperty.call(REGISTRY, type);
  },
};
