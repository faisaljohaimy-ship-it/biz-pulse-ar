// Recovery — plan node rejoin and message requeue from a checkpoint.
import type { Checkpoint, EvidenceRef, RecoveryPlan } from "./types";
import { RecoveryInputZ } from "./contracts";

export function planRecovery(input: {
  clusterId: string;
  checkpoint: Checkpoint;
  currentNodeIds: ReadonlyArray<string>;
  inFlightMessageIds: ReadonlyArray<string>;
  decidedAt: string;
  evidence?: ReadonlyArray<EvidenceRef>;
}): RecoveryPlan {
  const current = new Set(input.currentNodeIds);
  const rejoin = input.checkpoint.nodeIds.filter((id) => !current.has(id));
  const parsed = RecoveryInputZ.parse({
    clusterId: input.clusterId,
    restoreFromCheckpointId: input.checkpoint.id,
    rejoinNodeIds: rejoin,
    requeuedMessageIds: [...input.inFlightMessageIds],
    decidedAt: input.decidedAt,
    evidence: input.evidence ?? [],
  });
  return parsed;
}
