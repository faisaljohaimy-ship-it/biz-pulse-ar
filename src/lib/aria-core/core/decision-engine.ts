/**
 * DecisionEngine — proposes recommended / alternative / escalation actions
 * from risk + priority + confidence. Forces human approval for any
 * state-changing mode.
 */
import type {
  ConfidenceReport,
  DecisionMode,
  DecisionOption,
  DecisionProposal,
  PriorityAssessment,
  RiskSignal,
} from "../types/executive";

const APPROVAL_MODES: ReadonlySet<DecisionMode> = new Set(["act_now", "escalate", "delay"]);

function id(mode: string) {
  return `${mode}_${Math.random().toString(36).slice(2, 8)}`;
}

export const decisionEngine = {
  propose(
    risk: RiskSignal,
    priority: PriorityAssessment,
    confidence: ConfidenceReport,
  ): DecisionProposal {
    let mode: DecisionMode;
    if (confidence.reliability === "unknown" || confidence.evidence_strength === "none") {
      mode = "gather_more_info";
    } else if (risk.level === "critical" || priority.level === "P0") {
      mode = "escalate";
    } else if (priority.level === "P1") {
      mode = "act_now";
    } else if (priority.level === "P2") {
      mode = "recommend";
    } else if (priority.level === "P3") {
      mode = "delay";
    } else {
      mode = "no_action";
    }

    const recommended: DecisionOption | null =
      mode === "no_action"
        ? null
        : {
            id: id(mode),
            label_ar:
              mode === "escalate"
                ? "تصعيد للقيادة التنفيذية"
                : mode === "act_now"
                  ? "التنفيذ الآن"
                  : mode === "delay"
                    ? "الجدولة لاحقاً"
                    : mode === "gather_more_info"
                      ? "جمع مزيد من المعلومات"
                      : "توصية تنفيذية",
            label_en:
              mode === "escalate"
                ? "Escalate to executive leadership"
                : mode === "act_now"
                  ? "Act immediately"
                  : mode === "delay"
                    ? "Schedule for later"
                    : mode === "gather_more_info"
                      ? "Gather more information"
                      : "Executive recommendation",
            expected_outcome_ar: risk.mitigation_ar,
            expected_outcome_en: risk.mitigation_en,
          };

    const alternatives: DecisionOption[] = [];
    if (mode !== "gather_more_info") {
      alternatives.push({
        id: id("gather"),
        label_ar: "طلب توضيح إضافي قبل القرار",
        label_en: "Request further clarification before deciding",
        expected_outcome_ar: "تقليل عدم اليقين قبل اتخاذ إجراء.",
        expected_outcome_en: "Reduce uncertainty before taking action.",
      });
    }
    if (mode !== "no_action") {
      alternatives.push({
        id: id("noop"),
        label_ar: "عدم اتخاذ إجراء الآن",
        label_en: "Take no action at this time",
        expected_outcome_ar: "الاكتفاء بالمراقبة إذا تحسّنت المؤشرات.",
        expected_outcome_en: "Continue monitoring if indicators improve.",
      });
    }

    return {
      mode,
      recommended,
      alternatives,
      immediate_action_ar: mode === "act_now" || mode === "escalate" ? risk.mitigation_ar : null,
      immediate_action_en: mode === "act_now" || mode === "escalate" ? risk.mitigation_en : null,
      delayed_action_ar: mode === "delay" || mode === "recommend" ? risk.mitigation_ar : null,
      delayed_action_en: mode === "delay" || mode === "recommend" ? risk.mitigation_en : null,
      escalate_to: mode === "escalate" ? "executive_leadership" : null,
      operational_impact_ar:
        priority.level === "P0"
          ? "أثر تشغيلي مرتفع محتمل."
          : priority.level === "INFO"
            ? "لا يوجد أثر تشغيلي مادي."
            : "أثر تشغيلي محدود ضمن الوحدة الحالية.",
      operational_impact_en:
        priority.level === "P0"
          ? "Likely high operational impact."
          : priority.level === "INFO"
            ? "No material operational impact."
            : "Contained operational impact within the current module.",
      requires_human_approval: APPROVAL_MODES.has(mode),
    };
  },
};
