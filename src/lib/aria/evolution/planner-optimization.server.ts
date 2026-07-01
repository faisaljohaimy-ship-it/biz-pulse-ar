/**
 * Planner optimization advisor.
 *
 * Reads planning-tagged experiences and suggests advisory improvements.
 * Never rewrites the planner.
 */

import type { EvidenceRef, ImprovementProposal } from "./types";
import { listExperiences } from "./experience-store.server";
import { proposeImprovement } from "./improvement.server";

export function analyzePlannerSignals(): ImprovementProposal | undefined {
  const experiences = listExperiences().filter((e) =>
    e.lessons.some((l) => l.toLowerCase().includes("plan")),
  );
  if (experiences.length < 3) return undefined;
  const evidence: readonly EvidenceRef[] = experiences.slice(0, 5).map((e) => ({
    id: e.id,
    kind: "experience" as const,
    source: "evolution.experience-store",
    taken_at: e.created_at,
  }));
  return proposeImprovement({
    target: "planner",
    summary: "Planner cost/reliability drift detected across recent runs.",
    rationale:
      "Multiple experiences reference plan-related lessons; advisory review recommended.",
    expected_gain: 0.1,
    expected_risk: "warn",
    evidence,
  });
}
