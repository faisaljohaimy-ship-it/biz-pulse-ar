// Mesh metrics aggregator.
import type {
  AgentDescriptor,
  ConsensusResult,
  Lease,
  MeshMetrics,
  MeshNode,
  ReplicationEntry,
  RouteDecision,
} from "./types";

export function computeMetrics(input: {
  nodes: ReadonlyArray<MeshNode>;
  agents: ReadonlyArray<AgentDescriptor>;
  routing: ReadonlyArray<RouteDecision>;
  leases: ReadonlyArray<Lease>;
  replications: ReadonlyArray<ReplicationEntry>;
  consensus: ReadonlyArray<ConsensusResult>;
  heartbeatLatenciesMs?: ReadonlyArray<number>;
}): MeshMetrics {
  const active = input.nodes.filter((n) => n.status === "active").length;
  const suspect = input.nodes.filter((n) => n.status === "suspect").length;
  const unreachable = input.nodes.filter((n) => n.status === "unreachable").length;
  const routed = input.routing.filter((r) => r.nodeId !== null).length;
  const commits = input.consensus.filter((c) => c.outcome === "committed").length;
  const avg =
    input.heartbeatLatenciesMs && input.heartbeatLatenciesMs.length > 0
      ? input.heartbeatLatenciesMs.reduce((a, b) => a + b, 0) / input.heartbeatLatenciesMs.length
      : null;
  return {
    nodes: input.nodes.length,
    active,
    suspect,
    unreachable,
    agents: input.agents.length,
    missionsRouted: routed,
    leasesGranted: input.leases.length,
    replications: input.replications.length,
    consensusCommits: commits,
    avgHeartbeatLatencyMs: avg,
  };
}
