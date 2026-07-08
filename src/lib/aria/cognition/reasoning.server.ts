import { buildCausalGraph } from "./causal.server";
import { computeConfidence } from "./confidence.server";
import { detectContradictions } from "./contradiction.server";
import { buildDecisionOptions, scoreOptions } from "./decision.server";
import { collectEvidence, rejectWeak } from "./evidence.server";
import type { EvidenceSeed } from "./evidence.server";
import { emitCognitiveEvent } from "./events";
import { buildExplanation, generateRecommendation } from "./explanation.server";
import { generateHypotheses, selectHypotheses } from "./hypothesis.server";
import type { HypothesisSeed } from "./hypothesis.server";
import { recordSession } from "./metrics.server";
import { reflect } from "./reflection.server";
import { simulateAll } from "./simulation.server";
import { analyzeTradeoffs } from "./tradeoff.server";
import type { CognitiveMode, CognitiveSession, ReasoningGraph, ReasoningStep } from "./types";
import { verifyReasoning } from "./verification.server";

export interface ReasoningInput {
  readonly goal: string;
  readonly mode?: CognitiveMode;
  readonly evidenceSeeds?: ReadonlyArray<EvidenceSeed>;
  readonly hypothesisSeeds?: ReadonlyArray<HypothesisSeed>;
  readonly policyStatements?: ReadonlyArray<string>;
  readonly memoryStatements?: ReadonlyArray<string>;
  readonly contextStatements?: ReadonlyArray<string>;
}

function nextSessionId(): string {
  return `cog_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function stepStart(
  kind: ReasoningStep["kind"],
  summary: string,
): { id: string; startedAt: string } {
  return {
    id: `step_${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    startedAt: new Date().toISOString(),
  };
}

function stepFinish(
  seed: { id: string; startedAt: string },
  kind: ReasoningStep["kind"],
  summary: string,
  refs: ReadonlyArray<string>,
): ReasoningStep {
  return {
    id: seed.id,
    kind,
    summary,
    startedAt: seed.startedAt,
    finishedAt: new Date().toISOString(),
    refs,
  };
}

