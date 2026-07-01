// Cluster registry — pure functional operations.
import type { Cluster, ClusterNode, ReleaseChannel } from "./types";

export function createCluster(input: {
  id: string;
  channel: ReleaseChannel;
  quorum: number;
  createdAt: string;
}): Cluster {
  if (input.quorum < 1) throw new Error("quorum must be >= 1");
  return {
    id: input.id,
    channel: input.channel,
    nodes: [],
    leaderId: null,
    quorum: input.quorum,
    createdAt: input.createdAt,
  };
}

export function addNode(cluster: Cluster, node: ClusterNode): Cluster {
  if (cluster.nodes.some((n) => n.id === node.id)) return cluster;
  return { ...cluster, nodes: [...cluster.nodes, node] };
}

export function updateNode(cluster: Cluster, node: ClusterNode): Cluster {
  const nodes = cluster.nodes.map((n) => (n.id === node.id ? node : n));
  return { ...cluster, nodes };
}

export function removeNode(cluster: Cluster, nodeId: string): Cluster {
  const nodes = cluster.nodes.filter((n) => n.id !== nodeId);
  const leaderId = cluster.leaderId === nodeId ? null : cluster.leaderId;
  return { ...cluster, nodes, leaderId };
}

export function readyNodes(cluster: Cluster): ClusterNode[] {
  return cluster.nodes.filter((n) => n.status === "ready");
}

export function setLeader(cluster: Cluster, leaderId: string | null): Cluster {
  if (leaderId && !cluster.nodes.some((n) => n.id === leaderId)) {
    throw new Error("leader must be a registered node");
  }
  return { ...cluster, leaderId };
}
