/**
 * Executive Brain — the deterministic pipeline every ARIA question flows
 * through in Phase 6:
 *
 *   User Question
 *      ↓ Intent Detection            (executive-reasoning.classifyIntent)
 *      ↓ Context Builder             (context.server)
 *      ↓ Evidence Collector          (executive-reasoning.collectEvidence)
 *      ↓ Reasoning Engine            (reasoning.server + Thinking Loop)
 *      ↓ Decision Engine             (decision.server)
 *      ↓ Risk Analyzer               (risk.server)
 *      ↓ Recommendation Generator    (recommendation.server)
 *      ↓ Executive Summary + confidence scoring
 *      ↓ Natural Response            ({text_ar, text_en})
 *
 * The output is `ExecutiveBrainAnswer`. Callers should render ONLY
 * `text_ar` / `text_en` to end users; every other field is internal and
 * consumed by executive UI panels (Evidence, Risks, Decision) or the
 * audit trail. No UI is modified by this file.
 *
 * Reuses the Executive Thinking Loop, Briefing/Insight scan, Planning
 * Engine, Scenario Engine (indirectly via retrieval) and existing
 * evidence retrieval — no duplicate logic.
 */

import { composeReasoning } from "./reasoning.server";
import { buildContextBlock } from "./context.server";
import {
  buildMemoryBlock,
  loadMemory,
  saveDecision,
  saveIncidents,
  saveRecommendation,
  saveTurn,
} from "./memory.server";
import { normalizeDecision } from "./decision.server";
import { normalizeRisks } from "./risk.server";
import { normalizeRecommendation } from "./recommendation.server";
import { ModelEnvelopeSchema, type ModelEnvelope } from "./contracts";
import type { BrainRequest, ConfidenceBreakdown, ExecutiveBrainAnswer } from "./types";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ModelCallResult {
  ok: boolean;
  status: number;
  envelope: ModelEnvelope | null;
  raw: string;
}

async function callModel(
  model: string,
  maxTokens: number,
  system: string,
  question: string,
  key: string,
): Promise<ModelCallResult> {
  try {
    const r = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "nexios-executive-brain",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!r.ok) return { ok: false, status: r.status, envelope: null, raw: "" };
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = j.choices?.[0]?.message?.content ?? "";
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
    const envelope = ModelEnvelopeSchema.safeParse(parsed);
    return { ok: true, status: 200, envelope: envelope.success ? envelope.data : null, raw };
  } catch {
    return { ok: false, status: 0, envelope: null, raw: "" };
  }
}

function scoreConfidence(env: ModelEnvelope, sources: string[]): ConfidenceBreakdown {
  const evidenceCount = env.evidence.length;
  const evidence_completeness = Math.min(1, evidenceCount / 4);
  const data_freshness = sources.length ? 0.85 : 0.35;
  const cross_validation = sources.length >= 2 ? 0.9 : sources.length === 1 ? 0.55 : 0.2;
  const rule_confidence = env.decision ? 0.8 : 0.5;
  const historical_similarity = env.assumptions.length ? 0.6 : 0.5;
  const self = Math.max(0, Math.min(1, env.self_confidence));
  const weighted =
    0.28 * evidence_completeness +
    0.22 * data_freshness +
    0.18 * cross_validation +
    0.12 * rule_confidence +
    0.1 * historical_similarity +
    0.1 * self;
  return {
    evidence_completeness,
    data_freshness,
    cross_validation,
    rule_confidence,
    historical_similarity,
    overall: Math.max(0, Math.min(1, weighted)),
  };
}

function extractIncidentIds(evidence: string[]): string[] {
  const ids: string[] = [];
  for (const line of evidence) {
    const m = line.match(
      /(inc[_-]?[a-z0-9-]{4,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    );
    if (m) ids.push(m[1]);
  }
  return Array.from(new Set(ids));
}

export interface RunExecutiveBrainOptions {
  /** Lovable AI Gateway key (server-side). */
  apiKey: string;
}

export async function runExecutiveBrain(
  req: BrainRequest,
  opts: RunExecutiveBrainOptions,
): Promise<ExecutiveBrainAnswer> {
  // 1. Intent + retrieval + plan + insights + prompt
  const reasoning = await composeReasoning(req.question);

  // 2. Memory
  const mem = loadMemory(req.sessionId);
  const memoryBlock = buildMemoryBlock(mem);

  // 3. Context block
  const contextBlock = buildContextBlock(req, memoryBlock);
  const system = [reasoning.system, contextBlock].filter(Boolean).join("\n\n");

  // 4. Reasoning call — GPT-5 primary, mini fallback
  let result = await callModel("openai/gpt-5", 2600, system, req.question, opts.apiKey);
  if (!result.envelope) {
    result = await callModel("openai/gpt-5-mini", 1400, system, req.question, opts.apiKey);
  }
  const env = result.envelope ?? ModelEnvelopeSchema.parse({});

  // 5. Coercion — decision, risks, recommendation
  const risks = normalizeRisks(env.risks);
  const topRiskScore = risks[0]?.score ?? 0;
  const decision = normalizeDecision(env.decision);
  const recommendation = normalizeRecommendation(
    env.recommendation,
    reasoning.intent,
    topRiskScore,
  );

  // 6. Confidence
  const confidence = scoreConfidence(env, reasoning.sources);

  // 7. Text fallback so the UI always has something to render
  const text_ar = (env.text_ar || env.text_en || "").trim();
  const text_en = (env.text_en || env.text_ar || "").trim();

  const answer: ExecutiveBrainAnswer = {
    text_ar,
    text_en,
    question: req.question,
    intent: reasoning.intent,
    reasoning_type: env.reasoning_type,
    required_data: reasoning.sources,
    evidence: env.evidence.slice(0, 8),
    reasoning: env.reasoning,
    assumptions: env.assumptions.slice(0, 6),
    risks,
    confidence,
    recommendation,
    decision,
    next_action: env.next_action,
    business_impact_en: env.business_impact_en,
    business_impact_ar: env.business_impact_ar,
    plan: reasoning.plan,
    insights: reasoning.insights,
    sources: reasoning.sources,
  };

  // 8. Memory writeback (turn + derived items)
  saveTurn(req.sessionId, { role: "user", text: req.question, ts: new Date().toISOString() });
  if (text_en || text_ar) {
    saveTurn(req.sessionId, {
      role: "assistant",
      text: text_en || text_ar,
      ts: new Date().toISOString(),
    });
  }
  if (recommendation) saveRecommendation(req.sessionId, recommendation);
  if (decision) saveDecision(req.sessionId, decision);
  const incidentIds = extractIncidentIds(env.evidence);
  if (incidentIds.length) saveIncidents(req.sessionId, incidentIds);

  return answer;
}
