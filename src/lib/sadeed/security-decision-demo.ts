/**
 * SADEED Security Decision Center — deterministic, read-only demonstration.
 * No network calls, database writes, dispatches, or operational approvals.
 * Every returned record is explicitly marked as simulated.
 */
export type SecurityDecisionStatus = "awaiting_human_approval";

/** Exact synthetic page only; neighboring operational routes still collect attribution. */
export function isSecurityDecisionDemoRoute(pathname: string): boolean {
  return pathname === "/sec/decision-center" || pathname === "/sec/decision-center/";
}
export interface SecurityDecisionAuditEntry {
  step: string;
  detailAr: string;
  detailEn: string;
}

export interface SecurityDecisionEvidence {
  id: string;
  simulated: true;
  labelAr: string;
  labelEn: string;
  detailAr: string;
  detailEn: string;
  status: "unverified" | "needs_verification";
}

export interface SecurityDecisionDemo {
  id: string;
  simulated: true;
  source: "demo_fixture";
  titleAr: string;
  titleEn: string;
  locationAr: string;
  locationEn: string;
  eventAr: string;
  eventEn: string;
  severity: "critical";
  severityReasonAr: string;
  severityReasonEn: string;
  recommendedActionsAr: readonly string[];
  recommendedActionsEn: readonly string[];
  evidence: readonly SecurityDecisionEvidence[];
  decisionStatus: SecurityDecisionStatus;
  approvalRequired: true;
  auditTrail: readonly SecurityDecisionAuditEntry[];
}

export function buildUnauthorizedAccessDecisionDemo(): SecurityDecisionDemo {
  const id = "SADEED-DEMO-ACCESS-001";
  const eventAr = "محاولة دخول غير مصرح بها إلى محطة كهربائية (سيناريو افتراضي)";
  return {
    id,
    simulated: true,
    source: "demo_fixture",
    titleAr: "مركز القرار الأمني الذكي — عرض تجريبي",
    titleEn: "Intelligent Security Decision Center — Demonstration",
    locationAr: "محطة كهربائية افتراضية — لا تمثل موقعًا فعليًا",
    locationEn: "Fictional electrical substation — not a real facility",
    eventAr,
    eventEn: "Unauthorized access attempt at an electrical substation (fictional scenario)",
    severity: "critical",
    severityReasonAr: "تصنيف احترازي محدد مسبقًا للعرض؛ لا يستند إلى بلاغ حقيقي أو بيانات حساسات.",
    severityReasonEn:
      "A preset precautionary classification for demonstration; not based on a real report or sensor data.",
    recommendedActionsAr: [
      "التحقق من صحة البلاغ ومصدره قبل اتخاذ أي إجراء",
      "إخطار مشرف الأمن الصناعي وفق إجراءات الجهة المعتمدة",
      "مراجعة سجل الدخول وكاميرات الموقع بواسطة الأشخاص المخولين",
      "توثيق نتيجة التحقق ورفع التوصية إلى صاحب الصلاحية",
    ],
    recommendedActionsEn: [
      "Verify the report and its source before taking any action",
      "Notify the industrial security supervisor under the organization's approved procedures",
      "Have authorized personnel review access logs and site cameras",
      "Document the verification outcome and submit the recommendation to the authorized decision maker",
    ],
    evidence: [
      {
        id: "demo-access-log",
        simulated: true,
        labelAr: "سجل دخول افتراضي",
        labelEn: "Synthetic access log",
        detailAr: "بطاقة غير صالحة في بيانات السيناريو فقط؛ يلزم التحقق من المصدر.",
        detailEn: "An invalid badge in the scenario fixture only; source verification is required.",
        status: "needs_verification",
      },
      {
        id: "demo-camera-reference",
        simulated: true,
        labelAr: "مرجع كاميرا افتراضي",
        labelEn: "Synthetic camera reference",
        detailAr: "لا توجد صور أو بث مباشر؛ مراجعة الكاميرات توصية للمخولين فقط.",
        detailEn:
          "No images or live feed are available; camera review is a recommendation for authorized personnel only.",
        status: "unverified",
      },
      {
        id: "demo-site-context",
        simulated: true,
        labelAr: "سياق منشأة افتراضية",
        labelEn: "Fictional facility context",
        detailAr: "منشأة كهربائية افتراضية؛ لا توجد إحداثيات أو هوية أشخاص أو بيانات تشغيلية.",
        detailEn:
          "A fictional electrical facility with no coordinates, personal identities, or operational data.",
        status: "unverified",
      },
    ],
    decisionStatus: "awaiting_human_approval",
    approvalRequired: true,
    auditTrail: [
      {
        step: "intake",
        detailAr: "استلام بلاغ افتراضي لأغراض العرض فقط",
        detailEn: "A fictional report received for demonstration only",
      },
      {
        step: "assessment",
        detailAr: "تصنيف احترازي تجريبي: حرج",
        detailEn: "Preset precautionary demo classification: critical",
      },
      {
        step: "recommendation",
        detailAr: "إعداد توصيات للمراجعة البشرية",
        detailEn: "Recommendations prepared for human review",
      },
      {
        step: "approval",
        detailAr: "بانتظار اعتماد بشري — لم ينفذ أي إجراء",
        detailEn: "Awaiting human approval — no action has been executed",
      },
    ],
  };
}

