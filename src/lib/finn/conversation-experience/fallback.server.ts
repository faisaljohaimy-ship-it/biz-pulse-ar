// Fallback decision engine — deterministic gating for unavailable data,
// clarification, and escalation. Unknown remains UNKNOWN.
import type { EvidenceRef, FallbackDecision } from "./types";

export interface FallbackInput {
  readonly userText: string;
  readonly evidence: readonly EvidenceRef[];
  readonly ambiguous: boolean;
  readonly sensitiveAction: boolean;
}

export function decideFallback(input: FallbackInput): FallbackDecision {
  if (input.sensitiveAction) {
    return {
      kind: "escalate",
      reason_ar: "هذا القرار يتطلب اعتماد بشري قبل التنفيذ.",
      reason_en: "This action requires human approval before execution.",
    };
  }
  if (input.ambiguous || input.userText.trim().length < 3) {
    return {
      kind: "clarify",
      reason_ar: "أحتاج توضيحاً موجزاً لأخدمك بدقة.",
      reason_en: "I need one short clarification to help precisely.",
    };
  }
  if (input.evidence.length === 0) {
    return {
      kind: "unavailable",
      reason_ar: "البيانات غير متوفرة الآن.",
      reason_en: "Data unavailable at this moment.",
    };
  }
  return { kind: "none" };
}
