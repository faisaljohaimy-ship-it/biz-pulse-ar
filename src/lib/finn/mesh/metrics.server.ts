// Mesh metrics aggregator.
import type {
  BroadcastPlan,
  ConsensusResult,
  MeshCluster,
  MeshMetrics,
  ReplicationEntry,
  RouteDecision,
} from "./types";

export function computeMetrics(input: {
  cluster: MeshCluster;
  routing: ReadonlyArray<RouteDecision>;
  broadcasts: ReadonlyArray<BroadcastPlan>;
  replications: ReadonlyArray<ReplicationEntry>;
  consensus: ReadonlyArray<ConsensusResult>;
  leaderChanges: number;
  heartbeatLatenciesMs?: ReadonlyArray<number>;
  replicationLagsMs?: ReadonlyArray<number>;
}): MeshMetrics {
  const active = input.cluster.nodes.filter((n) => n.status === "active").length;
  const suspect = input.cluster.nodes.filter((n) => n.status === "suspect").length;
  const unreachable = input.cluster.nodes.filter((n) => n.status === "unreachable").length;
  const messagesRouted = input.routing.filter((d) => d.nodeId !== null).length;
  const commits = input.consensus.filter((c) => c.outcome === "committed").length;
  const avg = (arr?: ReadonlyArray<number>) =>
    arr && arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  return {
    nodes: input.cluster.nodes.length,
    active,
    suspect,
    unreachable,
    leaderChanges: input.leaderChanges,
    messagesRouted,
    broadcasts: input.broadcasts.length,
    replications: input.replications.length,
    consensusCommits: commits,
    avgHeartbeatLatencyMs: avg(input.heartbeatLatenciesMs),
    avgReplicationLagMs: avg(input.replicationLagsMs),
  };
}
