/**
 * Phase 8.6 — Executive Cognitive Reasoning Engine (server-only).
 *
 * The reasoner runs pure cognitive passes over caller-supplied context
 * and evidence. It never executes agents, dispatches tasks, mutates
 * memory, or bypasses the Planner.
 *
 * Pipeline:
 *   Context → Analysis → Evidence → Hypotheses → Critical Review →
 *   Counter-arguments → Assumption Challenge → Decision Matrix →
 *   Trade-offs → Uncertainty → Reflection → Recommendation → Trace
 */
import type {
  DecisionOption,
  Evidence,
  Hypothesis,
  ReasoningContext,
  ReasoningNode,
  ReasoningResult,
  ReasoningTrace,
} from "./types";
import type { MultiPerspectiveInputParsed, ReasonInputParsed } from "./contracts";
import { MultiPerspectiveInputSchema, ReasonInputSchema } from "./contracts";
import { confidence, nowIso, shortId } from "./util";
import { analyzeProblem } from "./analysis.server";
import { collectEvidence, evidenceConfidence } from "./evidence.server";
import { generateHypotheses } from "./hypothesis.server";
import { criticalReview } from "./critical-thinking.server";
import { generateCounterArguments } from "./counterargument.server";
import { challengeAssumptions } from "./assumption.server";
import { buildDecisionMatrix } from "./decision.server";
import { attachTradeoffs } from "./tradeoff.server";
import { catalogueUncertainty } from "./uncertainty.server";
import { reflect } from "./reflection.server";
import { composeRecommendation } from "./recommendation.server";
import { emitReasoningEvent } from "./events";
import { REASONER_VERSION, recordFailure, recordSuccess } from "./metrics.server";
import { markActive, markInactive, recordHealthFailure } from "./health.server";

function buildContext(input: ReasonInputParsed): ReasoningContext {
  return {
    id: shortId("rc"),
    question: input.question,
    language: input.language,
    mode: input.mode,
    domain: input.domain,
    goals: input.goals,
    constraints: input.constraints,
    seed_evidence: [],
    seed_assumptions: [],
    received_at: nowIso(),
  };
}

function buildTrace(mode: ReasoningContext["mode"], nodes: ReasoningNode[]): ReasoningTrace {
  const root = nodes[0];
  return {
    id: shortId("rt"),
    mode,
    nodes,
    root_id: root?.id ?? "",
    depth: depthOf(nodes),
    created_at: nowIso(),
  };
}

function depthOf(nodes: ReasoningNode[]): number {
  if (!nodes.length) return 0;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const memo = new Map<string, number>();
  const walk = (id: string, seen: Set<string>): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const n = byId.get(id);
    if (!n || !n.children.length) return 1;
    let best = 0;
    for (const c of n.children) best = Math.max(best, walk(c, new Set(seen)));
    const d = 1 + best;
    memo.set(id, d);
    return d;
  };
  let max = 0;
  for (const n of nodes) max = Math.max(max, walk(n.id, new Set()));
  return max;
}

