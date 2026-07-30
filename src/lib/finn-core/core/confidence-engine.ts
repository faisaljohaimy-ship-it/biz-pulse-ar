/**
 * ConfidenceEngine — computes evidence-backed confidence.
 * NEVER fabricates. If nothing supports the claim, reliability is "unknown".
 */
import type { ConfidenceReport } from "../types/executive";
import type { ContextAwarenessReport, ReasoningTrace } from "../types/executive";

export const confidenceEngine = {
  assess(context: ContextAwarenessReport, reasoning: ReasoningTrace): ConfidenceReport {
    const evidenceCount = reasoning.evidence.length;
    const availableCtx = context.available_context.length;
    const missingCtx = context.missing_context.length;

    let percent = 20 + evidenceCount * 12 + availableCtx * 5 - missingCtx * 3;
    percent = Math.max(0, Math.min(100, percent));

    let evidence_strength: ConfidenceReport["evidence_strength"];
    if (evidenceCount >= 3) evidence_strength = "strong";
    else if (evidenceCount === 2) evidence_strength = "moderate";
    else if (evidenceCount === 1) evidence_strength = "weak";
    else evidence_strength = "none";

    let reliability: ConfidenceReport["reliability"];
    if (evidence_strength === "none" && availableCtx === 0) reliability = "unknown";
    else if (percent >= 75) reliability = "high";
    else if (percent >= 50) reliability = "medium";
    else reliability = "low";

    const notes_ar: string[] = [];
    const notes_en: string[] = [];
    if (evidence_strength === "none") {
      notes_ar.push("لا توجد أدلة كافية — الاستنتاج تقديري.");
      notes_en.push("No supporting evidence — inference is tentative.");
    }
    if (missingCtx > 0) {
      notes_ar.push(`بيانات سياقية ناقصة: ${context.missing_context.slice(0, 3).join("، ")}`);
      notes_en.push(`Missing context: ${context.missing_context.slice(0, 3).join(", ")}`);
    }
    for (const u of reasoning.uncertainty) {
      notes_en.push(u);
    }

    return {
      percent,
      reliability,
      evidence_strength,
      missing_information: reasoning.missing_data,
      uncertainty_notes_ar: notes_ar,
      uncertainty_notes_en: notes_en,
    };
  },
};
