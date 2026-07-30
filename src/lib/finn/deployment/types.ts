// Phase 10.2 — Deployment & Distributed Cluster: shared types.
// Server-only. Worker compatible.

export type TriState = "pass" | "fail" | "unknown";

export type EnvironmentKind = "development" | "staging" | "production" | "unknown";

export type NodeRole = "leader" | "follower" | "candidate" | "unknown";

export type NodeStatus = "registering" | "ready" | "draining" | "unhealthy" | "offline" | "unknown";

export type ReleaseChannel = "canary" | "beta" | "stable" | "rollback" | "unknown";

export type ProbeKind = "health" | "readiness" | "liveness";

export type ProbeState = "healthy" | "unhealthy" | "unknown";

export type LoadStrategy = "round_robin" | "least_loaded" | "hash" | "sticky" | "unknown";

export type DeploymentDecision = "GO" | "NO_GO" | "GO_WITH_KNOWN_LIMITATIONS" | "UNKNOWN";

export interface EvidenceRef {
  readonly source: string;
  readonly ref: string;
  readonly at: string; // ISO-8601
}

export interface EnvironmentSpec {
  readonly kind: EnvironmentKind;
  readonly region: string;
  readonly runtime: "workerd" | "node" | "edge" | "unknown";
  readonly features: ReadonlyArray<string>;
}

export interface EnvironmentReport {
  readonly kind: EnvironmentKind;
  readonly region: string;
  readonly runtime: string;
  readonly checks: ReadonlyArray<{
    readonly id: string;
    readonly state: TriState;
    readonly message: string;
    readonly evidence: ReadonlyArray<EvidenceRef>;
  }>;
  readonly overall: TriState;
}

export interface ClusterNode {
  readonly id: string;
  readonly address: string;
  readonly zone: string;
  readonly role: NodeRole;
  readonly status: NodeStatus;
  readonly capacity: number; // logical job slots
  readonly load: number; // 0..1
  readonly registeredAt: string;
  readonly lastHeartbeatAt: string | null;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface Cluster {
  readonly id: string;
  readonly channel: ReleaseChannel;
  readonly nodes: ReadonlyArray<ClusterNode>;
  readonly leaderId: string | null;
  readonly quorum: number;
  readonly createdAt: string;
}

export interface WorkerSlot {
  readonly id: string;
  readonly nodeId: string;
  readonly busy: boolean;
  readonly startedAt: string;
}

export interface WorkerPool {
  readonly nodeId: string;
  readonly size: number;
  readonly slots: ReadonlyArray<WorkerSlot>;
}

export interface Job {
  readonly id: string;
  readonly kind: string;
  readonly key?: string; // routing/hash key
  readonly weight: number; // >0
  readonly submittedAt: string;
}

export interface RoutingDecision {
  readonly jobId: string;
  readonly nodeId: string | null;
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
  readonly decidedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface DistributedLock {
  readonly key: string;
  readonly holderNodeId: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
  readonly fencingToken: number;
}

export interface FailoverPlan {
  readonly failedNodeId: string;
  readonly promotedNodeId: string | null;
  readonly reassignedJobs: ReadonlyArray<string>;
  readonly decidedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ScalingPlan {
  readonly desiredNodes: number;
  readonly currentNodes: number;
  readonly action: "scale_out" | "scale_in" | "hold" | "unknown";
  readonly reason: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RollbackPlan {
  readonly fromChannel: ReleaseChannel;
  readonly toChannel: ReleaseChannel;
  readonly reason: string;
  readonly steps: ReadonlyArray<string>;
  readonly safe: boolean;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ProbeResult {
  readonly kind: ProbeKind;
  readonly nodeId: string;
  readonly state: ProbeState;
  readonly detail: string;
  readonly checkedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface DeploymentAuditEntry {
  readonly id: string;
  readonly at: string;
  readonly stage: string;
  readonly status: TriState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface DeploymentMetrics {
  readonly nodes: number;
  readonly ready: number;
  readonly unhealthy: number;
  readonly leaderChanges: number;
  readonly jobsRouted: number;
  readonly failovers: number;
}

export interface DeploymentTelemetry {
  readonly emittedAt: string;
  readonly metrics: DeploymentMetrics;
  readonly probes: ReadonlyArray<ProbeResult>;
}

export interface DeploymentReport {
  readonly environment: EnvironmentReport;
  readonly cluster: Cluster;
  readonly leader: LeaderElection;
  readonly probes: ReadonlyArray<ProbeResult>;
  readonly metrics: DeploymentMetrics;
  readonly audit: ReadonlyArray<DeploymentAuditEntry>;
  readonly decision: DeploymentDecision;
  readonly reasons: ReadonlyArray<string>;
  readonly generatedAt: string;
}
