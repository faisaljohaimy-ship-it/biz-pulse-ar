/**
 * ARIA Singleton — public barrel.
 *
 * Every route/component/hook talks to ARIA through these exports. Do NOT
 * import from `src/lib/aria/**` or from the internal `core/`, `state/`,
 * `services/`, `providers/`, `hooks/`, `types/` directories — go through
 * this file.
 */
export { AriaProvider, useAriaChat } from "./providers/aria-provider";
export { useAria, setAriaPageContext } from "./hooks/useAria";
export { useAriaStore } from "./state/aria-store";
export { ariaBrain } from "./core/aria-brain";
export { aiRouter } from "./core/ai-router";
export { conversationManager } from "./core/conversation-manager";
export { contextManager } from "./core/context-manager";
export { memoryManager } from "./core/memory-manager";
export { voiceManager } from "./core/voice-manager";
export { responsePipeline } from "./core/response-pipeline";
export { executiveAiOrchestrator } from "./core/executive-ai-orchestrator";

// ─── Phase 2: Executive Intelligence Core ──────────────────────────────
export { executiveReasoning } from "./core/executive-reasoning";
export { decisionEngine } from "./core/decision-engine";
export { riskEngine } from "./core/risk-engine";
export { priorityEngine } from "./core/priority-engine";
export { confidenceEngine } from "./core/confidence-engine";
export { contextAwareness } from "./core/context-awareness";
export { conversationIntelligence } from "./core/conversation-intelligence";
export { responseValidator } from "./core/response-validator";
export { planningEngine } from "./core/planning-engine";

// ─── Phase 3: Executive Execution Layer ────────────────────────────────
export { executionPlanner } from "./core/execution-planner";
export { actionRegistry } from "./core/action-registry";
export { toolRegistry } from "./core/tool-registry";
export { permissionGuard } from "./core/permission-guard";
export { approvalGate } from "./core/approval-gate";
export { executionQueue } from "./core/execution-queue";
export { executionSimulator } from "./core/execution-simulator";
export { executionSimulator as executionSimulatorEngine } from "./core/execution-simulator";
export { auditTrail } from "./core/audit-trail";
export type { ActionType, ActionDefinition } from "./core/action-registry";
export type { ToolId, ToolDescriptor, ToolCategory } from "./core/tool-registry";
export type { CallerRole } from "./core/permission-guard";
export type {
  ExecutionEnvelope,
  ExecutionStep,
  QueueState,
  PermissionDecision,
  PermissionReport,
  ApprovalReport,
  SimulationReport,
  AuditRecord,
} from "./core/execution-envelope";

export type {
  AriaMode,
  AriaVoiceState,
  AriaPageContext,
  AriaContextSnapshot,
  AriaOpenOptions,
  AriaIntent,
  AriaRouteHint,
  AriaTurn,
  AriaTurnStatus,
  AriaMemoryRecall,
  AriaVoiceCapabilities,
} from "./types/aria";
export type {
  RiskLevel,
  RiskSignal,
  PriorityLevel,
  PriorityAssessment,
  DecisionMode,
  DecisionOption,
  DecisionProposal,
  ConfidenceReport,
  ReliabilityLevel,
  ContextAwarenessReport,
  ReasoningTrace,
  NextAction,
  ExecutiveEnvelope,
  EphemeralMemoryState,
} from "./types/executive";
