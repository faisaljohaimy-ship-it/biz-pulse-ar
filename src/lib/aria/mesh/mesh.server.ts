// End-to-end mesh pipeline orchestrator.
// join nodes -> discover -> register capabilities -> heartbeat classify ->
// elect leader -> schedule/route -> broadcast -> replicate -> consensus ->
// health/presence -> checkpoint/snapshot -> optional recovery -> audit -> verify.

import type {
  BroadcastPlan,
  CapabilityDescriptor,
  CapabilityRegistry,
  Checkpoint,
  ConsensusProposal,
  ConsensusResult,
  EvidenceRef,
  HealthReport,
  LeaderElection,
  LoadStrategy,
  MeshCluster,
  MeshNode,
  MeshPolicy,
  MeshReport,
  NodeIdentity,
  PresenceReport,
  ReplicationEntry,
  RouteDecision,
  RouteRequest,
  Snapshot,
} from "./types";
import { createNode, applyHeartbeat, markStatus } from "./node.server";
import { addNode, createCluster, setLeader, updateNode, upsertPeer } from "./cluster.server";
import { runDiscovery } from "./discovery.server";
import { createPeer } from "./peer.server";
import { createRegistry, register } from "./registry.server";
import { applyClassification, classifyNode } from "./heartbeat.server";
import { computeHealth } from "./health.server";
import { observePresence } from "./presence.server";
import { electLeader } from "./leader-election.server";
import { scheduleBatch } from "./scheduler.server";
import { planBroadcast } from "./broadcast.server";
import { planReplication } from "./replication.server";
import { tallyConsensus } from "./consensus.server";
import { captureCheckpoint } from "./checkpoint.server";
import { captureSnapshot } from "./snapshot.server";
import { planRecovery } from "./recovery.server";
import { createAuditLog } from "./audit.server";
import { computeMetrics } from "./metrics.server";
import { assembleReport } from "./verification.server";

export interface MeshNodeSpec {
  readonly id: string;
  readonly address: string;
  readonly zone: string;
  readonly identity: NodeIdentity;
  readonly capabilities: ReadonlyArray<{ capability: string; version: string; weight?: number }>;
  readonly heartbeat: { at: string; load: number; rttMs?: number | null };
  readonly healthSignals: {
    lastHeartbeatAgeMs: number;
    load: number;
    errorRate: number;
  };
  readonly evidence?: ReadonlyArray<EvidenceRef>;
}

export interface MeshPipelineInput {
  readonly clusterId: string;
  readonly quorum: number;
  readonly term: number;
  readonly nodes: ReadonlyArray<MeshNodeSpec>;
  readonly discoverySeeds?: ReadonlyArray<string>;
  readonly votes: Record<string, string>;
  readonly requests: ReadonlyArray<RouteRequest>;
  readonly strategy: LoadStrategy;
  readonly broadcastFrom?: string;
  readonly broadcastMessageId?: string;
  readonly replicationKeys?: ReadonlyArray<{
    key: string;
    replicationFactor: number;
    version: number;
    updatedAt: string;
  }>;
  readonly consensusProposals?: ReadonlyArray<{
    proposal: ConsensusProposal;
    quorum: number;
    votes: Record<string, "accept" | "reject">;
  }>;
  readonly policy: MeshPolicy;
  readonly heartbeatThresholds: { suspectMs: number; unreachableMs: number };
  readonly captureCheckpointId?: string;
  readonly captureSnapshotId?: string;
  readonly snapshotDigest?: string;
  readonly snapshotSizeBytes?: number;
  readonly recoveryInFlightMessageIds?: ReadonlyArray<string>;
  readonly now: string;
  readonly evidence?: ReadonlyArray<EvidenceRef>;
}

export interface MeshPipelineOutput {
  readonly report: MeshReport;
  readonly cluster: MeshCluster;
  readonly leader: LeaderElection;
  readonly registry: CapabilityRegistry;
  readonly routing: ReadonlyArray<RouteDecision>;
  readonly broadcast: BroadcastPlan | null;
  readonly replications: ReadonlyArray<ReplicationEntry>;
  readonly consensus: ReadonlyArray<ConsensusResult>;
  readonly health: ReadonlyArray<HealthReport>;
  readonly presence: ReadonlyArray<PresenceReport>;
  readonly checkpoint: Checkpoint | null;
  readonly snapshot: Snapshot | null;
  readonly policy: MeshPolicy;
}

