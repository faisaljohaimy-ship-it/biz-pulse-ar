// Deployment metrics computation.
import type { Cluster, DeploymentMetrics, RoutingDecision, FailoverPlan } from "./types";

export function computeMetrics(input: {
  cluster: Cluster;
  routingDecisions: ReadonlyArray<RoutingDecision>;
  failovers: ReadonlyArray<FailoverPlan>;
  leaderChanges: number;
}): DeploymentMetrics {
  const ready = input.cluster.nodes.filter((n) => n.status === "ready").length;
  const unhealthy = input.cluster.nodes.filter((n) => n.status === "unhealthy").length;
  const routed = input.routingDecisions.filter((d) => d.nodeId !== null).length;
  return {
    nodes: input.cluster.nodes.length,
    ready,
    unhealthy,
    leaderChanges: input.leaderChanges,
    jobsRouted: routed,
    failovers: input.failovers.length,
  };
}
