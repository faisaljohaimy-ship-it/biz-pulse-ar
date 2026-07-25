/**
 * Agent Runtime Foundation (Phase 6) — public surface.
 *
 * Generic hosting runtime only: no agents loaded, no business logic, no
 * skills imported. The OperationalGate type is exported for typing; the
 * only live instance is created inside `createAgentRuntime` and held by
 * the coordinator.
 */
export {
  AgentRuntimeError,
  AGENT_LIFECYCLE_STATES,
  AGENT_EXECUTION_MODES,
  AGENT_EVENTS,
  type AgentLifecycleState,
  type AgentExecutionMode,
  type AgentEventName,
  type AgentEvent,
  type Clock as AgentRuntimeClock,
  type Monotonic,
  type IdFactory,
} from "./types";
export {
  agentRecordSchema,
  agentRuntimeManifestSchema,
  agentPolicySchema,
  type AgentRecord,
  type AgentRuntimeManifest,
} from "./records";
export { AgentLifecycleMachine, OPERATIONAL_STATES } from "./lifecycle";
export { AgentEventBus, type AgentEventHandler } from "./events";
export {
  ContextMemory,
  ExecutionContextFactory,
  type ExecutionContext,
  type ExecutionIdentity,
} from "./execution-context";
export {
  LogJournal,
  MetricsRegistry,
  TraceCollector,
  type AgentMetricsSnapshot,
  type LogEntry,
  type LogLevel,
  type TraceSpan,
} from "./observability";
export {
  AuditTrail,
  SecurityModel,
  type ApprovalHook,
  type ApprovalRequest,
  type AuditEntry,
  type PolicyDecision,
} from "./security";
export { AgentRuntimeRegistry, type OperationalGate } from "./registry";
export {
  ExecutionCoordinator,
  collectAgentIds,
  type AgentInvoker,
  type ExecutionPlan,
  type ExecutionRequest,
  type ExecutionResult,
  type InvocationResult,
  type RequestStatus,
} from "./execution";
export {
  AgentRecordValidator,
  type AgentValidationContext,
  type AgentValidationIssue,
  type AgentValidationReport,
} from "./validation";
export {
  createAgentRuntime,
  type AgentAdmissionReport,
  type AgentRuntime,
  type AgentRuntimeOptions,
} from "./runtime";