export function runMeshPipeline(input: MeshPipelineInput): MeshPipelineOutput {
  const audit = createAuditLog();
  const evidence = input.evidence ?? [];

  // 1. cluster + node join
  let cluster: MeshCluster = createCluster({
    id: input.clusterId,
    quorum: input.quorum,
    createdAt: input.now,
  });

  for (const spec of input.nodes) {
    let node: MeshNode = createNode({
      id: spec.id,
      address: spec.address,
      zone: spec.zone,
      identity: spec.identity,
      capabilities: spec.capabilities.map((c) => c.capability),
      joinedAt: input.now,
      evidence: spec.evidence,
    });
    node = applyHeartbeat(node, {
      nodeId: spec.id,
      at: spec.heartbeat.at,
      load: spec.heartbeat.load,
      rttMs: spec.heartbeat.rttMs ?? null,
    });
    cluster = addNode(cluster, node);
    audit.append({
      at: input.now,
      stage: "node.join",
      status: "pass",
      detail: `node=${node.id} zone=${node.zone}`,
      evidence: node.evidence,
    });
  }

  // 2. discovery
  const discovery = runDiscovery({
    seeds: input.discoverySeeds ?? [],
    announced: cluster.nodes,
    at: input.now,
    evidence,
  });
  for (const peer of discovery.peers) cluster = upsertPeer(cluster, peer);
  for (const seed of input.discoverySeeds ?? []) {
    if (cluster.peers.some((p) => p.nodeId === seed)) continue;
    cluster = upsertPeer(cluster, createPeer({ nodeId: seed, evidence }));
  }
  audit.append({
    at: input.now,
    stage: "discovery",
    status: "pass",
    detail: `peers=${cluster.peers.length}`,
    evidence,
  });

  // 3. capability registry
  let registry = createRegistry();
  for (const spec of input.nodes) {
    for (const cap of spec.capabilities) {
      const descriptor: CapabilityDescriptor = {
        capability: cap.capability,
        nodeId: spec.id,
        version: cap.version,
        weight: cap.weight ?? 1,
      };
      registry = register(registry, descriptor);
    }
  }
  audit.append({
    at: input.now,
    stage: "registry",
    status: "pass",
    detail: `capabilities=${registry.entries.length}`,
    evidence,
  });

  // 4. heartbeat classification
  for (const node of cluster.nodes) {
    const delta = classifyNode(node, input.now, input.heartbeatThresholds);
    const updated = applyClassification(node, delta);
    if (updated !== node) cluster = updateNode(cluster, updated);
  }

  // 5. leader election
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
    cluster = setLeader(cluster, leader.leaderId, leader.term);
    // mark leader role explicitly
    const node = cluster.nodes.find((n) => n.id === leader.leaderId);
    if (node) cluster = updateNode(cluster, { ...node, role: "leader" });
    audit.append({
      at: input.now,
      stage: "leader.elect",
      status: "pass",
      detail: `leader=${leader.leaderId} term=${leader.term}`,
      evidence,
    });
  } else {
    audit.append({
      at: input.now,
      stage: "leader.elect",
      status: "unknown",
      detail: "no_quorum_or_tie",
      evidence,
    });
  }

  // 6. scheduling + routing
  const routing = scheduleBatch({
    requests: input.requests,
    registry,
    nodes: cluster.nodes,
    strategy: input.strategy,
  });
  audit.append({
    at: input.now,
    stage: "route",
    status: routing.decisions.every((d) => d.nodeId !== null) ? "pass" : "unknown",
    detail: `decisions=${routing.decisions.length}`,
    evidence,
  });

  // 7. broadcast
  let broadcast: BroadcastPlan | null = null;
  if (input.broadcastFrom && input.broadcastMessageId) {
    broadcast = planBroadcast({
      messageId: input.broadcastMessageId,
      fromNodeId: input.broadcastFrom,
      nodes: cluster.nodes,
    });
    audit.append({
      at: input.now,
      stage: "broadcast",
      status: broadcast.targets.length > 0 ? "pass" : "unknown",
      detail: `targets=${broadcast.targets.length}`,
      evidence,
    });
  }

  // 8. replication
  const replications: ReplicationEntry[] = [];
  for (const spec of input.replicationKeys ?? []) {
    try {
      const entry = planReplication({
        key: spec.key,
        nodes: cluster.nodes,
        replicationFactor: spec.replicationFactor,
        version: spec.version,
        updatedAt: spec.updatedAt,
      });
      replications.push(entry);
    } catch {
      audit.append({
        at: input.now,
        stage: "replicate",
        status: "unknown",
        detail: `no_active_nodes_for:${spec.key}`,
        evidence,
      });
    }
  }
  if (replications.length > 0) {
    audit.append({
      at: input.now,
      stage: "replicate",
      status: "pass",
      detail: `replications=${replications.length}`,
      evidence,
    });
  }

  // 9. consensus
  const consensus: ConsensusResult[] = [];
  for (const p of input.consensusProposals ?? []) {
    const result = tallyConsensus({
      proposalId: p.proposal.id,
      term: p.proposal.term,
      proposerNodeId: p.proposal.proposerNodeId,
      value: p.proposal.value,
      submittedAt: p.proposal.submittedAt,
      quorum: p.quorum,
      votes: p.votes,
      evidence,
    });
    consensus.push(result);
    audit.append({
      at: input.now,
      stage: "consensus",
      status:
        result.outcome === "committed"
          ? "pass"
          : result.outcome === "rejected"
            ? "fail"
            : "unknown",
      detail: `proposal=${p.proposal.id} outcome=${result.outcome}`,
      evidence,
    });
  }

  // 10. health + presence
  const health: HealthReport[] = input.nodes.map((spec) =>
    computeHealth({
      nodeId: spec.id,
      signals: spec.healthSignals,
      checkedAt: input.now,
      evidence,
    }),
  );
  const presence: PresenceReport[] = cluster.nodes.map((n) =>
    observePresence({
      nodeId: n.id,
      lastSeenAt: n.lastHeartbeatAt,
      rttMs: cluster.peers.find((p) => p.nodeId === n.id)?.rttMs ?? null,
      now: input.now,
    }),
  );

  // sanitize orphans by marking them draining then leaving them for verifier
  for (const n of cluster.nodes) {
    if (n.status === "unknown") {
      const forced = markStatus(n, "suspect");
      cluster = updateNode(cluster, forced);
    }
  }

  // 11. checkpoint + snapshot
  let checkpoint: Checkpoint | null = null;
  let snapshot: Snapshot | null = null;
  if (input.captureCheckpointId) {
    checkpoint = captureCheckpoint({
      id: input.captureCheckpointId,
      cluster,
      registry,
      capturedAt: input.now,
    });
    audit.append({
      at: input.now,
      stage: "checkpoint",
      status: "pass",
      detail: `checkpoint=${checkpoint.id}`,
      evidence,
    });
    if (input.captureSnapshotId && input.snapshotDigest !== undefined) {
      snapshot = captureSnapshot({
        id: input.captureSnapshotId,
        checkpoint,
        digest: input.snapshotDigest,
        sizeBytes: input.snapshotSizeBytes ?? 0,
        capturedAt: input.now,
      });
      audit.append({
        at: input.now,
        stage: "snapshot",
        status: "pass",
        detail: `snapshot=${snapshot.id}`,
        evidence,
      });
    }
  }

  // 12. recovery (only if inflight ids supplied and checkpoint present)
  if (
    checkpoint &&
    input.recoveryInFlightMessageIds &&
    input.recoveryInFlightMessageIds.length > 0
  ) {
    const plan = planRecovery({
      clusterId: cluster.id,
      checkpoint,
      currentNodeIds: cluster.nodes.map((n) => n.id),
      inFlightMessageIds: input.recoveryInFlightMessageIds,
      decidedAt: input.now,
      evidence,
    });
    audit.append({
      at: input.now,
      stage: "recovery",
      status: "pass",
      detail: `rejoin=${plan.rejoinNodeIds.length} requeued=${plan.requeuedMessageIds.length}`,
      evidence,
    });
  }

  // 13. metrics + report
  const metrics = computeMetrics({
    cluster,
    routing: routing.decisions,
    broadcasts: broadcast ? [broadcast] : [],
    replications,
    consensus,
    leaderChanges: leader.leaderId ? 1 : 0,
  });

  const report = assembleReport({
    cluster,
    leader,
    registry,
    routing: routing.decisions,
    consensus,
    broadcasts: broadcast ? [broadcast] : [],
    replications,
    health,
    presence,
    metrics,
    audit: audit.entries(),
    generatedAt: input.now,
  });

  return {
    report,
    cluster,
    leader,
    registry,
    routing: routing.decisions,
    broadcast,
    replications,
    consensus,
    health,
    presence,
    checkpoint,
    snapshot,
    policy: input.policy,
  };
}
