/**
 * Prompt advisory.
 *
 * Detects prompt-related failure signals and produces advisory proposals.
 * Prompts are never rewritten by this layer.
 */

import type { EvidenceRef, ImprovementProposal } from "./types";
import { listExperiences } from "./experience-store.server";
import { proposeImprovement } from "./improvement.server";

export function analyzePromptSignals(): ImprovementProposal | undefined {
  const failing = listExperiences().filter((e) =>
    e.failures.some((f) => /prompt|format|schema/i.test(f)),
  );
  if (failing.length < 2) return undefined;
  const evidence: readonly EvidenceRef[] = failing.slice(0, 5).map((e) => ({
    id: e.id,
    kind: "experience" as const,
    source: "evolution.experience-store",
    taken_at: e.created_at,
  }));
  return proposeImprovement({
    target: "prompt",
    summary: "Prompt/format failures observed.",
    rationale:
      "Multiple experiences reference prompt or output-format failures; advisory review recommended.",
    expected_gain: 0.07,
    expected_risk: "warn",
    evidence,
  });
}
