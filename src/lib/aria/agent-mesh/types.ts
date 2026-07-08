// Phase 10.3 — Agent Mesh: shared types. Server-only. Additive.

export type TriState = "pass" | "fail" | "unknown";

export type NodeStatus =
  | "joining"
  | "active"
  | "draining"
  | "suspect"
  | "unreachable"
  | "left"
  | "unknown";

export type AgentStatus = "available" | "busy" | "offline" | "unknown";

export type MissionStatus =
  | "queued"
  | "routed"
  | "leased"
  | "executing"
  | "replicated"
  | "completed"
  | "failed"
  | "recovering"
  | "unknown";

export type ConsensusOutcome = "committed" | "rejected" | "pending" | "unknown";

export type PartitionState = "healthy" | "at_risk" | "partitioned" | "unknown";

export type MeshDecision = "GO" | "NO_GO" | "GO_WITH_KNOWN_LIMITATIONS" | "UNKNOWN";

export interface EvidenceRef {
  readonly source: string;
  readonly ref: string;
  readonly at: string;
}

export interface MeshNode {
  readonly id: string;
  readonly address: string;
  readonly zone: string;
  readonly status: NodeStatus;
  readonly load: number; // 0..1
  readonly joinedAt: string;
  readonly lastHeartbeatAt: string | null;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface AgentDescriptor {
  readonly agentId: string;
  readonly nodeId: string;
  readonly capabilities: ReadonlyArray<string>;
  readonly version: string;
  readonly status: AgentStatus;
  readonly registeredAt: string;
}

export interface CapabilityBinding {
  readonly capability: string;
  readonly agentId: string;
  readonly nodeId: string;
  readonly weight: number;
}

export interface CapabilityMap {
  readonly entries: ReadonlyArray<CapabilityBinding>;
}

export interface Mission {
  readonly id: string;
  readonly capability: string;
  readonly key?: string;
  readonly priority: number;
  readonly submittedAt: string;
}

export interface RouteDecision {
  readonly missionId: string;
  readonly agentId: string | null;
  readonly nodeId: string | null;
  readonly capability: string;
  readonly reason: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface Lease {
  readonly missionId: string;
  readonly holderNodeId: string;
  readonly holderAgentId: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
  readonly fencingToken: number;
}

export interface Lock {
  readonly key: string;
  readonly holderNodeId: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
  readonly fencingToken: number;
}

export interface HeartbeatObservation {
  readonly nodeId: string;
  readonly at: string;
  readonly load: number;
  readonly rttMs: number | null;
}

export interface MembershipView {
  readonly clusterId: string;
  readonly members: ReadonlyArray<string>;
  readonly leaderId: string | null;
  readonly term: number;
  readonly quorum: number;
  readonly generatedAt: string;
}

export interface ConsensusProposal {
  readonly id: string;
  readonly term: number;
  readonly proposerNodeId: string;
  readonly value: string;
  readonly submittedAt: string;
}

export interface ConsensusResult {
  readonly proposalId: string;
  readonly outcome: ConsensusOutcome;
  readonly acceptances: ReadonlyArray<string>;
  readonly rejections: ReadonlyArray<string>;
  readonly quorum: number;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ReplicationEntry {
  readonly missionId: string;
  readonly primaryNodeId: string;
  readonly replicaNodeIds: ReadonlyArray<string>;
  readonly version: number;
  readonly updatedAt: string;
}

export interface PartitionReport {
  readonly state: PartitionState;
  readonly reachable: ReadonlyArray<string>;
  readonly unreachable: ReadonlyArray<string>;
  readonly quorumMet: boolean;
  readonly detectedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface MeshHealthReport {
  readonly nodeId: string;
  readonly score: number; // 0..1
  readonly state: TriState;
  readonly detail: string;
  readonly checkedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RecoveryPlan {
  readonly missionId: string;
  readonly reason: string;
  readonly reassignToNodeId: string | null;
  readonly reassignToAgentId: string | null;
  readonly decidedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface MeshAuditEntry {
  readonly id: string;
  readonly at: string;
  readonly stage: string;
  readonly status: TriState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface MeshMetrics {
  readonly nodes: number;
  readonly active: number;
  readonly suspect: number;
  readonly unreachable: number;
  readonly agents: number;
  readonly missionsRouted: number;
  readonly leasesGranted: number;
  readonly replications: number;
  readonly consensusCommits: number;
  readonly avgHeartbeatLatencyMs: number | null;
}

export interface MeshTelemetry {
  readonly emittedAt: string;
  readonly metrics: MeshMetrics;
  readonly health: ReadonlyArray<MeshHealthReport>;
  readonly partition: PartitionReport | null;
}

export interface MeshReport {
  readonly membership: MembershipView;
  readonly capabilityMap: CapabilityMap;
  readonly routing: ReadonlyArray<RouteDecision>;
  readonly leases: ReadonlyArray<Lease>;
  readonly replications: ReadonlyArray<ReplicationEntry>;
  readonly consensus: ReadonlyArray<ConsensusResult>;
  readonly partition: PartitionReport;
  readonly health: ReadonlyArray<MeshHealthReport>;
  readonly metrics: MeshMetrics;
  readonly audit: ReadonlyArray<MeshAuditEntry>;
  readonly decision: MeshDecision;
  readonly reasons: ReadonlyArray<string>;
  readonly generatedAt: string;
}
