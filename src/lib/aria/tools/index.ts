/**
 * Phase 9.3 — Universal Tool Execution Engine (public server surface).
 *
 * Strictly additive. Import from callers:
 *   import * as Tools from "@/lib/aria/tools";
 */

// Types
export type {
  AdapterKind,
  SideEffect,
  ExecutionStatus,
  ToolPermissionRequirement,
  ToolDescriptor,
  ToolExecutionContext,
  ToolExecutionBudget,
  ToolExecutionRequest,
  ToolExecutionResult,
  ToolExecutionMetric,
  ToolAuditEntry,
  ToolTelemetryEvent,
  CredentialResolution,
  AdapterHandler,
  AdapterProbeReport,
  ExecutionCheckpoint,
  ExecutionSnapshot,
  ExecutionRollbackEntry,
  VerificationIssue,
  VerificationReport,
} from "./types";

// Contracts
export {
  AdapterKindSchema,
  SideEffectSchema,
  ExecutionStatusSchema,
  ToolPermissionRequirementSchema,
  ToolDescriptorSchema,
  ToolExecutionContextSchema,
  ToolExecutionBudgetSchema,
  ToolExecutionRequestSchema,
} from "./contracts";

// Adapters
export { ADAPTER_CATALOG, describeAdapter } from "./adapters.catalog";
export type { AdapterDescriptor } from "./adapters.catalog";
export {
  bindAdapter,
  unbindAdapter,
  getAdapter,
  isAdapterBound,
  listBoundAdapters,
  probeAdapter,
} from "./adapter.server";

// Registry / Discovery / Resolver / Capability
export {
  registerTool,
  deregisterTool,
  getTool,
  requireTool,
  listTools,
  listToolsByAdapter,
  clearRegistry,
} from "./registry.server";
export { discoverTools } from "./discovery.server";
export type { DiscoveryQuery, DiscoveryHit } from "./discovery.server";
export { resolveByToolId, resolveByCapability } from "./resolver.server";
export type { ResolveResult } from "./resolver.server";
export { matchCapability } from "./capability.server";
export type { CapabilityRequirement, CapabilityMatch } from "./capability.server";

// Context / Router
export { createContext } from "./context.server";
export type { CreateContextInput } from "./context.server";
export { execute } from "./router.server";

// Policies / Budget
export {
  addPolicy,
  removePolicy,
  listPolicies,
  clearPolicies,
  evaluatePolicy,
} from "./policy.server";
export type { PolicyRule, PolicyDecision, PolicyInput } from "./policy.server";
export { validateBudget, measureBytes, enforceBytes } from "./budget.server";
export type { BudgetCheck } from "./budget.server";

// Metrics / Audit / Telemetry
export { recordMetric, listMetrics, summarizeMetrics, clearMetrics } from "./metrics.server";
export type { MetricSummary } from "./metrics.server";
export { auditExecution, listAudit, clearAudit } from "./audit.server";
export {
  emitTelemetry,
  subscribeTelemetry,
  tailTelemetry,
  clearTelemetry,
} from "./telemetry.server";

// Retry / Timeout
export { defaultRetryPlan, backoffFor, shouldRetry } from "./retry.server";
export type { RetryPlan } from "./retry.server";
export { runWithTimeout, ToolTimeoutError } from "./timeout.server";

// Sandbox / Checkpoint / Snapshot / Rollback / Recovery
export {
  createSandbox,
  getSandbox,
  destroySandbox,
  assertSideEffect,
} from "./sandbox.server";
export type { SandboxScope, CreateSandboxInput } from "./sandbox.server";
export { checkpoint, listCheckpoints, clearCheckpoints } from "./checkpoint.server";
export { takeSnapshot, getSnapshot, latestSnapshot, clearSnapshots } from "./snapshot.server";
export { recordRollback, listRollbacks, clearRollbacks } from "./rollback.server";
export type { RecordRollbackInput } from "./rollback.server";
export { planRecovery, executeRollback } from "./recovery.server";
export type { RecoveryPlan, RecoveryStep } from "./recovery.server";

// Permissions / Authentication / Authorization / Credentials
export {
  grantPermission,
  revokePermission,
  hasPermission,
  listPermissions,
  clearPermissions,
} from "./permissions.server";
export {
  bindAuthVerifier,
  unbindAuthVerifier,
  authenticate,
} from "./authentication.server";
export type { AuthVerifier, AuthenticationResult } from "./authentication.server";
export { authorize } from "./authorization.server";
export type { AuthorizationResult } from "./authorization.server";
export {
  bindCredentialProvider,
  unbindCredentialProvider,
  resolveCredentials,
} from "./credentials.server";
export type { CredentialProvider } from "./credentials.server";

// Verification
export { verifyToolEngine } from "./verification.server";
