// Replication planner — assigns primary and deterministic replicas.
import type { MeshNode, ReplicationEntry } from "./types";
import { ReplicationInputZ } from "./contracts";

export function planReplication(input: {
  key: string;
  nodes: ReadonlyArray<MeshNode>;
  replicationFactor: number;
  version: number;
  updatedAt: string;
}): ReplicationEntry {
  if (input.replicationFactor < 1) throw new Error("replicationFactor must be >= 1");
  const active = input.nodes
    .filter((n) => n.status === "active")
    .sort((a, b) => a.id.localeCompare(b.id));
  if (active.length === 0) throw new Error("no active nodes for replication");
  const primary = active[0];
  const replicas = active.slice(1, input.replicationFactor).map((n) => n.id);
  const parsed = ReplicationInputZ.parse({
    key: input.key,
    primaryNodeId: primary.id,
    replicaNodeIds: replicas,
    version: input.version,
    updatedAt: input.updatedAt,
  });
  return parsed;
}

export function replicationLagMs(input: {
  primaryUpdatedAt: string;
  replicaAckAt: string;
}): number {
  return Math.max(0, Date.parse(input.replicaAckAt) - Date.parse(input.primaryUpdatedAt));
}
