/**
 * SADEED Security Decision Center — deterministic, read-only demonstration.
 * No network calls, database writes, dispatches, or operational approvals.
 * Every returned record is explicitly marked as simulated.
 */
export type SecurityDecisionStatus = "awaiting_human_approval";
export interface SecurityDecisionDemo {
  id: string;
  simulated: true;
  source: "demo_fixture";
  titleAr: string;
  locationAr: string;
  eventAr: string;
  severity: "critical";
  severityReasonAr: string;
  recommendedActionsAr: readonly string[];
  decisionStatus: SecurityDecisionStatus;
  approvalRequired: true;
  auditTrail: readonly { step: string; detailAr: string }[];
}

export function buildUnauthorizedAccessDecisionDemo(): SecurityDecisionDemo {
  const id = "SADEED-DEMO-ACCESS-001";
  const eventAr = "محاولة دخول غير مصرح بها إلى محطة كهربائية (سيناريو افتراضي)";
  return {
    id,
    simulated: true,
    source: "demo_fixture",
    titleAr: "مركز القرار الأمني الذكي — عرض تجريبي",
    locationAr: "محطة كهربائية افتراضية — لا تمثل موقعًا فعليًا",
    eventAr,
    severity: "critical",
    severityReasonAr:
      "تصنيف احترازي محدد مسبقًا للعرض؛ لا يستند إلى بلاغ حقيقي أو بيانات حساسات.",
    recommendedActionsAr: [
      "التحقق من صحة البلاغ ومصدره قبل اتخاذ أي إجراء",
      "إخطار مشرف الأمن الصناعي وفق إجراءات الجهة المعتمدة",
      "مراجعة سجل الدخول وكاميرات الموقع بواسطة الأشخاص المخولين",
      "توثيق نتيجة التحقق ورفع التوصية إلى صاحب الصلاحية",
    ],
    decisionStatus: "awaiting_human_approval",
    approvalRequired: true,
    auditTrail: [
      { step: "intake", detailAr: "استلام بلاغ افتراضي لأغراض العرض فقط" },
      { step: "assessment", detailAr: "تصنيف احترازي تجريبي: حرج" },
      { step: "recommendation", detailAr: "إعداد توصيات للمراجعة البشرية" },
      { step: "approval", detailAr: "بانتظار اعتماد بشري — لم ينفذ أي إجراء" },
    ],
  };
}
