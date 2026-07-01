// Safe mission routing — refuses on partition / no quorum / no binding.
import type {
  AgentDescriptor,
  CapabilityMap,
  MeshNode,
  Mission,
  RouteDecision,
} from "./types";
import { bindingsFor } from "./capability-map.server";
import { RouteMissionInputZ } from "./contracts";

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function routeMission(input: {
  mission: Mission;
  capabilityMap: CapabilityMap;
  nodes: ReadonlyArray<MeshNode>;
  agents: ReadonlyArray<AgentDescriptor>;
  membershipQuorumMet: boolean;
  partitionSafe: boolean;
  alreadyRoutedMissionIds: ReadonlySet<string>;
}): RouteDecision {
  RouteMissionInputZ.parse({
    mission: input.mission,
    membershipQuorumMet: input.membershipQuorumMet,
    partitionSafe: input.partitionSafe,
  });

  if (input.alreadyRoutedMissionIds.has(input.mission.id)) {
    return {
      missionId: input.mission.id,
      agentId: null,
      nodeId: null,
      capability: input.mission.capability,
      reason: "duplicate_mission_rejected",
      evidence: [],
    };
  }
  if (!input.membershipQuorumMet) {
    return {
      missionId: input.mission.id,
      agentId: null,
      nodeId: null,
      capability: input.mission.capability,
      reason: "no_quorum",
      evidence: [],
    };
  }
  if (!input.partitionSafe) {
    return {
      missionId: input.mission.id,
      agentId: null,
      nodeId: null,
      capability: input.mission.capability,
      reason: "partition_unsafe",
      evidence: [],
    };
  }

  const bindings = bindingsFor(input.capabilityMap, input.mission.capability);
  if (bindings.length === 0) {
    return {
      missionId: input.mission.id,
      agentId: null,
      nodeId: null,
      capability: input.mission.capability,
      reason: "capability_unbound",
      evidence: [],
    };
  }

  const activeNodeIds = new Set(
    input.nodes.filter((n) => n.status === "active").map((n) => n.id),
  );
  const agentStatus = new Map(input.agents.map((a) => [a.agentId, a.status] as const));

  const eligible = bindings.filter(
    (b) =>
      activeNodeIds.has(b.nodeId) &&
      (agentStatus.get(b.agentId) ?? "unknown") === "available" &&
      b.weight > 0,
  );

  if (eligible.length === 0) {
    return {
      missionId: input.mission.id,
      agentId: null,
      nodeId: null,
      capability: input.mission.capability,
      reason: "no_eligible_agent",
      evidence: [],
    };
  }

  // Deterministic selection: hash of missionId/key over sorted eligible.
  const key = input.mission.key ?? input.mission.id;
  const picked = eligible[hash(key) % eligible.length];

  return {
    missionId: input.mission.id,
    agentId: picked.agentId,
    nodeId: picked.nodeId,
    capability: input.mission.capability,
    reason: "selected",
    evidence: [],
  };
}
