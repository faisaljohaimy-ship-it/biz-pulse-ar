/**
 * ExecutiveReasoning — the intent-understanding + interpretation layer.
 * Pure client-side heuristics; the actual narrative comes from the LLM
 * stream. This engine produces the *internal reasoning frame* that other
 * engines (risk/priority/decision/confidence) score against.
 */
import type { AriaContextSnapshot, AriaIntent } from "../types/aria";
import type { ReasoningTrace } from "../types/executive";

function firstSentence(text: string): string {
  const m = text.match(/[^.!?؟\n]{4,240}[.!?؟]?/);
  return (m ? m[0] : text).trim().slice(0, 240);
}

function detectEvidence(prompt: string, context: AriaContextSnapshot): string[] {
  const evidence: string[] = [];
  const meta = context.pageMeta ?? {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    evidence.push(`page.${k}`);
  }
  if (/\b\d+(\.\d+)?%?\b/.test(prompt)) evidence.push("prompt.numeric_claim");
  if (context.module && context.module !== "home") evidence.push(`route.module=${context.module}`);
  return evidence.slice(0, 8);
}

function detectMissing(prompt: string, context: AriaContextSnapshot): string[] {
  const missing: string[] = [];
  if (!(context.pageMeta && "kpis" in context.pageMeta)) missing.push("kpis");
  if (!(context.pageMeta && "incidents" in context.pageMeta)) missing.push("incidents");
  if (context.permissions.length === 0) missing.push("permissions");
  if (prompt.length < 12) missing.push("prompt_specificity");
  return missing;
}

export const executiveReasoning = {
  build(prompt: string, context: AriaContextSnapshot, intent: AriaIntent): ReasoningTrace {
    const summary = firstSentence(prompt);
    const evidence = detectEvidence(prompt, context);
    const missing = detectMissing(prompt, context);
    const uncertainty: string[] = [];
    if (evidence.length === 0) uncertainty.push("no_grounding_evidence_available");
    if (missing.length > 2) uncertainty.push("multiple_missing_context_signals");

    return {
      intent,
      executive_summary_ar: `طلب تنفيذي: ${summary}`,
      executive_summary_en: `Executive request: ${summary}`,
      operational_interpretation_ar:
        intent === "executive"
          ? "قرار تنفيذي يتطلب توليفة أدلة وسياق تشغيلي."
          : "طلب عملي ضمن سياق الوحدة الحالية.",
      operational_interpretation_en:
        intent === "executive"
          ? "Executive decision requiring synthesis of evidence and operational context."
          : "Operational request within the current module scope.",
      business_impact_ar:
        evidence.length > 0
          ? "قد يؤثر على مؤشرات الأداء المرتبطة بهذه الوحدة."
          : "الأثر التجاري غير محدد بسبب نقص البيانات.",
      business_impact_en:
        evidence.length > 0
          ? "May affect KPIs tied to this module."
          : "Business impact undetermined due to missing data.",
      evidence,
      missing_data: missing,
      uncertainty,
    };
  },
};