export async function reason(input: ReasonInputParsed): Promise<ReasoningResult> {
  const started = Date.now();
  const parsed = ReasonInputSchema.parse(input);
  const context = buildContext(parsed);
  markActive(context.id);
  emitReasoningEvent("ReasoningStarted", context.id, {
    mode: context.mode,
    domain: context.domain,
  });

  try {
    const analysis = analyzeProblem(context);
    const nodes: ReasoningNode[] = [analysis.root_node, ...analysis.supporting_nodes];

    const evidenceReport = collectEvidence(parsed);
    emitReasoningEvent("EvidenceCollected", context.id, {
      count: evidenceReport.evidence.length,
      quality: evidenceReport.quality,
    });
    for (const e of evidenceReport.evidence) {
      nodes.push({
        id: shortId("rn"),
        kind: "evidence",
        summary: `Evidence: ${truncate(e.claim, 80)}`,
        detail: `${e.source} (${e.source_kind}), weight ${e.weight.toFixed(2)}`,
        parents: [analysis.root_node.id],
        children: [],
        confidence: confidence(e.weight, "evidence weight"),
        ts: nowIso(),
      });
    }

    const hypothesisReport = generateHypotheses(context, evidenceReport.evidence);
    emitReasoningEvent("HypothesisGenerated", context.id, {
      supported: hypothesisReport.hypotheses.length,
      rejected: hypothesisReport.rejected.length,
    });
    for (const h of hypothesisReport.hypotheses) {
      nodes.push({
        id: shortId("rn"),
        kind: "hypothesis",
        summary: `Hypothesis: ${truncate(h.statement, 80)}`,
        detail: h.rationale,
        parents: [analysis.root_node.id],
        children: [],
        confidence: h.confidence,
        ts: nowIso(),
      });
    }

    const critical = criticalReview(context, hypothesisReport.hypotheses, evidenceReport.evidence);
    nodes.push({
      id: shortId("rn"),
      kind: "critical_check",
      summary: "Critical review",
      detail: critical.reasoning,
      parents: [analysis.root_node.id],
      children: [],
      confidence: confidence(critical.logical_consistency ? 0.8 : 0.4, "consistency check"),
      ts: nowIso(),
    });

    const counter = generateCounterArguments(hypothesisReport.hypotheses, evidenceReport.evidence);
    for (const c of counter.counterarguments) {
      emitReasoningEvent("CounterArgumentGenerated", context.id, {
        target: c.target_hypothesis_id,
      });
      nodes.push({
        id: shortId("rn"),
        kind: "counter_argument",
        summary: `Counter: ${truncate(c.statement, 80)}`,
        detail: c.reasoning,
        parents: [c.target_hypothesis_id],
        children: [],
        confidence: confidence(c.rebuttal_holds ? 0.7 : 0.4, "rebuttal evaluation"),
        ts: nowIso(),
      });
    }

    const assumptions = challengeAssumptions(parsed, evidenceReport.evidence);
    for (const a of assumptions.assumptions) {
      nodes.push({
        id: shortId("rn"),
        kind: "assumption_challenge",
        summary: `Assumption: ${truncate(a.statement, 80)}`,
        detail: a.challenge_reasoning ?? "assumption not challenged by evidence",
        parents: [analysis.root_node.id],
        children: [],
        confidence: a.confidence,
        ts: nowIso(),
      });
    }

    const decisionReport = buildDecisionMatrix(
      context,
      hypothesisReport.hypotheses,
      evidenceReport.evidence,
    );
    const optionsWithTradeoffs: DecisionOption[] = attachTradeoffs(decisionReport.options);
    for (const o of optionsWithTradeoffs) {
      emitReasoningEvent("AlternativeGenerated", context.id, {
        option: o.id,
        score: o.weighted_score,
      });
      nodes.push({
        id: shortId("rn"),
        kind: "decision",
        summary: `Option: ${truncate(o.title, 80)}`,
        detail: `weighted=${o.weighted_score.toFixed(2)}, risk=${o.risk}, reward=${o.reward}`,
        parents: [analysis.root_node.id],
        children: [],
        confidence: o.confidence,
        ts: nowIso(),
      });
      for (const t of o.tradeoffs) {
        nodes.push({
          id: shortId("rn"),
          kind: "tradeoff",
          summary: `Trade-off (${t.axis}): favors ${o.id}`,
          detail: t.reasoning,
          parents: [analysis.root_node.id],
          children: [],
          confidence: null,
          ts: nowIso(),
        });
      }
    }

    const uncertainty = catalogueUncertainty(
      hypothesisReport.hypotheses,
      evidenceReport.evidence,
      optionsWithTradeoffs,
      assumptions.assumptions,
    );

    const reflection = reflect(
      critical,
      uncertainty.uncertainties,
      hypothesisReport.hypotheses,
      evidenceReport.evidence,
    );
    nodes.push({
      id: shortId("rn"),
      kind: "reflection",
      summary: "Self-review",
      detail: reflection.reasoning,
      parents: [analysis.root_node.id],
      children: [],
      confidence: confidence(reflection.ok ? 0.85 : 0.45, "reflection outcome"),
      ts: nowIso(),
    });
    emitReasoningEvent("ReflectionCompleted", context.id, { ok: reflection.ok });

    const trace = buildTrace(context.mode, nodes);
    const recommendation = composeRecommendation(
      optionsWithTradeoffs,
      reflection,
      uncertainty.uncertainties,
      trace.id,
    );
    if (recommendation) {
      emitReasoningEvent("RecommendationGenerated", context.id, {
        recommendation_id: recommendation.id,
        confidence: recommendation.confidence.value,
      });
      nodes.push({
        id: shortId("rn"),
        kind: "recommendation",
        summary: recommendation.title,
        detail: recommendation.summary,
        parents: [analysis.root_node.id],
        children: [],
        confidence: recommendation.confidence,
        ts: nowIso(),
      });
    }

    const overallConf = aggregateConfidence(
      recommendation?.confidence.value ?? 0,
      evidenceConfidence(evidenceReport.evidence).value,
      reflection.ok,
    );

    const result: ReasoningResult = {
      context,
      trace: buildTrace(context.mode, nodes),
      evidence: evidenceReport.evidence,
      assumptions: assumptions.assumptions,
      hypotheses: [...hypothesisReport.hypotheses, ...hypothesisReport.rejected],
      counterarguments: counter.counterarguments,
      options: optionsWithTradeoffs,
      criteria: decisionReport.criteria,
      uncertainties: uncertainty.uncertainties,
      reflection,
      recommendation,
      confidence: confidence(overallConf, "aggregate of recommendation, evidence and reflection"),
      created_at: nowIso(),
      reasoner_version: REASONER_VERSION,
    };

    emitReasoningEvent("ReasoningCompleted", context.id, {
      confidence: result.confidence.value,
      options: result.options.length,
    });
    recordSuccess(result, Date.now() - started);
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    recordFailure();
    recordHealthFailure(message);
    emitReasoningEvent("ReasoningFailed", context.id, { error: message });
    throw e;
  } finally {
    markInactive(context.id);
  }
}

