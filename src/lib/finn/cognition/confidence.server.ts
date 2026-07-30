import { emitCognitiveEvent } from "./events";
import { coverageScore } from "./evidence.server";
import type {
  ConfidenceModel,
  Contradiction,
  Evidence,
  SimulationResult,
  Uncertainty,
} from "./types";

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function contradictionPenalty(contradictions: ReadonlyArray<Contradiction>): number {
  if (contradictions.length === 0) return 0;
  let penalty = 0;
  for (const c of contradictions) {
    if (c.severity === "critical") penalty += 0.35;
    else if (c.severity === "high") penalty += 0.2;
    else if (c.severity === "medium") penalty += 0.1;
    else penalty += 0.05;
  }
  return Math.min(0.6, penalty);
}

function uncertaintyPenalty(uncertainties: ReadonlyArray<Uncertainty>): number {
  if (uncertainties.length === 0) return 0;
  let penalty = 0;
  for (const u of uncertainties) {
    if (u.severity === "high") penalty += 0.15;
    else if (u.severity === "medium") penalty += 0.08;
    else penalty += 0.03;
  }
  return Math.min(0.5, penalty);
}

function simulationSpread(simulations: ReadonlyArray<SimulationResult>): number {
  if (simulations.length === 0) return 0.5;
  const probs = simulations.map((s) => s.probability);
  const min = Math.min(...probs);
  const max = Math.max(...probs);
  return clamp01(max - min);
}

export function computeConfidence(input: {
  evidence: ReadonlyArray<Evidence>;
  contradictions: ReadonlyArray<Contradiction>;
  uncertainties: ReadonlyArray<Uncertainty>;
  simulations: ReadonlyArray<SimulationResult>;
  winnerScore: number;
}): ConfidenceModel {
  const coverage = coverageScore(input.evidence);
  const contra = contradictionPenalty(input.contradictions);
  const uncert = uncertaintyPenalty(input.uncertainties);
  const spread = simulationSpread(input.simulations);
  const base = input.winnerScore * 0.5 + coverage * 0.5;
  const overall = clamp01(base - contra - uncert - spread * 0.15);
  const model: ConfidenceModel = {
    overall,
    evidenceCoverage: coverage,
    contradictionPenalty: contra,
    uncertaintyPenalty: uncert,
    simulationSpread: spread,
  };
  emitCognitiveEvent("ConfidenceCalculated", {
    overall,
    coverage,
    contra,
    uncert,
    spread,
  });
  return model;
}
