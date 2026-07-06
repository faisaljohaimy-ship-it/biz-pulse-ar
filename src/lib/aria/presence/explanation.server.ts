/**
 * ARIA Presence — Executive Explanation Mode.
 *
 * Expands a prior recommendation into a full executive rationale:
 * Why, Evidence, Alternatives, Risks, Expected Outcome, Business Value,
 * Implementation Steps. Bilingual. Uses the GPT-5 gateway with the
 * Executive Brain voice contract so the output stays in-persona.
 *
 * Never fabricates evidence — the caller passes the original
 * recommendation + optional evidence array; the model may only rephrase
 * or split those, never invent new facts.
 */
import { z } from "zod";
import { ARIA_VOICE_CONTRACT, sanitizeVoice } from "./voice";

export const ExplanationRequestSchema = z.object({
  recommendation_en: z.string().min(1).max(800),
  recommendation_ar: z.string().max(800).optional(),
  evidence: z.array(z.string().max(400)).max(8).default([]),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  responsible_department: z.string().max(160).optional(),
  deadline: z.string().max(80).optional(),
});

export type ExplanationRequest = z.infer<typeof ExplanationRequestSchema>;

export interface ExecutiveExplanation {
  why_en: string;
  why_ar: string;
  evidence: string[];
  alternatives_en: string[];
  alternatives_ar: string[];
  risks_en: string[];
  risks_ar: string[];
  expected_outcome_en: string;
  expected_outcome_ar: string;
  business_value_en: string;
  business_value_ar: string;
  steps_en: string[];
  steps_ar: string[];
}

const ExplanationEnvelope = z.object({
  why_en: z.string().default(""),
  why_ar: z.string().default(""),
  evidence: z.array(z.string()).default([]),
  alternatives_en: z.array(z.string()).default([]),
  alternatives_ar: z.array(z.string()).default([]),
  risks_en: z.array(z.string()).default([]),
  risks_ar: z.array(z.string()).default([]),
  expected_outcome_en: z.string().default(""),
  expected_outcome_ar: z.string().default(""),
  business_value_en: z.string().default(""),
  business_value_ar: z.string().default(""),
  steps_en: z.array(z.string()).default([]),
  steps_ar: z.array(z.string()).default([]),
});

import { ARIA_IDENTITY_PREAMBLE } from "@/lib/aria/identity";

const SYSTEM = `${ARIA_IDENTITY_PREAMBLE}

---

# TASK — EXECUTIVE EXPLANATION
Expand a director's recommendation into an executive rationale.

${ARIA_VOICE_CONTRACT}

RULES:
- Do not invent new evidence, sites, dates, names or numbers. Only rephrase or split the evidence rows provided.
- Alternatives must be genuinely distinct options — not restatements of the recommendation.
- Risks must map to operational, safety, business, financial or compliance facets.
- Steps must be verb-first, sequenced, and executable this week unless the deadline says otherwise.
- Bilingual output (Arabic فصحى تنفيذية + formal executive English). Return ONLY strict JSON matching the schema — no prose outside JSON.`;

const SCHEMA_HINT = `SCHEMA:
{
  "why_en": "one paragraph — why this move now",
  "why_ar": "لماذا الآن — فقرة واحدة",
  "evidence": ["cited row from input"],
  "alternatives_en": ["distinct option A", "distinct option B"],
  "alternatives_ar": ["الخيار البديل أ", "الخيار البديل ب"],
  "risks_en": ["risk if we execute or delay"],
  "risks_ar": ["المخاطر عند التنفيذ أو التأجيل"],
  "expected_outcome_en": "quantified or qualified outcome",
  "expected_outcome_ar": "الأثر المتوقع",
  "business_value_en": "one line — dollar / risk / capacity value",
  "business_value_ar": "القيمة التجارية في سطر",
  "steps_en": ["verb-first step 1", "step 2", "step 3"],
  "steps_ar": ["الخطوة ١ ابدأ بفعل", "الخطوة ٢", "الخطوة ٣"]
}`;

export async function explainRecommendation(
  req: ExplanationRequest,
  apiKey: string,
): Promise<ExecutiveExplanation> {
  const userPayload = JSON.stringify({
    recommendation_en: req.recommendation_en,
    recommendation_ar: req.recommendation_ar ?? "",
    evidence: req.evidence,
    priority: req.priority,
    responsible_department: req.responsible_department ?? "",
    deadline: req.deadline ?? "this week",
  });

  async function call(model: string, maxTokens: number) {
    return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "nexios-executive-explanation",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: `${SYSTEM}\n\n${SCHEMA_HINT}` },
          { role: "user", content: userPayload },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(40_000),
    });
  }

  let r = await call("openai/gpt-5", 1800);
  if (!r.ok) r = await call("openai/gpt-5-mini", 1200);
  const j = (await r.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
  const raw = j.choices?.[0]?.message?.content ?? "";
  let parsed: unknown = {};
  try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  const env = ExplanationEnvelope.parse(parsed);

  const cleanArray = (xs: string[]) => xs.map((s) => sanitizeVoice(s)).filter(Boolean).slice(0, 6);

  return {
    why_en: sanitizeVoice(env.why_en),
    why_ar: sanitizeVoice(env.why_ar),
    evidence: env.evidence.slice(0, 8),
    alternatives_en: cleanArray(env.alternatives_en),
    alternatives_ar: cleanArray(env.alternatives_ar),
    risks_en: cleanArray(env.risks_en),
    risks_ar: cleanArray(env.risks_ar),
    expected_outcome_en: sanitizeVoice(env.expected_outcome_en),
    expected_outcome_ar: sanitizeVoice(env.expected_outcome_ar),
    business_value_en: sanitizeVoice(env.business_value_en),
    business_value_ar: sanitizeVoice(env.business_value_ar),
    steps_en: cleanArray(env.steps_en),
    steps_ar: cleanArray(env.steps_ar),
  };
}
