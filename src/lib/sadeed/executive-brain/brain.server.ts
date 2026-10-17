/**
 * Executive Brain — the deterministic pipeline every SADEED question flows
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
import { generateText } from "ai";
import { assertAiEnabled } from "@/lib/governance/ai-quota.server";
import { resolveSadeedGeminiRuntime } from "@/lib/sadeed/gemini-provider.server";
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

interface ModelCallResult {
  ok: boolean;
  status: number;
  envelope: ModelEnvelope | null;
  raw: string;
}

async function callModel(
  maxTokens: number,
  system: string,
  question: string,
): Promise<ModelCallResult> {
  try {
    // مفتاح الإيقاف قبل النموذج — المحرّك يُستدعى من مسار الدردشة المحروس
    // بالحصّة، فهنا دفاعٌ ثانٍ: مطفأ ⇐ `ok: false` بلا نداء مزوّد.
    assertAiEnabled("chat");
    const runtime = resolveSadeedGeminiRuntime();
    const { text: raw } = await generateText({
      model: runtime.provider(runtime.modelId),
      system,
      prompt: question,
      maxOutputTokens: maxTokens,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(45_000),
    });
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(raw.replace(/```json\s*|\s*```/g, "").trim());
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
  /** Reserved for server-owned Gemini execution policy; no caller API keys. */
  provider?: "google-gemini";
}

export async function runExecutiveBrain(
  req: BrainRequest,
  _opts: RunExecutiveBrainOptions = {},
): Promise<ExecutiveBrainAnswer> {
  // 1. Intent + retrieval + plan + insights + prompt (scoped by caller org)
  const reasoning = await composeReasoning(req.question, { orgId: req.orgId ?? null });

  // 2. Memory
  const mem = loadMemory(req.sessionId);
  const memoryBlock = buildMemoryBlock(mem);

  // 3. Context block
  const contextBlock = buildContextBlock(req, memoryBlock);
  const system = [reasoning.system, contextBlock].filter(Boolean).join("\n\n");

  // 4. Reasoning call — canonical Gemini runtime with provider retries.
  const result = await callModel(2600, system, req.question);
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
