// Cluster node registration and heartbeat handling.
import type { ClusterNode, EvidenceRef, NodeStatus } from "./types";
import { HeartbeatInputZ, RegisterNodeInputZ } from "./contracts";

export function createNode(input: {
  id: string;
  address: string;
  zone: string;
  capacity: number;
  registeredAt: string;
  evidence?: ReadonlyArray<EvidenceRef>;
}): ClusterNode {
  const parsed = RegisterNodeInputZ.parse({
    id: input.id,
    address: input.address,
    zone: input.zone,
    capacity: input.capacity,
    evidence: input.evidence ?? [],
  });
  return {
    id: parsed.id,
    address: parsed.address,
    zone: parsed.zone,
    role: "follower",
    status: "registering",
    capacity: parsed.capacity,
    load: 0,
    registeredAt: input.registeredAt,
    lastHeartbeatAt: null,
    evidence: parsed.evidence,
  };
}

export function applyHeartbeat(
  node: ClusterNode,
  hb: { nodeId: string; at: string; load: number; evidence?: ReadonlyArray<EvidenceRef> },
): ClusterNode {
  const parsed = HeartbeatInputZ.parse({
    nodeId: hb.nodeId,
    at: hb.at,
    load: hb.load,
    evidence: hb.evidence ?? [],
  });
  if (parsed.nodeId !== node.id) return node;
  return {
    ...node,
    load: parsed.load,
    status: "ready",
    lastHeartbeatAt: parsed.at,
    evidence: [...node.evidence, ...parsed.evidence],
  };
}

export function markStatus(node: ClusterNode, status: NodeStatus): ClusterNode {
  return { ...node, status };
}
