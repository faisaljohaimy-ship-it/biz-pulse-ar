/**
 * PriorityEngine — combines risk, urgency, impact, intent and confidence
 * into a P0/P1/P2/P3/INFO band. Pure function.
 */
import type { AriaIntent } from "../types/aria";
import type { PriorityAssessment, RiskSignal } from "../types/executive";

export const priorityEngine = {
  assess(risk: RiskSignal, intent: AriaIntent): PriorityAssessment {
    const intentBoost = intent === "executive" ? 8 : intent === "engineering" ? 4 : 0;
    const raw =
      risk.probability * 30 + risk.impact * 35 + risk.urgency * 25 + risk.confidence * 10 + intentBoost;
    const score = Math.round(Math.max(0, Math.min(100, raw)));

    let level: PriorityAssessment["level"];
    if (risk.level === "critical" || score >= 85) level = "P0";
    else if (score >= 65) level = "P1";
    else if (score >= 40) level = "P2";
    else if (score >= 20) level = "P3";
    else level = "INFO";

    const reason: Record<PriorityAssessment["level"], { ar: string; en: string }> = {
      P0: { ar: "أولوية قصوى — تأثير وعاجلية مرتفعان.", en: "Top priority — high impact and urgency." },
      P1: { ar: "أولوية عالية — تتطلب إجراءً اليوم.", en: "High priority — action required today." },
      P2: { ar: "أولوية متوسطة — أدرجها في الخطة الأسبوعية.", en: "Medium priority — schedule this week." },
      P3: { ar: "أولوية منخفضة — للمراجعة الدورية.", en: "Low priority — routine review." },
      INFO: { ar: "معلوماتي فقط — لا يلزم إجراء.", en: "Informational only — no action needed." },
    };

    return {
      level,
      score,
      reason_ar: reason[level].ar,
      reason_en: reason[level].en,
    };
  },
};
