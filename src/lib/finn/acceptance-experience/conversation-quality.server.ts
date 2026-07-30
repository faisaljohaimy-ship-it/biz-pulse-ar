// Conversation quality — deterministic scoring for discipline enforcement.
export interface QualityInput {
  readonly text: string;
  readonly mode: "brief" | "detailed";
  readonly lang: "ar" | "en";
  readonly containsJson?: boolean;
  readonly containsReasoning?: boolean;
  readonly agentChatter?: boolean;
}

export interface QualityAssessment {
  readonly score: number; // 0..100
  readonly violations: readonly string[];
  readonly acceptable: boolean;
}

export function assessQuality(input: QualityInput): QualityAssessment {
  const violations: string[] = [];
  let score = 100;

  const words = input.text.trim().split(/\s+/).filter(Boolean).length;
  if (input.mode === "brief" && words > 70) {
    violations.push("too_long_for_brief");
    score -= 20;
  }
  if (input.mode === "detailed" && words < 20) {
    violations.push("too_short_for_detailed");
    score -= 10;
  }

  if (input.containsJson || /^\s*[[{]/.test(input.text)) {
    violations.push("raw_json_present");
    score -= 25;
  }
  if (
    input.containsReasoning ||
    /(?:let me think|as an ai|internal reasoning|chain of thought)/i.test(input.text)
  ) {
    violations.push("internal_reasoning_leak");
    score -= 20;
  }
  if (input.agentChatter || /(?:agent[- ]?\d+|tool call:|system:)/i.test(input.text)) {
    violations.push("agent_chatter");
    score -= 15;
  }
  if (/(?:\bum\b|\buh\b|\ber\b)/i.test(input.text)) {
    violations.push("filler_word");
    score -= 5;
  }

  if (score < 0) score = 0;
  return { score, violations, acceptable: violations.length === 0 };
}
