/**
 * Workflow advisory.
 *
 * Highlights workflows whose success rate falls below a stable window
 * threshold. Advisory only.
 */

import type { EvidenceRef, ImprovementProposal } from "./types";
import { listExperiences } from "./experience-store.server";
import { proposeImprovement } from "./improvement.server";

export function analyzeWorkflowSignals(): ImprovementProposal | undefined {
  const experiences = listExperiences().filter((e) =>
    e.problem.toLowerCase().includes("workflow"),
  );
  if (experiences.length < 3) return undefined;
  const failures = experiences.filter((e) => e.outcome === "failure").length;
  if (failures / experiences.length < 0.3) return undefined;
  const evidence: readonly EvidenceRef[] = experiences.slice(0, 5).map((e) => ({
    id: e.id,
    kind: "experience" as const,
    source: "evolution.experience-store",
    taken_at: e.created_at,
  }));
  return proposeImprovement({
    target: "workflow",
    summary: "Workflow failure ratio exceeds advisory threshold.",
    rationale: `${failures}/${experiences.length} recent workflow executions failed.`,
    expected_gain: 0.1,
    expected_risk: "warn",
    evidence,
  });
}