/**
 * Run the reasoner across multiple modes and merge the recommendations
 * into a single ranked list. Every perspective's full trace is returned.
 */
export async function multiPerspectiveReason(
  input: MultiPerspectiveInputParsed,
): Promise<{ results: ReasoningResult[]; consensus: ReasoningResult | null }> {
  const parsed = MultiPerspectiveInputSchema.parse(input);
  const results: ReasoningResult[] = [];
  for (const mode of parsed.perspectives) {
    results.push(await reason({ ...parsed, mode }));
  }
  const consensus = pickConsensus(results);
  return { results, consensus };
}

/** Convenience — regenerate the hypothesis set as "alternatives". */
export async function generateAlternatives(input: ReasonInputParsed): Promise<Hypothesis[]> {
  const r = await reason(input);
  return r.hypotheses.filter((h) => h.status !== "rejected");
}

export async function challengeAssumptionsPublic(input: ReasonInputParsed) {
  const parsed = ReasonInputSchema.parse(input);
  const evidence = collectEvidence(parsed).evidence;
  return challengeAssumptions(parsed, evidence);
}

export async function compareStrategies(
  a: ReasonInputParsed,
  b: ReasonInputParsed,
): Promise<{ a: ReasoningResult; b: ReasoningResult; leader: "a" | "b" | "tie" }> {
  const [ra, rb] = await Promise.all([reason(a), reason(b)]);
  const sa = ra.recommendation?.confidence.value ?? 0;
  const sb = rb.recommendation?.confidence.value ?? 0;
  const leader = Math.abs(sa - sb) < 0.05 ? "tie" : sa > sb ? "a" : "b";
  return { a: ra, b: rb, leader };
}

export async function produceRecommendation(input: ReasonInputParsed) {
  const r = await reason(input);
  return r.recommendation;
}

function pickConsensus(results: ReasoningResult[]): ReasoningResult | null {
  if (!results.length) return null;
  return results
    .slice()
    .sort(
      (a, b) =>
        (b.recommendation?.confidence.value ?? 0) - (a.recommendation?.confidence.value ?? 0),
    )[0]!;
}

function aggregateConfidence(recConf: number, evConf: number, reflectionOk: boolean): number {
  return Math.max(0, Math.min(1, 0.55 * recConf + 0.3 * evConf + 0.15 * (reflectionOk ? 1 : 0)));
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

// Evidence contribution: wrap the seeded evidence array into typed Evidence[]
// via the same helper the pipeline uses.
export function seedEvidenceInto(input: ReasonInputParsed): Evidence[] {
  return collectEvidence(input).evidence;
}
