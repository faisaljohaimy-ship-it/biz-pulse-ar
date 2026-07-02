import type { EvidenceRef, SlaModel, SlaTarget } from "./types";
import { SlaTargetZ } from "./contracts";

export function buildSlaModel(input: {
  targets: ReadonlyArray<SlaTarget>;
  measurementWindow: string;
  evidence: ReadonlyArray<EvidenceRef>;
}): SlaModel {
  if (input.targets.length === 0) throw new Error("SLA model requires at least one target");
  if (!input.measurementWindow.trim()) throw new Error("SLA measurementWindow required");
  if (input.evidence.length === 0) throw new Error("SLA model requires evidence");
  return {
    targets: input.targets.map((t) => SlaTargetZ.parse(t)),
    measurementWindow: input.measurementWindow,
    evidence: input.evidence,
  };
}
