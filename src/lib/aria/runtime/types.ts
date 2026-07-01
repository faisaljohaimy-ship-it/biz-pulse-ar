/**
 * Phase 9.2 — Autonomous Multi-Agent Runtime: types.
 *
 * Strictly additive. No changes to Brain, Memory, Context, Marketplace,
 * Planning, Cognition, Execution, OS, Production, or Integration.
 *
 * The runtime coordinates agents. It does NOT invent agents or
 * capabilities. Capabilities MUST be resolved from Marketplace; planning,
 * execution, memory, cognition, and OS remain owners of their domains.
 * Unknown state stays UNKNOWN.
 */

export type AgentLifecycleState =
  | "Create"
  | "Idle"
  | "Registered"
  | "Waiting"
  | "Ready"
  | "Scheduled"
  | "Running"
  | "Paused"
  | "Blocked"
  | "WaitingApproval"
  | "Retrying"
  | "Recovering"
  | "Completed"
  | "Cancelled"
  | "Failed"
  | "RolledBack"
  | "Archived";

export type SchedulingPolicy =
  | "sequential"
  | "parallel"
  | "priority"
  | "dependency"
  | "dag"
  | "recursive"
  | "round_robin"
  | "fair_queue"
  | "weighted_queue"
  | "budget_aware"
  | "deadline_aware";

export type RuntimeSeverity = "info" | "notice" | "warn" | "error" | "critical";

export interface AgentIdentity {
  agent_id: string;
  display_name: string;
  org_id: string | null;
  parent_agent_id: string | null;
  created_at: string;
  issued_by: string;
  fingerprint: string;
}

export interface CapabilityScope {
  capability_id: string;
  source: "marketplace";
  scopes: readonly string[];
}

export interface PermissionScope {
  scope: string;
  granted_by: string;
  expires_at: string | null;
}

export interface AgentRuntimeBudget {
  max_tokens: number | null;
  max_ms: number | null;
  max_memory_mb: number | null;
  max_retries: number;
  max_children: number;
}

export interface AgentRuntimeSpec {
  identity: AgentIdentity;
  capabilities: readonly CapabilityScope[];
  permissions: readonly PermissionScope[];
  budget: AgentRuntimeBudget;
  priority: number;
  weight: number;
  deadline_at: string | null;
  depends_on: readonly string[];
  scheduling: SchedulingPolicy;
  metadata: Readonly<Record<string, unknown>>;
}

export interface BudgetUsage {
  tokens_used: number;
  ms_used: number;
  memory_mb_peak: number;
  retries_used: number;
  children_spawned: number;
}

export interface AgentHealth {
  level: "healthy" | "degraded" | "unhealthy" | "unknown";
  confidence: number; // 0..1, -1 when unknown
  last_heartbeat_at: string | null;
  failures: number;
  timeouts: number;
  notes: readonly string[];
}

export interface AgentRuntimeRecord {
  spec: AgentRuntimeSpec;
  state: AgentLifecycleState;
  usage: BudgetUsage;
  health: AgentHealth;
  created_at: string;
  updated_at: string;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  last_error: string | null;
}

export interface LifecycleTransition {
  agent_id: string;
  from: AgentLifecycleState;
  to: AgentLifecycleState;
  reason: string;
  at: string;
  actor: string;
}

export interface RuntimeMessage {
  id: string;
  from_agent_id: string;
  to_agent_id: string | "broadcast";
  topic: string;
  payload: Readonly<Record<string, unknown>>;
  sent_at: string;
  correlation_id: string | null;
}

export interface SharedArtifact {
  id: string;
  owner_agent_id: string;
  kind: string;
  ref: string;
  created_at: string;
  metadata: Readonly<Record<string, unknown>>;
}

export interface Checkpoint {
  id: string;
  agent_id: string;
  label: string;
  state: AgentLifecycleState;
  usage_snapshot: BudgetUsage;
  taken_at: string;
  payload_ref: string | null;
}

export interface Snapshot {
  id: string;
  agent_id: string;
  taken_at: string;
  record: AgentRuntimeRecord;
}

export interface RollbackEntry {
  id: string;
  agent_id: string;
  reason: string;
  restored_checkpoint_id: string | null;
  restored_snapshot_id: string | null;
  at: string;
}

export interface ConsensusProposal {
  id: string;
  topic: string;
  proposer_agent_id: string;
  options: readonly string[];
  quorum: number;
  created_at: string;
}

export interface ConsensusVote {
  proposal_id: string;
  voter_agent_id: string;
  option: string;
  weight: number;
  at: string;
}

export interface ConsensusResult {
  proposal_id: string;
  status: "pending" | "reached" | "failed" | "expired";
  chosen_option: string | null;
  tallies: Readonly<Record<string, number>>;
  finalized_at: string | null;
}

export interface LeaderElection {
  group: string;
  leader_agent_id: string | null;
  epoch: number;
  elected_at: string | null;
  candidates: readonly string[];
}

export interface NegotiationOffer {
  from_agent_id: string;
  to_agent_id: string;
  capability_id: string;
  terms: Readonly<Record<string, unknown>>;
  status: "offered" | "accepted" | "rejected" | "counter" | "expired";
  at: string;
}

export interface RuntimeMetric {
  name: string;
  value: number;
  taken_at: string;
  tags: Readonly<Record<string, string>>;
}

export interface RuntimeTelemetryEvent {
  ts: string;
  level: RuntimeSeverity;
  source: string;
  agent_id: string | null;
  message: string;
  data: Readonly<Record<string, unknown>>;
}

export interface RuntimeAuditEntry {
  ts: string;
  actor: string;
  action: string;
  subject_type: "agent" | "message" | "checkpoint" | "snapshot" | "rollback" | "consensus" | "election" | "negotiation" | "policy" | "runtime";
  subject_id: string;
  metadata: Readonly<Record<string, unknown>>;
}

export interface PolicyRule {
  id: string;
  description: string;
  applies_to: "lifecycle" | "scheduling" | "capability" | "permission" | "budget" | "collaboration";
  effect: "allow" | "deny" | "require_approval";
  matcher: Readonly<Record<string, unknown>>;
}

export interface PolicyDecision {
  rule_id: string | null;
  decision: "allow" | "deny" | "require_approval" | "no_rule";
  reason: string;
}

export interface VerificationIssue {
  code:
    | "cyclic_dependency"
    | "broken_binding"
    | "mutable_global"
    | "deadlock_hazard"
    | "orphan_worker"
    | "duplicate_id"
    | "race_hazard"
    | "invalid_transition";
  severity: RuntimeSeverity;
  detail: string;
  subject_id: string | null;
}

export interface VerificationReport {
  taken_at: string;
  issues: readonly VerificationIssue[];
  ok: boolean;
}

export interface BindingStatus {
  name: "planner" | "execution" | "marketplace" | "memory" | "cognition" | "os";
  bound: boolean;
  bound_at: string | null;
}

export interface RuntimeHealthReport {
  taken_at: string;
  agents_total: number;
  agents_running: number;
  agents_failed: number;
  agents_degraded: number;
  workers_online: number;
  bindings: readonly BindingStatus[];
  ok: boolean;
}

export interface WorkerDescriptor {
  worker_id: string;
  agent_id: string | null;
  started_at: string;
  last_seen_at: string;
  status: "idle" | "busy" | "draining" | "terminated";
}

export interface SandboxContext {
  agent_id: string;
  sandbox_id: string;
  isolation_scope: string;
  read_scopes: readonly string[];
  write_scopes: readonly string[];
  created_at: string;
}
