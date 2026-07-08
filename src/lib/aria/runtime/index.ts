/**
 * Phase 9.2 — Autonomous Multi-Agent Runtime (public server surface).
 *
 * Strictly additive. Import only from callers that need runtime
 * coordination. No existing APIs are modified.
 *
 *   import * as Runtime from "@/lib/aria/runtime";
 */

export type {
  AgentLifecycleState,
  SchedulingPolicy,
  RuntimeSeverity,
  AgentIdentity,
  CapabilityScope,
  PermissionScope,
  AgentRuntimeBudget,
  AgentRuntimeSpec,
  AgentRuntimeRecord,
  AgentHealth,
  BudgetUsage,
  LifecycleTransition,
  RuntimeMessage,
  SharedArtifact,
  Checkpoint,
  Snapshot,
  RollbackEntry,
  ConsensusProposal,
  ConsensusVote,
  ConsensusResult,
  LeaderElection,
  NegotiationOffer,
  RuntimeMetric,
  RuntimeTelemetryEvent,
  RuntimeAuditEntry,
  PolicyRule,
  PolicyDecision,
  VerificationIssue,
  VerificationReport,
  BindingStatus,
  RuntimeHealthReport,
  WorkerDescriptor,
  SandboxContext,
} from "./types";

export {
  AgentLifecycleStateSchema,
  SchedulingPolicySchema,
  RuntimeSeveritySchema,
  AgentIdentitySchema,
  CapabilityScopeSchema,
  PermissionScopeSchema,
  AgentRuntimeBudgetSchema,
  AgentRuntimeSpecSchema,
  RuntimeMessageSchema,
  ConsensusProposalSchema,
  ConsensusVoteSchema,
  PolicyRuleSchema,
  NegotiationOfferSchema,
} from "./contracts";

// Registry
export {
  registerAgent,
  getAgent,
  requireAgent,
  updateAgent,
  listAgents,
  deregisterAgent,
  registrySize,
  clearRegistry,
} from "./registry.server";

// Lifecycle
export { transition, canTransition, listTransitions, clearTransitions } from "./lifecycle.server";

// Scheduler
export { schedule } from "./scheduler.server";
export type { SchedulingRequest, SchedulingDecision } from "./scheduler.server";

// Supervisor
export { supervise } from "./supervisor.server";
export type { SupervisorAdvisory, SupervisorReport } from "./supervisor.server";

// Workers
export {
  spawnWorker,
  assignWorker,
  releaseWorker,
  heartbeat as workerHeartbeat,
  drainWorker,
  terminateWorker,
  listWorkers,
  orphanWorkers,
  clearWorkers,
} from "./worker.server";

// Sandbox + isolation
export {
  createSandbox,
  getSandbox,
  listSandboxes,
  destroySandbox,
  assertReadable,
  assertWritable,
} from "./sandbox.server";
export type { CreateSandboxInput } from "./sandbox.server";
export { assertSameOrg, assertOrgScope, sameParent } from "./isolation.server";

// Budget + retry + timeout
export { chargeBudget, budgetStatus } from "./budget.server";
export type { BudgetStatus } from "./budget.server";
export { planRetry } from "./retry.server";
export type { RetryDecision, RetryOptions } from "./retry.server";
export { withTimeout, RuntimeTimeoutError } from "./timeout.server";

// Rollback / checkpoint / snapshot / recovery
export { recordRollback, listRollbacks, clearRollbacks } from "./rollback.server";
export type { RecordRollbackInput } from "./rollback.server";
export {
  saveCheckpoint,
  getCheckpoint,
  latestCheckpoint,
  listCheckpoints,
  clearCheckpoints,
} from "./checkpoint.server";
export {
  takeSnapshot,
  getSnapshot,
  latestSnapshot,
  restoreSnapshot,
  clearSnapshots,
} from "./snapshot.server";
export { planRecovery, executeRollback } from "./recovery.server";
export type { RecoveryPlan, RecoveryStep } from "./recovery.server";

// Health / metrics / telemetry
export { heartbeat as agentHeartbeat, reportHealth } from "./health.server";
export { recordMetric, listMetrics, summarizeMetric, clearMetrics } from "./metrics.server";
export {
  emitTelemetry,
  subscribeTelemetry,
  tailTelemetry,
  clearTelemetry,
} from "./telemetry.server";

// Security
export {
  grantPermission,
  revokePermission,
  hasPermission,
  assertPermission,
} from "./permissions.server";
export { issueIdentity } from "./identity.server";
export type { IssueIdentityInput } from "./identity.server";
export { issueAgentToken, verifyAgentToken, revokeAgentToken } from "./authentication.server";
export type { AuthResult } from "./authentication.server";
export { authorizeCapability, authorizeAction } from "./authorization.server";
export type { AuthorizationDecision } from "./authorization.server";

// Collaboration
export { sendMessage, receive, clearMessages } from "./messaging.server";
export {
  shareArtifact,
  listArtifacts,
  delegate,
  listDelegations,
  joinSwarm,
  leaveSwarm,
  listSwarmMembers,
  detectArtifactConflicts,
  resolveConflict,
  clearCollaboration,
} from "./collaboration.server";
export type { Conflict } from "./collaboration.server";
export { propose, castVote, getConsensusResult, expireProposal } from "./consensus.server";
export { nominate, elect, stepDown, getElection } from "./election.server";
export { offer, respond, listOffers } from "./negotiation.server";

// Capability + bindings
export { resolveCapability, assertCapabilityKnown } from "./capability.server";
export type { MarketplaceBinding } from "./capability.server";
export { getBindings, isBound } from "./bindings.server";
export { bindPlanner, unbindPlanner, getPlanner, isPlannerBound } from "./planner-binding.server";
export type { PlannerBinding } from "./planner-binding.server";
export {
  bindExecution,
  unbindExecution,
  getExecution,
  isExecutionBound,
} from "./execution-binding.server";
export type { ExecutionBinding } from "./execution-binding.server";
export {
  bindMarketplace,
  unbindMarketplace,
  getMarketplace,
  isMarketplaceBound,
} from "./marketplace-binding.server";
export { bindMemory, unbindMemory, getMemory, isMemoryBound } from "./memory-binding.server";
export type { MemoryBinding } from "./memory-binding.server";
export {
  bindCognition,
  unbindCognition,
  getCognition,
  isCognitionBound,
} from "./cognition-binding.server";
export type { CognitionBinding } from "./cognition-binding.server";
export { bindOs, unbindOs, getOs, isOsBound } from "./os-binding.server";
export type { OsBinding } from "./os-binding.server";

// Audit / policy / verification
export { auditRuntime, listRuntimeAudit, clearRuntimeAudit } from "./audit.server";
export {
  addPolicy,
  removePolicy,
  listPolicies,
  evaluatePolicy,
  clearPolicies,
} from "./policy.server";
export type { PolicyEvaluationInput } from "./policy.server";
export { verifyRuntime } from "./verification.server";