export type SecurityDecisionDemoStage =
  "idle" | "assessment" | "recommendation" | "awaiting_review" | "reviewed" | "needs_verification";

export interface SecurityDecisionDemoState {
  readonly stage: SecurityDecisionDemoStage;
  readonly simulated: true;
  readonly operationalApproval: false;
  readonly executedActions: readonly [];
  readonly auditTrail: readonly SecurityDecisionAuditEntry[];
}

export type SecurityDecisionDemoAction =
  | { type: "start" }
  | { type: "advance" }
  | { type: "review"; outcome: "reviewed" | "needs_verification" }
  | { type: "reset" };

export function createSecurityDecisionDemoState(): SecurityDecisionDemoState {
  return {
    stage: "idle",
    simulated: true,
    operationalApproval: false,
    executedActions: [],
    auditTrail: [],
  };
}

/** Local presentation state only. Review outcomes never grant operational approval. */
export function securityDecisionDemoReducer(
  state: SecurityDecisionDemoState,
  action: SecurityDecisionDemoAction,
): SecurityDecisionDemoState {
  if (action.type === "reset") return createSecurityDecisionDemoState();

  let stage: SecurityDecisionDemoStage;
  let entry: SecurityDecisionAuditEntry;
  if (action.type === "start" && state.stage === "idle") {
    stage = "assessment";
    entry = {
      step: "intake",
      detailAr: "بدء تحليل السيناريو الافتراضي محليًا؛ لم يُستقبل بلاغ حقيقي",
      detailEn: "Local analysis of the fictional scenario started; no real report was received",
    };
  } else if (action.type === "advance" && state.stage === "assessment") {
    stage = "recommendation";
    entry = {
      step: "assessment",
      detailAr: "عرض التصنيف الاحترازي المحدد مسبقًا والأدلة الافتراضية غير المتحققة",
      detailEn:
        "Displayed the preset precautionary classification and unverified synthetic evidence",
    };
  } else if (action.type === "advance" && state.stage === "recommendation") {
    stage = "awaiting_review";
    entry = {
      step: "recommendation",
      detailAr: "عرض التوصيات للمراجعة البشرية؛ لم ينفذ أي إجراء",
      detailEn: "Displayed recommendations for human review; no action has been executed",
    };
  } else if (
    action.type === "review" &&
    state.stage === "awaiting_review" &&
    (action.outcome === "reviewed" || action.outcome === "needs_verification")
  ) {
    stage = action.outcome;
    entry =
      action.outcome === "reviewed"
        ? {
            step: "review",
            detailAr:
              "اكتملت المراجعة التجريبية محليًا فقط؛ الاعتماد الفعلي ما زال مطلوبًا ولم ينفذ أي إجراء",
            detailEn:
              "Demo review completed locally only; actual approval is still required and no action has been executed",
          }
        : {
            step: "review",
            detailAr: "أعيدت التوصية للتحقق في المحاكاة فقط؛ لم يُرسل طلب ولم ينفذ أي إجراء",
            detailEn:
              "Recommendation returned for verification in the simulation only; no request was sent and no action has been executed",
          };
  } else {
    return state;
  }

  return { ...state, stage, auditTrail: [...state.auditTrail, entry] };
}
