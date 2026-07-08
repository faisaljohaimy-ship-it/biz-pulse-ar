// End-to-end mesh pipeline orchestrator.
// boot -> join -> heartbeat -> capability sync -> route -> lease -> execute -> replicate -> verify -> audit.

import type {
  AgentDescriptor,
  CapabilityMap,
  ConsensusProposal,
  ConsensusResult,
  EvidenceRef,
  Lease,
  MeshHealthReport,
  MeshNode,
  MeshReport,
  MembershipView,
  Mission,
  PartitionReport,
  ReplicationEntry,
  RouteDecision,
} from "./types";
import {
  createNode,
  createRegistry,
  addNode,
  updateNode,
  applyHeartbeat,
  activeNodes,
} from "./node-registry.server";
import { createAgentRegistry, registerAgent } from "./agent-registry.server";
import { buildCapabilityMap } from "./capability-map.server";
import { classifyHeartbeat, applyDelta } from "./heartbeat.server";
import { computeMembership, membershipQuorumMet } from "./membership.server";
import { detectPartition, partitionSafeForExecution } from "./partition-detection.server";
import { routeMissionBatch } from "./mesh-task-routing.server";
import { acquireLease, createMemoryLeaseStore } from "./lease.server";
import { planReplication } from "./replication.server";
import { tallyConsensus } from "./consensus.server";
import { computeHealth } from "./mesh-health.server";
import { planRecovery } from "./mesh-recovery.server";
import { createAuditLog } from "./audit.server";
import { computeMetrics } from "./metrics.server";
import { assembleReport } from "./verification.server";

export interface MeshNodeSpec {
  readonly id: string;
  readonly address: string;
  readonly zone: string;
  readonly heartbeat: { at: string; load: number; rttMs?: number | null };
  readonly healthSignals: { lastHeartbeatAgeMs: number; load: number; errorRate: number };
  readonly evidence?: ReadonlyArray<EvidenceRef>;
}

export interface AgentSpec {
  readonly agentId: string;
  readonly nodeId: string;
  readonly capabilities: ReadonlyArray<string>;
  readonly version: string;
  readonly status?: AgentDescriptor["status"];
  readonly registeredAt: string;
}

export interface ReplicationSpec {
  readonly missionId: string;
  readonly replicationFactor: number;
  readonly version: number;
  readonly updatedAt: string;
}

export interface MeshPipelineInput {
  readonly clusterId: string;
  readonly quorum: number;
  readonly term: number;
  readonly leaderId?: string | null;
  readonly nodes: ReadonlyArray<MeshNodeSpec>;
  readonly agents: ReadonlyArray<AgentSpec>;
  readonly missions: ReadonlyArray<Mission>;
  readonly leaseTtlMs: number;
  readonly reachableNodeIds: ReadonlyArray<string>;
  readonly unreachableNodeIds: ReadonlyArray<string>;
  readonly replications?: ReadonlyArray<ReplicationSpec>;
  readonly consensusProposals?: ReadonlyArray<{
    proposal: ConsensusProposal;
    quorum: number;
    votes: Record<string, "accept" | "reject">;
  }>;
  readonly failedNodeIds?: ReadonlyArray<string>;
  readonly heartbeatThresholds: { suspectMs: number; unreachableMs: number };
  readonly now: string;
  readonly evidence?: ReadonlyArray<EvidenceRef>;
}

export interface MeshPipelineOutput {
  readonly report: MeshReport;
  readonly membership: MembershipView;
  readonly capabilityMap: CapabilityMap;
  readonly routing: ReadonlyArray<RouteDecision>;
  readonly leases: ReadonlyArray<Lease>;
  readonly replications: ReadonlyArray<ReplicationEntry>;
  readonly consensus: ReadonlyArray<ConsensusResult>;
  readonly partition: PartitionReport;
  readonly health: ReadonlyArray<MeshHealthReport>;
}

