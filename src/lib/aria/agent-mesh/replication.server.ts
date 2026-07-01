// Replication planner — deterministic primary and replicas.
import type { MeshNode, ReplicationEntry } from "./types";
import { ReplicationInputZ } from "./contracts";

export function planReplication(input: {
  missionId: string;
  nodes: ReadonlyArray<MeshNode>;
  replicationFactor: number;
  version: number;
  updatedAt: string;
  primaryNodeId?: string;
}): ReplicationEntry {
  if (input.replicationFactor < 1) throw new Error("replicationFactor must be >= 1");
  const active = input.nodes
    .filter((n) => n.status === "active")
    .sort((a, b) => a.id.localeCompare(b.id));
  if (active.length === 0) throw new Error("no active nodes for replication");
  const primary =
    (input.primaryNodeId ? active.find((n) => n.id === input.primaryNodeId) : undefined) ??
    active[0];
  const replicas = active
    .filter((n) => n.id !== primary.id)
    .slice(0, Math.max(0, input.replicationFactor - 1))
    .map((n) => n.id);
  return ReplicationInputZ.parse({
    missionId: input.missionId,
    primaryNodeId: primary.id,
    replicaNodeIds: replicas,
    version: input.version,
    updatedAt: input.updatedAt,
  });
}
