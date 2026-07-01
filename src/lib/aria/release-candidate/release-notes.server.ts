/**
 * Release notes — deterministic assembly of highlights + decision.
 */
import type {
  GateResult,
  KnownLimitation,
  ReleaseDecision,
  ReleaseNotes,
  Requirement,
} from "./types";

export function buildReleaseNotes(input: {
  version: string;
  gates: readonly GateResult[];
  known_limitations: readonly KnownLimitation[];
  requirements: readonly Requirement[];
  decision: ReleaseDecision;
  decision_reason: string;
}): ReleaseNotes {
  const highlights = [
    "Executive AGI Governance & Control Layer (Phase 9.9) integrated.",
    "Long-Term Autonomous Memory + Knowledge Graph online with evidence linking.",
    "Multimodal Intelligence Engine (Phase 9.7) available for OCR/chart/audio pipelines.",
    "Autonomous Multi-Agent Runtime + Universal Tool Engine live.",
    "Executive Day Scenario (06:00–18:00) available for pilot demo.",
  ];
  return {
    version: input.version,
    generated_at: new Date().toISOString(),
    highlights,
    gates: input.gates,
    known_limitations: input.known_limitations,
    requirements: input.requirements,
    decision: input.decision,
    decision_reason: input.decision_reason,
  };
}
