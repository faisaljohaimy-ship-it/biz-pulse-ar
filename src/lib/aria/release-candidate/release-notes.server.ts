/**
 * Phase 10.0 — Release notes draft generator.
 */
import type { Decision, GateResult, ReleaseNotesDraft } from "./types";

export function buildReleaseNotes(
  version: string,
  gates: ReadonlyArray<GateResult>,
  decision: Decision,
): ReleaseNotesDraft {
  const highlights: string[] = [
    "ARIA Enterprise AI OS Release Candidate 1.",
    "Governance-first execution across planning, tools, and runtime.",
    "Evidence-linked release readiness assessment.",
  ];

  const known_limitations: string[] = [];
  for (const g of gates) {
    if (g.status === "unknown") {
      known_limitations.push(`Gate ${g.gate}: evidence not supplied at RC1 cut.`);
    } else if (g.status === "warn") {
      known_limitations.push(`Gate ${g.gate}: warnings acknowledged.`);
    } else if (g.status === "fail" && g.severity !== "critical") {
      known_limitations.push(`Gate ${g.gate}: non-critical failure documented.`);
    }
  }

  return {
    version,
    generated_at: new Date().toISOString(),
    highlights,
    gates,
    known_limitations,
    decision,
  };
}