export function runReasoning(input: ReasoningInput): CognitiveSession {
  const sessionId = nextSessionId();
  const startedAt = new Date().toISOString();
  const mode: CognitiveMode = input.mode ?? "advisory";
  const steps: ReasoningStep[] = [];
  emitCognitiveEvent("ReasoningStarted", { sessionId, mode, goal: input.goal.slice(0, 120) });

  let s = stepStart("collect_evidence", "collect");
  const evidenceAll = collectEvidence(input.evidenceSeeds ?? []);
  const evidence = rejectWeak(evidenceAll);
  steps.push(
    stepFinish(
      s,
      "collect_evidence",
      `Collected ${evidence.length} evidence items.`,
      evidence.map((e) => e.id),
    ),
  );

  s = stepStart("generate_hypotheses", "hypotheses");
  const hypothesesAll = generateHypotheses(input.goal, evidence, mode, input.hypothesisSeeds ?? []);
  const hypotheses = selectHypotheses(hypothesesAll);
  steps.push(
    stepFinish(
      s,
      "generate_hypotheses",
      `Generated ${hypothesesAll.length} hypotheses, kept ${hypotheses.length}.`,
      hypotheses.map((h) => h.id),
    ),
  );

  s = stepStart("evaluate_alternatives", "options");
  const options = buildDecisionOptions(hypotheses, evidence);
  steps.push(
    stepFinish(
      s,
      "evaluate_alternatives",
      `Formed ${options.length} decision options.`,
      options.map((o) => o.id),
    ),
  );

  s = stepStart("tradeoff", "tradeoffs");
  const tradeoffs = analyzeTradeoffs(options, evidence);
  steps.push(
    stepFinish(
      s,
      "tradeoff",
      `Analyzed ${tradeoffs.length} trade-off profiles.`,
      tradeoffs.map((t) => t.optionId),
    ),
  );

  s = stepStart("contradiction", "contradictions");
  const contradictions = detectContradictions({
    evidence,
    hypotheses,
    policyStatements: input.policyStatements,
    memoryStatements: input.memoryStatements,
    contextStatements: input.contextStatements,
  });
  steps.push(
    stepFinish(
      s,
      "contradiction",
      `Detected ${contradictions.length} contradictions.`,
      contradictions.map((c) => c.id),
    ),
  );

  s = stepStart("causal", "causal");
  const causal = buildCausalGraph(input.goal, evidence);
  steps.push(
    stepFinish(
      s,
      "causal",
      `Causal graph: ${causal.links.length} links, root=${causal.rootCause ?? "none"}.`,
      causal.links.map((_, i) => `link_${i}`),
    ),
  );

  const { scores, winner, alternatives } = scoreOptions(tradeoffs, hypotheses, options);

  s = stepStart("simulate", "simulate");
  const risksPre = contradictions
    .filter((c) => c.severity === "critical" || c.severity === "high")
    .map((c, i) => ({
      id: `risk_pre_${i}`,
      description: c.description,
      likelihood: c.severity === "critical" ? 0.7 : 0.5,
      impact: c.severity === "critical" ? 0.9 : 0.6,
      evidenceIds: c.evidenceIds,
    }));
  const simulations = simulateAll(options, tradeoffs, risksPre);
  steps.push(
    stepFinish(
      s,
      "simulate",
      `Ran ${simulations.length} simulations across ${options.length} options.`,
      simulations.map((r) => r.optionId),
    ),
  );

  s = stepStart("reflection", "reflection");
  const winnerScore = scores.find((sc) => sc.optionId === winner?.id)?.score ?? 0;
  const reflectionPre = reflect({
    hypotheses,
    scores,
    contradictions,
    confidence: {
      overall: 0.5,
      evidenceCoverage: 0,
      contradictionPenalty: 0,
      uncertaintyPenalty: 0,
      simulationSpread: 0,
    },
  });
  steps.push(
    stepFinish(
      s,
      "reflection",
      `Reflection produced ${reflectionPre.biases.length} bias notes, ${reflectionPre.uncertainties.length} uncertainties.`,
      reflectionPre.uncertainties.map((u) => u.id),
    ),
  );

  s = stepStart("confidence", "confidence");
  const confidence = computeConfidence({
    evidence,
    contradictions,
    uncertainties: reflectionPre.uncertainties,
    simulations,
    winnerScore,
  });
  steps.push(
    stepFinish(s, "confidence", `Confidence=${(confidence.overall * 100).toFixed(0)}%.`, []),
  );

  const allRisks = [...risksPre, ...reflectionPre.risks];
  s = stepStart("recommendation", "recommendation");
  const winnerScoreObj = scores.find((sc) => sc.optionId === winner?.id) ?? null;
  const recommendation = generateRecommendation({
    winner,
    score: winnerScoreObj,
    confidence,
    risks: allRisks,
  });
  steps.push(
    stepFinish(s, "recommendation", `Recommendation: ${recommendation.title}.`, [
      recommendation.decisionOptionId,
    ]),
  );

  s = stepStart("verification", "verify");
  const verification = verifyReasoning({
    evidence,
    hypotheses,
    options,
    scores,
    confidence,
    recommendation,
  });
  steps.push(
    stepFinish(
      s,
      "verification",
      verification.ok
        ? "Verification passed."
        : `Verification issues: ${verification.issues.length}.`,
      verification.issues,
    ),
  );

  const explanation = buildExplanation({
    goal: input.goal,
    evidence,
    options,
    tradeoffs,
    scores,
    alternatives,
    contradictions,
    simulations,
    risks: allRisks,
    confidence,
    recommendation,
  });

  const graph: ReasoningGraph = {
    nodes: [
      ...evidence.map((e) => ({
        id: `n_${e.id}`,
        label: e.claim.slice(0, 80),
        kind: "evidence" as const,
        refId: e.id,
      })),
      ...hypotheses.map((h) => ({
        id: `n_${h.id}`,
        label: h.statement.slice(0, 80),
        kind: "hypothesis" as const,
        refId: h.id,
      })),
      ...options.map((o) => ({
        id: `n_${o.id}`,
        label: o.title.slice(0, 80),
        kind: "option" as const,
        refId: o.id,
      })),
      ...allRisks.map((r) => ({
        id: `n_${r.id}`,
        label: r.description.slice(0, 80),
        kind: "risk" as const,
        refId: r.id,
      })),
      ...reflectionPre.assumptions.map((a) => ({
        id: `n_${a.id}`,
        label: a.statement.slice(0, 80),
        kind: "assumption" as const,
        refId: a.id,
      })),
    ],
    edges: [
      ...hypotheses.flatMap((h) =>
        h.supportingEvidenceIds.map((eid) => ({
          from: `n_${eid}`,
          to: `n_${h.id}`,
          relation: "supports",
        })),
      ),
      ...hypotheses.flatMap((h) =>
        h.opposingEvidenceIds.map((eid) => ({
          from: `n_${eid}`,
          to: `n_${h.id}`,
          relation: "opposes",
        })),
      ),
      ...options.map((o) => ({ from: `n_${o.hypothesisId}`, to: `n_${o.id}`, relation: "yields" })),
    ],
  };

  const finishedAt = new Date().toISOString();
  const session: CognitiveSession = {
    id: sessionId,
    goal: input.goal,
    mode,
    startedAt,
    finishedAt,
    steps,
    graph,
    evidence,
    assumptions: reflectionPre.assumptions,
    hypotheses,
    options,
    tradeoffs,
    scores,
    alternatives,
    contradictions,
    risks: allRisks,
    uncertainties: reflectionPre.uncertainties,
    causal,
    simulations,
    confidence,
    recommendation,
    explanationHuman: explanation.human,
    explanationMachine: explanation.machine,
    verified: verification.ok,
    verificationIssues: verification.issues,
  };
  recordSession(session);
  emitCognitiveEvent("ReasoningCompleted", {
    sessionId,
    verified: session.verified,
    confidence: confidence.overall,
  });
  return session;
}

export function evaluate(session: CognitiveSession): {
  verified: boolean;
  issues: ReadonlyArray<string>;
  confidence: number;
} {
  return {
    verified: session.verified,
    issues: session.verificationIssues,
    confidence: session.confidence.overall,
  };
}

export function compare(
  a: CognitiveSession,
  b: CognitiveSession,
): {
  preferred: string;
  reason: string;
} {
  if (a.confidence.overall === b.confidence.overall) {
    return { preferred: a.id, reason: "tie_on_confidence_stable_choice" };
  }
  return a.confidence.overall > b.confidence.overall
    ? { preferred: a.id, reason: `higher_confidence:${a.confidence.overall.toFixed(2)}` }
    : { preferred: b.id, reason: `higher_confidence:${b.confidence.overall.toFixed(2)}` };
}

export function challenge(session: CognitiveSession): ReadonlyArray<string> {
  const notes: string[] = [];
  if (session.confidence.overall < 0.5)
    notes.push("Confidence below 50% — recommend more evidence.");
  if (session.contradictions.length > 0)
    notes.push(`Unresolved contradictions: ${session.contradictions.length}.`);
  if (session.uncertainties.length > 0)
    notes.push(`Open uncertainties: ${session.uncertainties.length}.`);
  return notes;
}

export function verify(session: CognitiveSession): boolean {
  return session.verified;
}
