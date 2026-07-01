/**
 * Reasoning Engine — extends the base Executive Thinking Loop system
 * prompt with Phase 6 requirements:
 *   • explicit internal envelope (question → intent → evidence → reasoning
 *     → assumptions → risks → confidence → recommendation → next action →
 *     business impact)
 *   • deterministic reasoning-type + decision-mode enums
 *   • strict JSON response contract used by the Brain
 *
 * The visible answer contract (`text_ar`, `text_en`) is unchanged.
 */
import { runThinkingLoop, type ThinkingBundle } from "../thinking-loop.server";

const BRAIN_JSON_CONTRACT = `RESPONSE CONTRACT (STRICT JSON only, no prose outside JSON):
{
  "text_ar": "الرد التنفيذي بالعربية الفصحى الراقية (٢–٥ جمل).",
  "text_en": "Executive English answer (2–5 sentences).",
  "summary_ar": "one-line executive answer in Arabic",
  "summary_en": "one-line executive answer in English",
  "evidence": ["table.row_id or short cited fact", "..."],
  "reasoning": "one short paragraph connecting evidence to answer (English)",
  "assumptions": ["explicit assumption", "..."],
  "reasoning_type": "executive|operational|safety|risk|financial|compliance|incident|maintenance|inspection|emergency|security|performance|trend|prediction",
  "decision": {
    "mode": "approve|reject|escalate|investigate|monitor|delay|optimize|assign|close|reopen",
    "rationale_en": "why this decision mode",
    "rationale_ar": "لماذا اخترت هذا القرار",
    "requires_human_approval": true
  },
  "risks": [
    {
      "facet": "operational|safety|business|financial|compliance",
      "probability": 0.0,
      "severity": 0.0,
      "title_en": "short risk title",
      "title_ar": "عنوان الخطر",
      "mitigation_en": "short mitigation",
      "mitigation_ar": "التخفيف المقترح"
    }
  ],
  "recommendation": {
    "why_en": "why this move",
    "why_ar": "لماذا هذه التوصية",
    "evidence": ["cited row"],
    "expected_impact_en": "quantified or qualified impact",
    "expected_impact_ar": "الأثر المتوقع",
    "priority": "critical|high|medium|low",
    "confidence": 0.0,
    "responsible_department": "department or role",
    "deadline": "today|this week|this month|YYYY-MM-DD"
  },
  "next_action": { "owner": "role or team", "when": "today|this week|this month", "action": "verb-first" },
  "business_impact_en": "one-line business impact",
  "business_impact_ar": "أثر الأعمال في سطر واحد",
  "self_confidence": 0.0
}
RULES:
- text_ar and text_en are the ONLY fields shown to the user; keep them 2–5 sentences.
- Never expose the internal reasoning verbatim in text_ar / text_en. Do not print field names or JSON in the visible answer.
- If a required datum is missing: set the field to "" (or an empty array), lower self_confidence to <= 0.3, and say once in text_ar/text_en: "Data unavailable / بيانات غير متوفرة".
- decision may be null when no decision is warranted. recommendation may be null for pure information questions.
- Every recommendation.evidence[] and top-level evidence[] entry must reference a row already present in the GROUNDED EVIDENCE block or LIVE WIDGETS.`;

export interface ReasoningBundle extends ThinkingBundle {
  contract: string;
}

export async function composeReasoning(question: string): Promise<ReasoningBundle> {
  const base = await runThinkingLoop(question);
  // Replace the base JSON contract paragraph with the richer Brain contract.
  const stripped = base.system.replace(/RESPONSE CONTRACT[\s\S]*$/m, "").trimEnd();
  const system = `${stripped}\n\n${BRAIN_JSON_CONTRACT}`;
  return { ...base, system, contract: BRAIN_JSON_CONTRACT };
}
