/**
 * ExecutionSimulator — describes what would happen if a planned action were
 * executed. Pure. No real side effects. Bilingual output.
 */
import type { ActionDefinition } from "./action-registry";
import type { SimulationReport } from "./execution-envelope";
import type { PriorityAssessment, RiskSignal } from "../types/executive";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export const executionSimulator = {
  simulate(
    action: ActionDefinition,
    risk: RiskSignal,
    priority: PriorityAssessment,
  ): SimulationReport {
    const before = clamp01(risk.probability * 0.6 + risk.impact * 0.4);
    // Preparation-only actions reduce risk by 30–60% by clarifying the path.
    const reduction = action.approvalRequired ? 0.35 : 0.55;
    const after = clamp01(before * (1 - reduction));

    const priorityHint_ar =
      priority.level === "P0" || priority.level === "P1"
        ? "يوصى بتنفيذ الخطوة فور اعتماد الموافقة."
        : "يمكن جدولة الخطوة ضمن الخطة الأسبوعية.";
    const priorityHint_en =
      priority.level === "P0" || priority.level === "P1"
        ? "Execute immediately once approval is granted."
        : "Schedule within the weekly plan.";

    return {
      what_ar: `سيتم تحضير ${action.label_ar} دون تنفيذ فعلي خارجي في هذه المرحلة.`,
      what_en: `${action.label_en} will be prepared without any real external execution in this phase.`,
      expected_result_ar: action.outputHint_ar,
      expected_result_en: action.outputHint_en,
      best_case_ar: "اعتماد المسار المقترح وتقليل المخاطر التشغيلية.",
      best_case_en: "Recommended path is adopted and operational risk is reduced.",
      worst_case_ar: "رفض الموافقة أو الحاجة لبيانات إضافية قبل المتابعة.",
      worst_case_en: "Approval is declined or more data is required before proceeding.",
      risk_before: before,
      risk_after: after,
      recommended_path_ar: priorityHint_ar,
      recommended_path_en: priorityHint_en,
    };
  },
};
