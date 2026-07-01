// Mesh verification. Enforces mesh invariants. Unknown stays UNKNOWN.
import type {
  BroadcastPlan,
  ConsensusResult,
  LeaderElection,
  MeshCluster,
  MeshDecision,
  MeshReport,
  RouteDecision,
} from "./types";

export interface VerificationInput {
  readonly cluster: MeshCluster;
  readonly leader: LeaderElection;
  readonly routing: ReadonlyArray<RouteDecision>;
  readonly broadcasts: ReadonlyArray<BroadcastPlan>;
  readonly consensus: ReadonlyArray<ConsensusResult>;
}

export interface VerificationOutput {
  readonly decision: MeshDecision;
  readonly reasons: ReadonlyArray<string>;
}

export function verifyMesh(input: VerificationInput): VerificationOutput {
  const reasons: string[] = [];

  // No duplicate leaders: cluster.leaderId must equal election leaderId when both set.
  if (
    input.cluster.leaderId &&
    input.leader.leaderId &&
    input.cluster.leaderId !== input.leader.leaderId
  ) {
    reasons.push("duplicate_leader_conflict");
  }

  // Elected leader must be part of the cluster.
  if (input.leader.leaderId && !input.cluster.nodes.some((n) => n.id === input.leader.leaderId)) {
    reasons.push("leader_not_registered");
  }

  // No split brain: cluster.term must match election term when leader present.
  if (input.leader.leaderId && input.cluster.term !== input.leader.term) {
    reasons.push("term_mismatch");
  }

  // No routing loops / duplicate execution: unique successful routes per message id.
  const routed = new Set<string>();
  for (const d of input.routing) {
    if (!d.nodeId) continue;
    if (routed.has(d.messageId)) reasons.push(`duplicate_route:${d.messageId}`);
    routed.add(d.messageId);
  }

  // No duplicate broadcasts: unique message id per plan.
  const bcast = new Set<string>();
  for (const b of input.broadcasts) {
    if (bcast.has(b.messageId)) reasons.push(`duplicate_broadcast:${b.messageId}`);
    bcast.add(b.messageId);
  }

  // No orphan nodes: nodes must be either active or a known transitional state.
  const orphans = input.cluster.nodes.filter((n) => n.status === "unknown");
  if (orphans.length > 0) reasons.push(`orphan_nodes:${orphans.length}`);

  // Consensus commits must have reached quorum.
  for (const c of input.consensus) {
    if (c.outcome === "committed" && c.acceptances.length < c.quorum) {
      reasons.push(`invalid_consensus:${c.proposalId}`);
    }
  }

  const anySuspect = input.cluster.nodes.some(
    (n) => n.status === "suspect" || n.status === "unreachable",
  );

  let decision: MeshDecision;
  if (reasons.length > 0) {
    decision = "NO_GO";
  } else if (input.leader.leaderId === null || input.cluster.nodes.length === 0) {
    decision = "UNKNOWN";
    if (input.leader.leaderId === null) reasons.push("leader_undecided");
    if (input.cluster.nodes.length === 0) reasons.push("empty_cluster");
  } else if (input.cluster.nodes.length < input.cluster.quorum || anySuspect) {
    decision = "GO_WITH_KNOWN_LIMITATIONS";
    if (input.cluster.nodes.length < input.cluster.quorum) reasons.push("below_quorum");
    if (anySuspect) reasons.push("degraded_members");
  } else {
    decision = "GO";
    reasons.push("all_invariants_satisfied");
  }

  return { decision, reasons };
}

export function assembleReport(input: {
  cluster: MeshCluster;
  leader: LeaderElection;
  registry: MeshReport["registry"];
  routing: ReadonlyArray<RouteDecision>;
  consensus: ReadonlyArray<ConsensusResult>;
  broadcasts: ReadonlyArray<BroadcastPlan>;
  replications: MeshReport["replications"];
  health: MeshReport["health"];
  presence: MeshReport["presence"];
  metrics: MeshReport["metrics"];
  audit: MeshReport["audit"];
  generatedAt: string;
}): MeshReport {
  const { decision, reasons } = verifyMesh({
    cluster: input.cluster,
    leader: input.leader,
    routing: input.routing,
    broadcasts: input.broadcasts,
    consensus: input.consensus,
  });
  return {
    cluster: input.cluster,
    leader: input.leader,
    registry: input.registry,
    routing: input.routing.slice(),
    consensus: input.consensus.slice(),
    broadcasts: input.broadcasts.slice(),
    replications: input.replications.slice(),
    health: input.health.slice(),
    presence: input.presence.slice(),
    metrics: input.metrics,
    audit: input.audit.slice(),
    decision,
    reasons,
    generatedAt: input.generatedAt,
  };
}
