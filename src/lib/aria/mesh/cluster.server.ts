// Mesh cluster state — pure functional operations.
import type { MeshCluster, MeshNode, Peer } from "./types";

export function createCluster(input: {
  id: string;
  quorum: number;
  createdAt: string;
}): MeshCluster {
  if (input.quorum < 1) throw new Error("quorum must be >= 1");
  return {
    id: input.id,
    nodes: [],
    peers: [],
    leaderId: null,
    term: 0,
    quorum: input.quorum,
    createdAt: input.createdAt,
  };
}

export function addNode(cluster: MeshCluster, node: MeshNode): MeshCluster {
  if (cluster.nodes.some((n) => n.id === node.id)) return cluster;
  return { ...cluster, nodes: [...cluster.nodes, node] };
}

export function updateNode(cluster: MeshCluster, node: MeshNode): MeshCluster {
  return { ...cluster, nodes: cluster.nodes.map((n) => (n.id === node.id ? node : n)) };
}

export function removeNode(cluster: MeshCluster, nodeId: string): MeshCluster {
  const nodes = cluster.nodes.filter((n) => n.id !== nodeId);
  const peers = cluster.peers.filter((p) => p.nodeId !== nodeId);
  const leaderId = cluster.leaderId === nodeId ? null : cluster.leaderId;
  return { ...cluster, nodes, peers, leaderId };
}

export function upsertPeer(cluster: MeshCluster, peer: Peer): MeshCluster {
  const exists = cluster.peers.some((p) => p.nodeId === peer.nodeId);
  const peers = exists
    ? cluster.peers.map((p) => (p.nodeId === peer.nodeId ? peer : p))
    : [...cluster.peers, peer];
  return { ...cluster, peers };
}

export function activeNodes(cluster: MeshCluster): MeshNode[] {
  return cluster.nodes.filter((n) => n.status === "active");
}

export function setLeader(
  cluster: MeshCluster,
  leaderId: string | null,
  term: number,
): MeshCluster {
  if (leaderId && !cluster.nodes.some((n) => n.id === leaderId)) {
    throw new Error("leader must be a registered node");
  }
  return { ...cluster, leaderId, term };
}
