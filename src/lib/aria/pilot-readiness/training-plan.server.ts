// Training plan.
import type { EvidenceRef, TrainingModule, TrainingPlan } from "./types";
import { TrainingModuleZ } from "./contracts";

export function buildTrainingPlan(input: {
  pilotId: string;
  modules: ReadonlyArray<TrainingModule>;
  evidence: ReadonlyArray<EvidenceRef>;
}): TrainingPlan {
  if (input.evidence.length === 0) throw new Error("training plan requires evidence");
  const modules = input.modules.map((m) => TrainingModuleZ.parse(m));
  const totalMinutes = modules.reduce((acc, m) => acc + m.durationMinutes, 0);
  return { pilotId: input.pilotId, modules, totalMinutes, evidence: input.evidence };
}
