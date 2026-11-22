import {
  buildUnauthorizedAccessDecisionDemo,
  type SecurityDecisionDemo,
} from "./security-decision-demo";

export const SECURITY_DECISION_SCENARIOS = [
  { id: "access", name_ar: "دخول غير مصرح", name_en: "Unauthorized access" },
  { id: "camera", name_ar: "انقطاع كاميرا", name_en: "Camera unavailable" },
  { id: "patrol", name_ar: "تأخر نقطة دورية", name_en: "Missed patrol checkpoint" },
] as const;
export type SecurityDecisionScenarioId = (typeof SECURITY_DECISION_SCENARIOS)[number]["id"];
export interface SecurityDecisionScenario extends Omit<SecurityDecisionDemo, "severity"> {
  severity: "critical" | "high";
  ownerAr: string;
  ownerEn: string;
  reviewWindowMinutes: number;
  alternatives: readonly {
    titleAr: string;
    titleEn: string;
    tradeoffAr: string;
    tradeoffEn: string;
  }[];
}

/** Reuses the existing local fixture and reducer; no operational engine or integration. */
export function buildSecurityDecisionScenario(
  id: SecurityDecisionScenarioId,
): SecurityDecisionScenario {
  const base = buildUnauthorizedAccessDecisionDemo();
  const highAudit = base.auditTrail.map((entry) =>
    entry.step === "assessment"
      ? {
          ...entry,
          detailAr: "تصنيف احترازي تجريبي: مرتفع",
          detailEn: "Preset precautionary demo classification: high",
        }
      : entry,
  );
  const common = {
    ...base,
    ownerAr: "مشرف الأمن المناوب · دور افتراضي",
    ownerEn: "Duty security supervisor · fictional role",
    reviewWindowMinutes: 15,
    alternatives: [
      {
        titleAr: "التحقق قبل التصعيد",
        titleEn: "Verify before escalation",
        tradeoffAr: "يقلل التصعيد الخاطئ؛ يتطلب أدلة إضافية ومراجعة بشرية.",
        tradeoffEn: "Reduces false escalation; requires more evidence and human review.",
      },
      {
        titleAr: "إحالة التوصية لصاحب الصلاحية",
        titleEn: "Refer to the authorized decision-maker",
        tradeoffAr: "يسرّع المراجعة؛ لا يمنح إذنًا للتنفيذ ولا يرسل إخطارًا في العرض.",
        tradeoffEn:
          "Prioritizes review; grants no execution authority and sends no notification in this demo.",
      },
    ],
  };
  if (id === "access") return common;
  if (id === "camera")
    return {
      ...common,
      id: "SADEED-DEMO-CAMERA-002",
      severity: "high",
      auditTrail: highAudit,
      reviewWindowMinutes: 30,
      ownerAr: "مشرف أنظمة المراقبة · دور افتراضي",
      ownerEn: "Surveillance supervisor · fictional role",
      eventAr: "انقطاع كاميرا في نقطة دخول افتراضية (سيناريو افتراضي)",
      eventEn: "Camera unavailable at a fictional entry point (fictional scenario)",
      severityReasonAr:
        "أولوية مرتفعة محددة مسبقًا لاحتمال وجود فجوة رؤية؛ لا يوجد بث أو قياس توافر حقيقي.",
      severityReasonEn:
        "Preset high priority for a possible visibility gap; no live feed or measured availability exists.",
      recommendedActionsAr: [
        "التحقق من سجل الانقطاع الافتراضي ومصدره",
        "مراجعة نطاق الرؤية البديل بواسطة المخولين",
        "اقتراح فحص فني لصاحب الصلاحية دون إنشاء أمر عمل",
        "توثيق التوصية قبل أي معالجة ميدانية",
      ],
      recommendedActionsEn: [
        "Verify the synthetic outage record and its source",
        "Have authorized personnel review alternative visibility",
        "Propose technical inspection without creating a work order",
        "Document the recommendation before any field response",
      ],
      evidence: [
        {
          id: "camera-outage",
          simulated: true,
          labelAr: "إشارة انقطاع افتراضية",
          labelEn: "Synthetic outage signal",
          detailAr: "إشارة مكتوبة للشرح فقط؛ لا اتصال بكاميرا أو نظام مراقبة.",
          detailEn: "An illustrative fixture only; no camera or surveillance system connection.",
          status: "unverified",
        },
      ],
    };
  if (id === "patrol")
    return {
      ...common,
      id: "SADEED-DEMO-PATROL-003",
      severity: "high",
      auditTrail: highAudit,
      reviewWindowMinutes: 20,
      ownerAr: "مشرف الدوريات · دور افتراضي",
      ownerEn: "Patrol supervisor · fictional role",
      eventAr: "تأخر نقطة تحقق لدورية افتراضية (سيناريو افتراضي)",
      eventEn: "Missed checkpoint for a fictional patrol (fictional scenario)",
      severityReasonAr:
        "أولوية مرتفعة محددة مسبقًا لعدم تأكد التغطية؛ التأخر الافتراضي لا يثبت حادثًا أو تقصيرًا.",
      severityReasonEn:
        "Preset high priority for uncertain coverage; a synthetic delay proves neither an incident nor misconduct.",
      recommendedActionsAr: [
        "التحقق من اكتمال سجل نقطة التحقق ومصدر التوقيت",
        "مراجعة خطة التغطية الافتراضية مع المشرف",
        "اقتراح وسيلة تحقق بديلة دون توجيه أفراد أو مركبات",
        "رفع النتيجة لصاحب الصلاحية وتوثيق عدم اليقين",
      ],
      recommendedActionsEn: [
        "Verify checkpoint record completeness and its time source",
        "Review the fictional coverage plan with the supervisor",
        "Propose alternative verification without dispatching people or vehicles",
        "Refer findings to the decision-maker and document uncertainty",
      ],
      evidence: [
        {
          id: "patrol-gap",
          simulated: true,
          labelAr: "سجل نقطة افتراضي غير مكتمل",
          labelEn: "Incomplete synthetic checkpoint record",
          detailAr:
            "لا تتبع أفراد أو مواقع حقيقية؛ السجل الافتراضي يحتاج تحققًا ولا يثبت غياب الدورية.",
          detailEn:
            "No real personnel or location tracking; the fictional record needs verification and does not prove patrol absence.",
          status: "needs_verification",
        },
      ],
    };
  throw new RangeError("Unknown synthetic scenario");
}
