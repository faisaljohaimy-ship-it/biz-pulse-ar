// Phase 10.3 — Distributed Agent Mesh: shared types.
// Server-only. Worker compatible. Strictly additive.

export type TriState = "pass" | "fail" | "unknown";

export type NodeRole = "leader" | "follower" | "candidate" | "observer" | "unknown";

export type NodeStatus =
  | "joining"
  | "active"
  | "draining"
  | "suspect"
  | "unreachable"
  | "left"
  | "unknown";

export type PeerReachability = "reachable" | "unreachable" | "unknown";

export type MessageKind = "direct" | "broadcast" | "gossip" | "consensus" | "control" | "unknown";

export type LoadStrategy =
  | "round_robin"
  | "least_loaded"
  | "hash"
  | "capability_affinity"
  | "unknown";

export type ConsensusOutcome = "committed" | "rejected" | "pending" | "unknown";

export type MeshDecision = "GO" | "NO_GO" | "GO_WITH_KNOWN_LIMITATIONS" | "UNKNOWN";

export interface EvidenceRef {
  readonly source: string;
  readonly ref: string;
  readonly at: string; // ISO-8601
}

export interface NodeIdentity {
  readonly id: string;
  readonly publicKeyFingerprint: string; // caller-supplied; verification only
  readonly issuedAt: string;
}

export interface MeshNode {
  readonly id: string;
  readonly address: string;
  readonly zone: string;
  readonly identity: NodeIdentity;
  readonly capabilities: ReadonlyArray<string>;
  readonly role: NodeRole;
  readonly status: NodeStatus;
  readonly load: number; // 0..1
  readonly joinedAt: string;
  readonly lastHeartbeatAt: string | null;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface Peer {
  readonly nodeId: string;
  readonly reachability: PeerReachability;
  readonly rttMs: number | null;
  readonly lastSeenAt: string | null;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface MeshCluster {
  readonly id: string;
  readonly nodes: ReadonlyArray<MeshNode>;
  readonly peers: ReadonlyArray<Peer>;
  readonly leaderId: string | null;
  readonly term: number;
  readonly quorum: number;
  readonly createdAt: string;
}

export interface CapabilityDescriptor {
  readonly capability: string;
  readonly nodeId: string;
  readonly version: string;
  readonly weight: number; // >0
}

export interface CapabilityRegistry {
  readonly entries: ReadonlyArray<CapabilityDescriptor>;
}

export interface RouteRequest {
  readonly messageId: string;
  readonly capability: string;
  readonly key?: string;
  readonly weight: number;
  readonly submittedAt: string;
}

export interface RouteDecision {
  readonly messageId: string;
  readonly nodeId: string | null;
  readonly capability: string;
  readonly strategy: LoadStrategy;
  readonly reason: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface LeaderElection {
  readonly clusterId: string;
  readonly leaderId: string | null;
  readonly term: number;
  readonly quorum: number;
  readonly participants: ReadonlyArray<string>;
  readonly tally: Readonly<Record<string, number>>;
  readonly decidedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ConsensusProposal {
  readonly id: string;
  readonly term: number;
  readonly proposerNodeId: string;
  readonly value: string; // opaque payload identifier
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

export interface MeshMessage {
  readonly id: string;
  readonly kind: MessageKind;
  readonly fromNodeId: string;
  readonly toNodeId: string | null; // null for broadcast
  readonly capability: string | null;
  readonly payloadRef: string; // opaque reference (no raw payload here)
  readonly issuedAt: string;
  readonly ttl: number;
  readonly hops: number;
  readonly signature: string;
}

export interface BroadcastPlan {
  readonly messageId: string;
  readonly targets: ReadonlyArray<string>;
  readonly fanout: number;
  readonly reason: string;
}

export interface ReplicationEntry {
  readonly key: string;
  readonly version: number;
  readonly primaryNodeId: string;
  readonly replicaNodeIds: ReadonlyArray<string>;
  readonly updatedAt: string;
}

export interface DistributedLock {
  readonly key: string;
  readonly holderNodeId: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
  readonly fencingToken: number;
}

export interface CacheEntry {
  readonly key: string;
  readonly valueRef: string;
  readonly ownerNodeId: string;
  readonly expiresAt: string;
  readonly version: number;
}

export interface Checkpoint {
  readonly id: string;
  readonly clusterId: string;
  readonly term: number;
  readonly nodeIds: ReadonlyArray<string>;
  readonly capabilities: ReadonlyArray<CapabilityDescriptor>;
  readonly capturedAt: string;
}

export interface Snapshot {
  readonly id: string;
  readonly checkpointId: string;
  readonly digest: string; // caller-supplied hash
  readonly sizeBytes: number;
  readonly capturedAt: string;
}

export interface RecoveryPlan {
  readonly clusterId: string;
  readonly restoreFromCheckpointId: string;
  readonly rejoinNodeIds: ReadonlyArray<string>;
  readonly requeuedMessageIds: ReadonlyArray<string>;
  readonly decidedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface HealthReport {
  readonly nodeId: string;
  readonly score: number; // 0..1
  readonly state: TriState;
  readonly detail: string;
  readonly checkedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface PresenceReport {
  readonly nodeId: string;
  readonly online: boolean;
  readonly lastSeenAt: string | null;
  readonly rttMs: number | null;
}

export interface MeshMetrics {
  readonly nodes: number;
  readonly active: number;
  readonly suspect: number;
  readonly unreachable: number;
  readonly leaderChanges: number;
  readonly messagesRouted: number;
  readonly broadcasts: number;
  readonly replications: number;
  readonly consensusCommits: number;
  readonly avgHeartbeatLatencyMs: number | null;
  readonly avgReplicationLagMs: number | null;
}

export interface MeshTelemetry {
  readonly emittedAt: string;
  readonly metrics: MeshMetrics;
  readonly health: ReadonlyArray<HealthReport>;
  readonly presence: ReadonlyArray<PresenceReport>;
}

export interface MeshAuditEntry {
  readonly id: string;
  readonly at: string;
  readonly stage: string;
  readonly status: TriState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface MeshPolicy {
  readonly requireMutualAuth: boolean;
  readonly maxTtl: number;
  readonly maxHops: number;
  readonly allowedCapabilities: ReadonlyArray<string>; // empty = allow all
  readonly deniedCapabilities: ReadonlyArray<string>;
  readonly zeroTrust: boolean;
}

export interface MeshReport {
  readonly cluster: MeshCluster;
  readonly leader: LeaderElection;
  readonly registry: CapabilityRegistry;
  readonly routing: ReadonlyArray<RouteDecision>;
  readonly consensus: ReadonlyArray<ConsensusResult>;
  readonly broadcasts: ReadonlyArray<BroadcastPlan>;
  readonly replications: ReadonlyArray<ReplicationEntry>;
  readonly health: ReadonlyArray<HealthReport>;
  readonly presence: ReadonlyArray<PresenceReport>;
  readonly metrics: MeshMetrics;
  readonly audit: ReadonlyArray<MeshAuditEntry>;
  readonly decision: MeshDecision;
  readonly reasons: ReadonlyArray<string>;
  readonly generatedAt: string;
}
