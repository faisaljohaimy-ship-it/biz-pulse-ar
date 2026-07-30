// Failover planner. Promotes a healthy candidate and requeues jobs.
import type { ClusterNode, EvidenceRef, FailoverPlan } from "./types";
import { FailoverInputZ } from "./contracts";

export function planFailover(input: {
  failedNodeId: string;
  candidates: ReadonlyArray<ClusterNode>;
  jobsOnFailedNode: ReadonlyArray<string>;
  decidedAt: string;
  evidence?: ReadonlyArray<EvidenceRef>;
}): FailoverPlan {
  const parsed = FailoverInputZ.parse({
    failedNodeId: input.failedNodeId,
    candidates: input.candidates.map((c) => c.id),
    jobsOnFailedNode: [...input.jobsOnFailedNode],
    evidence: input.evidence ?? [],
  });

  const healthy = input.candidates
    .filter((c) => c.status === "ready" && c.id !== parsed.failedNodeId)
    .sort((a, b) => a.load - b.load || a.id.localeCompare(b.id));

  const promoted = healthy[0]?.id ?? null;

  return {
    failedNodeId: parsed.failedNodeId,
    promotedNodeId: promoted,
    reassignedJobs: parsed.jobsOnFailedNode,
    decidedAt: input.decidedAt,
    evidence: parsed.evidence,
  };
}
