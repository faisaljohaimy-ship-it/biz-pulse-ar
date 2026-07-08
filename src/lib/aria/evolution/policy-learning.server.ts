/**
 * Policy advisory.
 *
 * Detects policy-related failures. Never rewrites a policy — only
 * proposes advisory review.
 */

import type { EvidenceRef, ImprovementProposal } from "./types";
import { listExperiences } from "./experience-store.server";
import { proposeImprovement } from "./improvement.server";

export function analyzePolicySignals(): ImprovementProposal | undefined {
  const failing = listExperiences().filter((e) =>
    e.failures.some((f) => /policy|permission|denied/i.test(f)),
  );
  if (failing.length < 2) return undefined;
  const evidence: readonly EvidenceRef[] = failing.slice(0, 5).map((e) => ({
    id: e.id,
    kind: "experience" as const,
    source: "evolution.experience-store",
    taken_at: e.created_at,
  }));
  return proposeImprovement({
    target: "policy",
    summary: "Policy denials repeated across recent executions.",
    rationale: "Multiple experiences reference policy denials; advisory review recommended.",
    expected_gain: 0.05,
    expected_risk: "error",
    evidence,
  });
}
