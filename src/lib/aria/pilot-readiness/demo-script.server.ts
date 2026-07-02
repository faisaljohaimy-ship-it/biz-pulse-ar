// Executive demo script builder — deterministic ordering + total-time computation.
import type { DemoScript, DemoStep, EvidenceRef } from "./types";
import { DemoStepZ } from "./contracts";

export function buildDemoScript(input: {
  pilotId: string;
  audience: string;
  steps: ReadonlyArray<DemoStep>;
  evidence: ReadonlyArray<EvidenceRef>;
}): DemoScript {
  if (input.evidence.length === 0) {
    throw new Error("demo script requires evidence-linked context");
  }
  const parsedSteps = input.steps.map((s) => DemoStepZ.parse(s));
  const sorted = [...parsedSteps].sort((a, b) => a.order - b.order);
  const totalMinutes = sorted.reduce((acc, s) => acc + s.durationMinutes, 0);
  return {
    pilotId: input.pilotId,
    audience: input.audience,
    totalMinutes,
    steps: sorted,
    evidence: input.evidence,
  };
}
