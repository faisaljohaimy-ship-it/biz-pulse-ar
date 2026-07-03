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

// ─── Phase 10: Avatar Brain ────────────────────────────────────────────
export { avatarBrain } from "./core/avatar-brain";
export { avatarStateManager } from "./core/avatar-state-manager";
export { emotionEngine } from "./core/emotion-engine";
export { eyeEngine } from "./core/eye-engine";
export { headEngine } from "./core/head-engine";
export { faceEngine } from "./core/face-engine";
export { lipSyncEngine } from "./core/lip-sync-engine";
export { gestureEngine } from "./core/gesture-engine";
export { bodyEngine } from "./core/body-engine";
export { idleEngine } from "./core/idle-engine";
export { attentionEngine } from "./core/attention-engine";
export { transitionEngine } from "./core/transition-engine";
export { avatarAnimationQueue } from "./core/avatar-animation-queue";
export { avatarRenderer } from "./core/avatar-renderer";
export type { AvatarState, Emotion, AvatarEvent } from "./core/avatar-state-manager";
export type { AvatarFrame } from "./core/avatar-renderer";
export type { EyeChannel } from "./core/eye-engine";
export type { HeadChannel } from "./core/head-engine";
export type { FaceChannel } from "./core/face-engine";
export type { BodyChannel } from "./core/body-engine";
export type { GestureId } from "./core/gesture-engine";
export type { AttentionTarget } from "./core/attention-engine";

// ─── Phase 11: Avatar Runtime + Voice Brain + Presence ─────────────────
export { avatarRuntime } from "./core/avatar-runtime";
export { voiceBrain } from "./core/voice-brain";
export { realtimeAnimation } from "./core/realtime-animation";
export { liveEmotion } from "./core/live-emotion";
export { conversationAnimation } from "./core/conversation-animation";
export { thinkingAnimation } from "./core/thinking-animation";
export { executionAnimation } from "./core/execution-animation";
export { executivePresence } from "./core/executive-presence";
export { avatarLifecycle } from "./core/avatar-lifecycle";
export { avatarScheduler } from "./core/avatar-scheduler";
export { avatarVoiceSync } from "./core/avatar-voice-sync";
export { avatarTelemetry } from "./core/avatar-telemetry";
export type { TelemetrySnapshot } from "./core/avatar-telemetry";
export type { PresenceSnapshot, PresenceLevel, PresenceGlow } from "./core/executive-presence";

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
