// Batched mission routing on top of routing.server. Prevents duplicate execution across the batch.
import type {
  AgentDescriptor,
  CapabilityMap,
  MeshNode,
  Mission,
  RouteDecision,
} from "./types";
import { routeMission } from "./routing.server";

export function routeMissionBatch(input: {
  missions: ReadonlyArray<Mission>;
  capabilityMap: CapabilityMap;
  nodes: ReadonlyArray<MeshNode>;
  agents: ReadonlyArray<AgentDescriptor>;
  membershipQuorumMet: boolean;
  partitionSafe: boolean;
}): ReadonlyArray<RouteDecision> {
  const already = new Set<string>();
  const decisions: RouteDecision[] = [];
  for (const mission of input.missions) {
    const decision = routeMission({
      mission,
      capabilityMap: input.capabilityMap,
      nodes: input.nodes,
      agents: input.agents,
      membershipQuorumMet: input.membershipQuorumMet,
      partitionSafe: input.partitionSafe,
      alreadyRoutedMissionIds: already,
    });
    if (decision.nodeId) already.add(decision.missionId);
    decisions.push(decision);
  }
  return decisions;
}
