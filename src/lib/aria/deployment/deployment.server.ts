// End-to-end deployment pipeline orchestrator.
// validate env → register nodes → elect leader → start worker pools →
// route jobs → monitor health → failover → scale → audit → verify.

import type {
  Cluster,
  ClusterNode,
  DeploymentReport,
  EnvironmentSpec,
  EvidenceRef,
  FailoverPlan,
  Job,
  LeaderElection,
  LoadStrategy,
  ProbeResult,
  ReleaseChannel,
  RoutingDecision,
  ScalingPlan,
  WorkerPool,
} from "./types";
import { validateEnvironment } from "./environment.server";
import { addNode, createCluster, setLeader } from "./cluster.server";
import { createNode, applyHeartbeat } from "./node.server";
import { createWorkerPool } from "./worker-pool.server";
import { routeJobs } from "./job-routing.server";
import { electLeader } from "./leader-election.server";
import { planFailover } from "./failover.server";
import { planScaling } from "./scaling.server";
import { healthProbe } from "./health-probe.server";
import { readinessProbe } from "./readiness-probe.server";
import { livenessProbe } from "./liveness-probe.server";
import { createAuditLog } from "./audit.server";
import { computeMetrics } from "./metrics.server";
import { assembleReport } from "./verification.server";

export interface NodeSpec {
  readonly id: string;
  readonly address: string;
  readonly zone: string;
  readonly capacity: number;
  readonly workerPoolSize: number;
  readonly heartbeat: { at: string; load: number };
  readonly probeSignals: {
    lastHeartbeatAgeMs: number;
    workerPoolReady: boolean;
    configLoaded: boolean;
  };
  readonly evidence?: ReadonlyArray<EvidenceRef>;
}

export interface DeploymentPipelineInput {
  readonly clusterId: string;
  readonly channel: ReleaseChannel;
  readonly quorum: number;
  readonly environment: EnvironmentSpec;
  readonly nodes: ReadonlyArray<NodeSpec>;
  readonly votes: Record<string, string>;
  readonly term: number;
  readonly jobs: ReadonlyArray<Job>;
  readonly routingStrategy: LoadStrategy;
  readonly failedNodeId?: string;
  readonly scaling: {
    targetUtilization: number;
    observedUtilization: number;
    minNodes: number;
    maxNodes: number;
  };
  readonly now: string;
  readonly evidence?: ReadonlyArray<EvidenceRef>;
}

export interface DeploymentPipelineOutput {
  readonly report: DeploymentReport;
  readonly cluster: Cluster;
  readonly leader: LeaderElection;
  readonly workerPools: ReadonlyArray<WorkerPool>;
  readonly routing: ReadonlyArray<RoutingDecision>;
  readonly failover: FailoverPlan | null;
  readonly scaling: ScalingPlan;
  readonly probes: ReadonlyArray<ProbeResult>;
}

