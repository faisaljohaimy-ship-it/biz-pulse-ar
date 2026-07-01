// Node registry. Pure functional lifecycle.
import type { EvidenceRef, MeshNode, NodeStatus } from "./types";
import { HeartbeatInputZ, RegisterNodeInputZ } from "./contracts";

export function createNode(input: {
  id: string;
  address: string;
  zone: string;
  joinedAt: string;
  evidence?: ReadonlyArray<EvidenceRef>;
}): MeshNode {
  const parsed = RegisterNodeInputZ.parse({
    id: input.id,
    address: input.address,
    zone: input.zone,
    joinedAt: input.joinedAt,
    evidence: input.evidence ?? [],
  });
  return {
    id: parsed.id,
    address: parsed.address,
    zone: parsed.zone,
    status: "joining",
    load: 0,
    joinedAt: parsed.joinedAt,
    lastHeartbeatAt: null,
    evidence: parsed.evidence,
  };
}

export function applyHeartbeat(
  node: MeshNode,
  hb: { nodeId: string; at: string; load: number; rttMs?: number | null },
): MeshNode {
  const parsed = HeartbeatInputZ.parse({
    nodeId: hb.nodeId,
    at: hb.at,
    load: hb.load,
    rttMs: hb.rttMs ?? null,
  });
  if (parsed.nodeId !== node.id) return node;
  return { ...node, load: parsed.load, status: "active", lastHeartbeatAt: parsed.at };
}

export function markStatus(node: MeshNode, status: NodeStatus): MeshNode {
  return { ...node, status };
}

export interface NodeRegistry {
  readonly nodes: ReadonlyArray<MeshNode>;
}

export function createRegistry(): NodeRegistry {
  return { nodes: [] };
}

export function addNode(reg: NodeRegistry, node: MeshNode): NodeRegistry {
  if (reg.nodes.some((n) => n.id === node.id)) return reg;
  return { nodes: [...reg.nodes, node] };
}

export function updateNode(reg: NodeRegistry, node: MeshNode): NodeRegistry {
  return { nodes: reg.nodes.map((n) => (n.id === node.id ? node : n)) };
}

export function removeNode(reg: NodeRegistry, nodeId: string): NodeRegistry {
  return { nodes: reg.nodes.filter((n) => n.id !== nodeId) };
}

export function activeNodes(reg: NodeRegistry): MeshNode[] {
  return reg.nodes.filter((n) => n.status === "active");
}
