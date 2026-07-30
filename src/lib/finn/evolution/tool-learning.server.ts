/**
 * Tool-usage advisory.
 *
 * Aggregates tool failures across the experience store and proposes
 * advisory follow-ups. Does not touch the Tool Engine.
 */

import type { EvidenceRef, ImprovementProposal } from "./types";
import { listExperiences } from "./experience-store.server";
import { proposeImprovement } from "./improvement.server";

export function analyzeToolSignals(): ImprovementProposal | undefined {
  const failing = listExperiences().filter((e) =>
    e.failures.some((f) => f.toLowerCase().includes("tool")),
  );
  if (failing.length < 3) return undefined;
  const evidence: readonly EvidenceRef[] = failing.slice(0, 5).map((e) => ({
    id: e.id,
    kind: "experience" as const,
    source: "evolution.experience-store",
    taken_at: e.created_at,
  }));
  return proposeImprovement({
    target: "tool",
    summary: "Repeated tool-level failures observed.",
    rationale: "Multiple experiences reference tool failures; advisory review recommended.",
    expected_gain: 0.12,
    expected_risk: "warn",
    evidence,
  });
}
