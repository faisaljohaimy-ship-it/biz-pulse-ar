// Deployment verification. Enforces invariants; unknown stays UNKNOWN.
import type {
  Cluster,
  DeploymentDecision,
  DeploymentReport,
  EnvironmentReport,
  LeaderElection,
  ProbeResult,
  RoutingDecision,
} from "./types";

export interface VerificationInput {
  readonly env: EnvironmentReport;
  readonly cluster: Cluster;
  readonly leader: LeaderElection;
  readonly probes: ReadonlyArray<ProbeResult>;
  readonly routing: ReadonlyArray<RoutingDecision>;
}

export interface VerificationOutput {
  readonly decision: DeploymentDecision;
  readonly reasons: ReadonlyArray<string>;
}

export function verifyDeployment(input: VerificationInput): VerificationOutput {
  const reasons: string[] = [];

  // Invariant: no duplicate leader across cluster and election.
  if (
    input.cluster.leaderId &&
    input.leader.leaderId &&
    input.cluster.leaderId !== input.leader.leaderId
  ) {
    reasons.push("duplicate_leader_conflict");
  }

  // Invariant: elected leader must exist in cluster nodes.
  if (input.leader.leaderId && !input.cluster.nodes.some((n) => n.id === input.leader.leaderId)) {
    reasons.push("leader_not_registered");
  }

  // Invariant: no unsafe job duplication.
  const jobIds = new Set<string>();
  for (const d of input.routing) {
    if (d.nodeId && jobIds.has(d.jobId)) reasons.push(`duplicate_route:${d.jobId}`);
    if (d.nodeId) jobIds.add(d.jobId);
  }

  // Environment must be pass for GO.
  const envState = input.env.overall;
  const anyProbeUnhealthy = input.probes.some((p) => p.state === "unhealthy");
  const anyProbeUnknown = input.probes.some((p) => p.state === "unknown");

  let decision: DeploymentDecision;
  if (reasons.length > 0 || envState === "fail" || anyProbeUnhealthy) {
    decision = "NO_GO";
    if (envState === "fail") reasons.push("environment_failed");
    if (anyProbeUnhealthy) reasons.push("probes_unhealthy");
  } else if (envState === "unknown" || anyProbeUnknown || input.leader.leaderId === null) {
    decision = "UNKNOWN";
    if (envState === "unknown") reasons.push("environment_unknown");
    if (anyProbeUnknown) reasons.push("probes_unknown");
    if (input.leader.leaderId === null) reasons.push("leader_undecided");
  } else if (input.cluster.nodes.length < input.cluster.quorum) {
    decision = "GO_WITH_KNOWN_LIMITATIONS";
    reasons.push("cluster_below_quorum");
  } else {
    decision = "GO";
    reasons.push("all_invariants_satisfied");
  }

  return { decision, reasons };
}

export function assembleReport(input: {
  env: EnvironmentReport;
  cluster: Cluster;
  leader: LeaderElection;
  probes: ReadonlyArray<ProbeResult>;
  routing: ReadonlyArray<RoutingDecision>;
  metrics: DeploymentReport["metrics"];
  audit: DeploymentReport["audit"];
  generatedAt: string;
}): DeploymentReport {
  const { decision, reasons } = verifyDeployment({
    env: input.env,
    cluster: input.cluster,
    leader: input.leader,
    probes: input.probes,
    routing: input.routing,
  });
  return {
    environment: input.env,
    cluster: input.cluster,
    leader: input.leader,
    probes: input.probes.slice(),
    metrics: input.metrics,
    audit: input.audit.slice(),
    decision,
    reasons,
    generatedAt: input.generatedAt,
  };
}
