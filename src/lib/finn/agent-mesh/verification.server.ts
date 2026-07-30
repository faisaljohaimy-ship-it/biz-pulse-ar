// Mesh verification. Enforces core invariants. Unknown stays UNKNOWN.
import type {
  ConsensusResult,
  Lease,
  MembershipView,
  MeshDecision,
  MeshReport,
  PartitionReport,
  ReplicationEntry,
  RouteDecision,
} from "./types";

export interface VerificationInput {
  readonly membership: MembershipView;
  readonly partition: PartitionReport;
  readonly routing: ReadonlyArray<RouteDecision>;
  readonly leases: ReadonlyArray<Lease>;
  readonly replications: ReadonlyArray<ReplicationEntry>;
  readonly consensus: ReadonlyArray<ConsensusResult>;
}

export interface VerificationOutput {
  readonly decision: MeshDecision;
  readonly reasons: ReadonlyArray<string>;
}

export function verifyMesh(input: VerificationInput): VerificationOutput {
  const reasons: string[] = [];

  // No duplicate mission execution: unique successful mission routes.
  const routedMissions = new Set<string>();
  for (const d of input.routing) {
    if (!d.nodeId) continue;
    if (routedMissions.has(d.missionId)) reasons.push(`duplicate_mission:${d.missionId}`);
    routedMissions.add(d.missionId);
  }

  // No duplicate lease holder per mission.
  const leaseMissions = new Set<string>();
  for (const l of input.leases) {
    if (leaseMissions.has(l.missionId)) reasons.push(`duplicate_lease:${l.missionId}`);
    leaseMissions.add(l.missionId);
  }

  // Replication must have primary != any replica and no duplicate targets.
  for (const r of input.replications) {
    if (r.replicaNodeIds.includes(r.primaryNodeId)) {
      reasons.push(`replica_equals_primary:${r.missionId}`);
    }
    const dup = new Set<string>();
    for (const rid of r.replicaNodeIds) {
      if (dup.has(rid)) reasons.push(`duplicate_replica:${r.missionId}`);
      dup.add(rid);
    }
  }

  // Consensus commits must actually meet quorum.
  for (const c of input.consensus) {
    if (c.outcome === "committed" && c.acceptances.length < c.quorum) {
      reasons.push(`fake_consensus:${c.proposalId}`);
    }
  }

  // Unsafe execution during partition: no routed missions when partition unsafe.
  if (input.partition.state === "partitioned") {
    const anyRouted = input.routing.some((d) => d.nodeId !== null);
    if (anyRouted) reasons.push("execution_during_partition");
  }

  // Leader must belong to membership when present.
  if (input.membership.leaderId && !input.membership.members.includes(input.membership.leaderId)) {
    reasons.push("leader_not_in_membership");
  }

  const quorumMet = input.membership.members.length >= input.membership.quorum;
  const partitionUnknown = input.partition.state === "unknown";

  let decision: MeshDecision;
  if (reasons.length > 0) {
    decision = "NO_GO";
  } else if (input.membership.members.length === 0 || partitionUnknown) {
    decision = "UNKNOWN";
    if (input.membership.members.length === 0) reasons.push("empty_membership");
    if (partitionUnknown) reasons.push("partition_unknown");
  } else if (!quorumMet || input.partition.state !== "healthy") {
    decision = "GO_WITH_KNOWN_LIMITATIONS";
    if (!quorumMet) reasons.push("below_quorum");
    if (input.partition.state !== "healthy") reasons.push(`partition_${input.partition.state}`);
  } else {
    decision = "GO";
    reasons.push("all_invariants_satisfied");
  }

  return { decision, reasons };
}

export function assembleReport(input: {
  membership: MembershipView;
  capabilityMap: MeshReport["capabilityMap"];
  routing: ReadonlyArray<RouteDecision>;
  leases: ReadonlyArray<Lease>;
  replications: ReadonlyArray<ReplicationEntry>;
  consensus: ReadonlyArray<ConsensusResult>;
  partition: PartitionReport;
  health: MeshReport["health"];
  metrics: MeshReport["metrics"];
  audit: MeshReport["audit"];
  generatedAt: string;
}): MeshReport {
  const { decision, reasons } = verifyMesh({
    membership: input.membership,
    partition: input.partition,
    routing: input.routing,
    leases: input.leases,
    replications: input.replications,
    consensus: input.consensus,
  });
  return {
    membership: input.membership,
    capabilityMap: input.capabilityMap,
    routing: input.routing.slice(),
    leases: input.leases.slice(),
    replications: input.replications.slice(),
    consensus: input.consensus.slice(),
    partition: input.partition,
    health: input.health.slice(),
    metrics: input.metrics,
    audit: input.audit.slice(),
    decision,
    reasons,
    generatedAt: input.generatedAt,
  };
}