export function runAgentMeshPipeline(input: MeshPipelineInput): MeshPipelineOutput {
  const audit = createAuditLog();
  const evidence = input.evidence ?? [];

  // 1. boot + join nodes
  let nodeReg = createRegistry();
  for (const spec of input.nodes) {
    let node: MeshNode = createNode({
      id: spec.id,
      address: spec.address,
      zone: spec.zone,
      joinedAt: input.now,
      evidence: spec.evidence,
    });
    node = applyHeartbeat(node, {
      nodeId: spec.id,
      at: spec.heartbeat.at,
      load: spec.heartbeat.load,
      rttMs: spec.heartbeat.rttMs ?? null,
    });
    nodeReg = addNode(nodeReg, node);
    audit.append({
      at: input.now,
      stage: "node.join",
      status: "pass",
      detail: `node=${node.id} zone=${node.zone}`,
      evidence: node.evidence,
    });
  }

  // 2. heartbeat classification
  for (const node of nodeReg.nodes) {
    const delta = classifyHeartbeat(node, input.now, input.heartbeatThresholds);
    const updated = applyDelta(node, delta);
    if (updated !== node) nodeReg = updateNode(nodeReg, updated);
  }

  // 3. agent + capability sync
  let agentReg = createAgentRegistry();
  for (const spec of input.agents) {
    agentReg = registerAgent(agentReg, {
      agentId: spec.agentId,
      nodeId: spec.nodeId,
      capabilities: spec.capabilities,
      version: spec.version,
      status: spec.status ?? "available",
      registeredAt: spec.registeredAt,
    });
  }
  const capabilityMap = buildCapabilityMap(agentReg.agents);
  audit.append({
    at: input.now,
    stage: "capability.sync",
    status: "pass",
    detail: `agents=${agentReg.agents.length} bindings=${capabilityMap.entries.length}`,
    evidence,
  });

  // 4. membership + partition detection
  const membership = computeMembership({
    clusterId: input.clusterId,
    nodes: nodeReg.nodes,
    leaderId: input.leaderId ?? null,
    term: input.term,
    quorum: input.quorum,
    generatedAt: input.now,
  });
  const partition = detectPartition({
    reachable: input.reachableNodeIds,
    unreachable: input.unreachableNodeIds,
    quorum: input.quorum,
    detectedAt: input.now,
    evidence,
  });
  audit.append({
    at: input.now,
    stage: "membership",
    status: membershipQuorumMet(membership) ? "pass" : "unknown",
    detail: `members=${membership.members.length} quorum=${membership.quorum}`,
    evidence,
  });
  audit.append({
    at: input.now,
    stage: "partition",
    status:
      partition.state === "healthy"
        ? "pass"
        : partition.state === "partitioned"
          ? "fail"
          : "unknown",
    detail: `state=${partition.state} reachable=${partition.reachable.length}`,
    evidence,
  });

  // 5. mission routing
  const routing = routeMissionBatch({
    missions: input.missions,
    capabilityMap,
    nodes: nodeReg.nodes,
    agents: agentReg.agents,
    membershipQuorumMet: membershipQuorumMet(membership),
    partitionSafe: partitionSafeForExecution(partition),
  });
  audit.append({
    at: input.now,
    stage: "route",
    status: routing.every((d) => d.nodeId !== null || d.reason !== "duplicate_mission_rejected")
      ? "pass"
      : "unknown",
    detail: `decisions=${routing.length}`,
    evidence,
  });

  // 6. lease acquisition for routed missions
  const leaseStore = createMemoryLeaseStore();
  const leases: Lease[] = [];
  for (const decision of routing) {
    if (!decision.nodeId || !decision.agentId) continue;
    const { acquired, lease } = acquireLease(leaseStore, {
      missionId: decision.missionId,
      holderNodeId: decision.nodeId,
      holderAgentId: decision.agentId,
      ttlMs: input.leaseTtlMs,
      now: input.now,
    });
    if (acquired && lease) leases.push(lease);
  }
  audit.append({
    at: input.now,
    stage: "lease",
    status: "pass",
    detail: `leases=${leases.length}`,
    evidence,
  });

  // 7. replication
  const replications: ReplicationEntry[] = [];
  for (const rep of input.replications ?? []) {
    try {
      const entry = planReplication({
        missionId: rep.missionId,
        nodes: activeNodes(nodeReg),
        replicationFactor: rep.replicationFactor,
        version: rep.version,
        updatedAt: rep.updatedAt,
      });
      replications.push(entry);
    } catch {
      audit.append({
        at: input.now,
        stage: "replicate",
        status: "unknown",
        detail: `no_active_nodes:${rep.missionId}`,
        evidence,
      });
    }
  }

  // 8. consensus
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

  // 9. recovery (optional)
  if (input.failedNodeIds && input.failedNodeIds.length > 0) {
    const missionCapabilities: Record<string, string> = {};
    for (const m of input.missions) missionCapabilities[m.id] = m.capability;
    const plans = planRecovery({
      failedNodeIds: input.failedNodeIds,
      leases,
      nodes: nodeReg.nodes,
      agents: agentReg.agents,
      capabilityMap,
      missionCapabilities,
      decidedAt: input.now,
      evidence,
    });
    audit.append({
      at: input.now,
      stage: "recovery",
      status: plans.every((p) => p.reassignToNodeId !== null) ? "pass" : "unknown",
      detail: `plans=${plans.length}`,
      evidence,
    });
  }

  // 10. health + metrics + report
  const health: MeshHealthReport[] = input.nodes.map((spec) =>
    computeHealth({
      nodeId: spec.id,
      signals: spec.healthSignals,
      checkedAt: input.now,
      evidence,
    }),
  );
  const metrics = computeMetrics({
    nodes: nodeReg.nodes,
    agents: agentReg.agents,
    routing,
    leases,
    replications,
    consensus,
  });

  const report = assembleReport({
    membership,
    capabilityMap,
    routing,
    leases,
    replications,
    consensus,
    partition,
    health,
    metrics,
    audit: audit.entries(),
    generatedAt: input.now,
  });

  return {
    report,
    membership,
    capabilityMap,
    routing,
    leases,
    replications,
    consensus,
    partition,
    health,
  };
}
