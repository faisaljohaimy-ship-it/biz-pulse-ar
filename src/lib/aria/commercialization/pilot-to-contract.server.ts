import type { EvidenceRef, PilotToContractPath, PilotToContractStep } from "./types";
import { PilotToContractStepZ } from "./contracts";

export function buildPilotToContractPath(input: {
  pilotId: string;
  steps: ReadonlyArray<PilotToContractStep>;
  evidence: ReadonlyArray<EvidenceRef>;
}): PilotToContractPath {
  if (input.evidence.length === 0) {
    throw new Error("pilot-to-contract path requires evidence");
  }
  const steps = input.steps.map((s) => PilotToContractStepZ.parse(s));
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const seen = new Set<number>();
  for (const s of sorted) {
    if (seen.has(s.order)) throw new Error(`duplicate step order: ${s.order}`);
    seen.add(s.order);
  }
  const totalDays = sorted.reduce((acc, s) => acc + s.durationDays, 0);
  return { pilotId: input.pilotId, steps: sorted, totalDays, evidence: input.evidence };
}
