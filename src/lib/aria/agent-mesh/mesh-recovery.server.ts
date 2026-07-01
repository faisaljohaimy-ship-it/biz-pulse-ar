// Mesh recovery — reassigns missions from failed/suspect holders to eligible alternates.
import type {
  AgentDescriptor,
  CapabilityMap,
  EvidenceRef,
  Lease,
  MeshNode,
  RecoveryPlan,
} from "./types";
import { bindingsFor } from "./capability-map.server";

export interface RecoveryInput {
  readonly failedNodeIds: ReadonlyArray<string>;
  readonly leases: ReadonlyArray<Lease>;
  readonly nodes: ReadonlyArray<MeshNode>;
  readonly agents: ReadonlyArray<AgentDescriptor>;
  readonly capabilityMap: CapabilityMap;
  readonly missionCapabilities: Readonly<Record<string, string>>;
  readonly decidedAt: string;
  readonly evidence?: ReadonlyArray<EvidenceRef>;
}

export function planRecovery(input: RecoveryInput): ReadonlyArray<RecoveryPlan> {
  const evidence = input.evidence ?? [];
  const failed = new Set(input.failedNodeIds);
  const activeNodeIds = new Set(
    input.nodes.filter((n) => n.status === "active" && !failed.has(n.id)).map((n) => n.id),
  );
  const agentStatus = new Map(input.agents.map((a) => [a.agentId, a.status] as const));
  const plans: RecoveryPlan[] = [];

  for (const lease of input.leases) {
    if (!failed.has(lease.holderNodeId)) continue;
    const capability = input.missionCapabilities[lease.missionId];
    if (!capability) {
      plans.push({
        missionId: lease.missionId,
        reason: "missing_capability_mapping",
        reassignToNodeId: null,
        reassignToAgentId: null,
        decidedAt: input.decidedAt,
        evidence,
      });
      continue;
    }
    const bindings = bindingsFor(input.capabilityMap, capability).filter(
      (b) =>
        !failed.has(b.nodeId) &&
        activeNodeIds.has(b.nodeId) &&
        (agentStatus.get(b.agentId) ?? "unknown") === "available",
    );
    const sorted = [...bindings].sort(
      (a, b) => a.nodeId.localeCompare(b.nodeId) || a.agentId.localeCompare(b.agentId),
    );
    const target = sorted[0] ?? null;
    plans.push({
      missionId: lease.missionId,
      reason: target ? "reassigned" : "no_eligible_target",
      reassignToNodeId: target?.nodeId ?? null,
      reassignToAgentId: target?.agentId ?? null,
      decidedAt: input.decidedAt,
      evidence,
    });
  }
  return plans;
}
