import type {
  Assumption,
  ConfidenceModel,
  Contradiction,
  DecisionScore,
  Hypothesis,
  RiskSignal,
  Uncertainty,
} from "./types";

const BIAS_MARKERS = [
  { pattern: /\balways\b/i, note: 'Absolute language ("always") — potential confirmation bias.' },
  { pattern: /\bnever\b/i, note: 'Absolute language ("never") — potential availability bias.' },
  { pattern: /\bobvious(ly)?\b/i, note: 'Framing bias — "obvious" claim without evidence trace.' },
];

export interface ReflectionReport {
  readonly biases: ReadonlyArray<string>;
  readonly uncertainties: ReadonlyArray<Uncertainty>;
  readonly risks: ReadonlyArray<RiskSignal>;
  readonly assumptions: ReadonlyArray<Assumption>;
  readonly notes: ReadonlyArray<string>;
}

function nextId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function reflect(input: {
  hypotheses: ReadonlyArray<Hypothesis>;
  scores: ReadonlyArray<DecisionScore>;
  contradictions: ReadonlyArray<Contradiction>;
  confidence: ConfidenceModel;
}): ReflectionReport {
  const biases: string[] = [];
  for (const h of input.hypotheses) {
    for (const marker of BIAS_MARKERS) {
      if (marker.pattern.test(h.statement) || marker.pattern.test(h.rationale)) {
        biases.push(`${marker.note} — "${h.statement}"`);
      }
    }
  }

  const uncertainties: Uncertainty[] = [];
  if (input.confidence.evidenceCoverage < 0.5) {
    uncertainties.push({
      id: nextId("unc"),
      gap: "Evidence coverage below 50% — additional sources recommended.",
      severity: "high",
    });
  }
  if (input.confidence.simulationSpread > 0.5) {
    uncertainties.push({
      id: nextId("unc"),
      gap: "Simulation outcome spread is wide — sensitivity to assumptions is high.",
      severity: "medium",
    });
  }
  if (input.scores.length >= 2 && input.scores[0].score - input.scores[1].score < 0.05) {
    uncertainties.push({
      id: nextId("unc"),
      gap: "Top two options are near-tied — small evidence shifts may flip the decision.",
      severity: "medium",
    });
  }

  const risks: RiskSignal[] = [];
  for (const c of input.contradictions) {
    if (c.severity === "critical" || c.severity === "high") {
      risks.push({
        id: nextId("risk"),
        description: c.description,
        likelihood: c.severity === "critical" ? 0.7 : 0.5,
        impact: c.severity === "critical" ? 0.9 : 0.6,
        evidenceIds: c.evidenceIds,
      });
    }
  }

  const assumptions: Assumption[] = [];
  for (const h of input.hypotheses) {
    if (!h.rejected && h.supportingEvidenceIds.length === 0) {
      assumptions.push({
        id: nextId("asm"),
        statement: `Assuming: ${h.statement}`,
        criticality: h.confidence >= 0.6 ? "high" : "medium",
        evidenceIds: [],
      });
    }
  }

  const notes: string[] = [];
  if (input.confidence.overall < 0.4)
    notes.push("Overall confidence low — recommend deferral or evidence acquisition.");
  if (input.confidence.contradictionPenalty > 0.2)
    notes.push("Contradiction penalty material — resolve conflicts before commit.");

  return { biases, uncertainties, risks, assumptions, notes };
}
