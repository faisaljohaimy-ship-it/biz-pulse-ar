/**
 * ARIA Executive Thinking Loop (server-only, additive).
 *
 * Composes the autonomous executive cycle:
 *   Observe → Understand → Analyze → Predict → Recommend → Verify → Learn
 *
 * It wraps the existing `buildExecutiveBrief` with:
 *   - Insight Engine (proactive observations)
 *   - Planning Engine (deterministic step plan)
 *   - Tool Orchestrator (decides which retrievals to run — already handled
 *     inside executive-reasoning via retrievalPlan; here we surface the
 *     chosen tools to the model)
 *
 * The public output contract of aria-ask (`{text_ar,text_en}`) is
 * preserved. The endpoint additionally exposes structured executive fields
 * (summary/evidence/reasoning/recommendation/next_action/confidence)
 * derived from the same model call (JSON output) — additive only.
 */

import { buildExecutiveBrief, type AriaIntent } from "./executive-reasoning.server";
import { runInsightScan, type Insight } from "./insight-engine.server";
import { buildPlan, type PlanStep } from "./planning-engine.server";

export interface ThinkingBundle {
  intent: AriaIntent;
  system: string;
  sources: string[];
  plan: PlanStep[];
  insights: Insight[];
  jsonSchemaHint: string;
}

const JSON_CONTRACT = `RESPONSE CONTRACT (STRICT JSON, no prose outside JSON):
{
  "text_ar": "الرد التنفيذي بالعربية الفصحى الراقية (٢–٥ جمل).",
  "text_en": "Executive English answer (2–5 sentences).",
  "summary": "one-line executive answer",
  "evidence": ["source or row you cited", "..."],
  "reasoning": "one short paragraph on how you connected evidence to answer",
  "recommendation": "single most valuable next move",
  "next_action": { "owner": "role or team", "when": "today | this week | this month", "action": "verb-first action" },
  "confidence": 0.0
}
The text_ar and text_en fields are the only fields shown to the user; the rest are consumed by the executive layer. Never invent values. If a required datum is missing, set the field to "" (empty string) or confidence to 0.2 and say once in text_*: "Data unavailable / بيانات غير متوفرة".`;

export async function runThinkingLoop(
  question: string,
  options?: { skipEvidence?: boolean; skipInsights?: boolean },
): Promise<ThinkingBundle> {
  // Layers 2–4 (intent + retrieval + reasoning prompt). Public callers must
  // pass skipEvidence:true — collectEvidence and runInsightScan both use the
  // service-role client with no tenant filter and would leak cross-org data.
  const brief = await buildExecutiveBrief(question, { skipEvidence: options?.skipEvidence });
  const [insightBundle, plan] = await Promise.all([
    options?.skipInsights || options?.skipEvidence
      ? Promise.resolve({ block: "", sources: [] as string[], insights: [] as Insight[] })
      : runInsightScan(),
    Promise.resolve(buildPlan(brief.intent)),
  ]);

  const system = [
    brief.system,
    plan.block,
    insightBundle.block,
    JSON_CONTRACT,
  ]
    .filter(Boolean)
    .join("\n\n");

  const sources = Array.from(new Set([...brief.sources, ...insightBundle.sources]));

  return {
    intent: brief.intent,
    system,
    sources,
    plan: plan.steps,
    insights: insightBundle.insights,
    jsonSchemaHint: JSON_CONTRACT,
  };
}
