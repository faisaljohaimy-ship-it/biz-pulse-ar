// Mesh node lifecycle. Pure functional.
import type { EvidenceRef, MeshNode, NodeIdentity, NodeStatus } from "./types";
import { HeartbeatInputZ, JoinNodeInputZ } from "./contracts";

export function createNode(input: {
  id: string;
  address: string;
  zone: string;
  identity: NodeIdentity;
  capabilities?: ReadonlyArray<string>;
  joinedAt: string;
  evidence?: ReadonlyArray<EvidenceRef>;
}): MeshNode {
  const parsed = JoinNodeInputZ.parse({
    id: input.id,
    address: input.address,
    zone: input.zone,
    identity: input.identity,
    capabilities: input.capabilities ?? [],
    joinedAt: input.joinedAt,
    evidence: input.evidence ?? [],
  });
  return {
    id: parsed.id,
    address: parsed.address,
    zone: parsed.zone,
    identity: parsed.identity,
    capabilities: parsed.capabilities,
    role: "follower",
    status: "joining",
    load: 0,
    joinedAt: parsed.joinedAt,
    lastHeartbeatAt: null,
    evidence: parsed.evidence,
  };
}

export function applyHeartbeat(
  node: MeshNode,
  hb: {
    nodeId: string;
    at: string;
    load: number;
    rttMs?: number | null;
    evidence?: ReadonlyArray<EvidenceRef>;
  },
): MeshNode {
  const parsed = HeartbeatInputZ.parse({
    nodeId: hb.nodeId,
    at: hb.at,
    load: hb.load,
    rttMs: hb.rttMs ?? null,
    evidence: hb.evidence ?? [],
  });
  if (parsed.nodeId !== node.id) return node;
  return {
    ...node,
    load: parsed.load,
    status: "active",
    lastHeartbeatAt: parsed.at,
    evidence: [...node.evidence, ...parsed.evidence],
  };
}

export function markStatus(node: MeshNode, status: NodeStatus): MeshNode {
  return { ...node, status };
}