export function runDeploymentPipeline(input: DeploymentPipelineInput): DeploymentPipelineOutput {
  const audit = createAuditLog();
  const evidence = input.evidence ?? [];

  // 1. environment
  const env = validateEnvironment(input.environment, evidence);
  audit.append({
    at: input.now,
    stage: "environment",
    status: env.overall,
    detail: `env.kind=${env.kind} runtime=${env.runtime}`,
    evidence,
  });

  // 2. register nodes
  let cluster: Cluster = createCluster({
    id: input.clusterId,
    channel: input.channel,
    quorum: input.quorum,
    createdAt: input.now,
  });

  for (const spec of input.nodes) {
    let node: ClusterNode = createNode({
      id: spec.id,
      address: spec.address,
      zone: spec.zone,
      capacity: spec.capacity,
      registeredAt: input.now,
      evidence: spec.evidence,
    });
    node = applyHeartbeat(node, {
      nodeId: spec.id,
      at: spec.heartbeat.at,
      load: spec.heartbeat.load,
    });
    cluster = addNode(cluster, node);
    audit.append({
      at: input.now,
      stage: "node.register",
      status: "pass",
      detail: `node=${node.id} zone=${node.zone}`,
      evidence: node.evidence,
    });
  }

  // 3. leader election
  const leader = electLeader({
    clusterId: cluster.id,
    candidateIds: cluster.nodes.map((n) => n.id),
    quorum: cluster.quorum,
    term: input.term,
    votes: input.votes,
    decidedAt: input.now,
    evidence,
  });
  if (leader.leaderId) {
    cluster = setLeader(cluster, leader.leaderId);
    audit.append({
      at: input.now,
      stage: "leader.election",
      status: "pass",
      detail: `leader=${leader.leaderId} term=${leader.term}`,
      evidence,
    });
  } else {
    audit.append({
      at: input.now,
      stage: "leader.election",
      status: "unknown",
      detail: "no_quorum_or_tie",
      evidence,
    });
  }

  // 4. worker pools
  const workerPools: WorkerPool[] = input.nodes.map((spec) =>
    createWorkerPool({ nodeId: spec.id, size: spec.workerPoolSize, now: input.now }),
  );
  audit.append({
    at: input.now,
    stage: "worker.pool",
    status: "pass",
    detail: `pools=${workerPools.length}`,
    evidence,
  });

  // 5. route jobs
  const routing = routeJobs(input.jobs, cluster.nodes, input.routingStrategy);
  audit.append({
    at: input.now,
    stage: "route",
    status: routing.decisions.every((d) => d.nodeId !== null) ? "pass" : "unknown",
    detail: `decisions=${routing.decisions.length}`,
    evidence,
  });

  // 6. probes
  const probes: ProbeResult[] = [];
  for (const spec of input.nodes) {
    probes.push(
      healthProbe({ nodeId: spec.id, signals: spec.probeSignals, now: input.now, evidence }),
    );
    probes.push(
      readinessProbe({
        nodeId: spec.id,
        signals: {
          workerPoolReady: spec.probeSignals.workerPoolReady,
          configLoaded: spec.probeSignals.configLoaded,
        },
        now: input.now,
        evidence,
      }),
    );
    probes.push(
      livenessProbe({
        nodeId: spec.id,
        signals: { lastHeartbeatAgeMs: spec.probeSignals.lastHeartbeatAgeMs },
        now: input.now,
        evidence,
      }),
    );
  }

  // 7. failover (optional)
  let failover: FailoverPlan | null = null;
  if (input.failedNodeId) {
    failover = planFailover({
      failedNodeId: input.failedNodeId,
      candidates: cluster.nodes,
      jobsOnFailedNode: routing.decisions
        .filter((d) => d.nodeId === input.failedNodeId)
        .map((d) => d.jobId),
      decidedAt: input.now,
      evidence,
    });
    audit.append({
      at: input.now,
      stage: "failover",
      status: failover.promotedNodeId ? "pass" : "unknown",
      detail: `failed=${input.failedNodeId} promoted=${failover.promotedNodeId ?? "none"}`,
      evidence,
    });
  }

  // 8. scaling
  const scaling = planScaling({
    currentNodes: cluster.nodes.length,
    targetUtilization: input.scaling.targetUtilization,
    observedUtilization: input.scaling.observedUtilization,
    minNodes: input.scaling.minNodes,
    maxNodes: input.scaling.maxNodes,
    evidence,
  });
  audit.append({
    at: input.now,
    stage: "scale",
    status: scaling.action === "unknown" ? "unknown" : "pass",
    detail: `action=${scaling.action} desired=${scaling.desiredNodes}`,
    evidence,
  });

  // 9. metrics + report
  const metrics = computeMetrics({
    cluster,
    routingDecisions: routing.decisions,
    failovers: failover ? [failover] : [],
    leaderChanges: leader.leaderId ? 1 : 0,
  });

  const report = assembleReport({
    env,
    cluster,
    leader,
    probes,
    routing: routing.decisions,
    metrics,
    audit: audit.entries(),
    generatedAt: input.now,
  });

  return {
    report,
    cluster,
    leader,
    workerPools,
    routing: routing.decisions,
    failover,
    scaling,
    probes,
  };
}
