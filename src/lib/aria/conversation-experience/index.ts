// Phase 11.1 — ARIA Human Conversation Engine public barrel.
// Strictly additive. Server-only orchestration; no UI here.

export * from "./types";
export * from "./contracts";
export { ConversationStateMachine } from "./conversation-state.server";
export { TurnManager } from "./turn-manager.server";
export { InterruptionController, type InterruptionRecord } from "./interruptions.server";
export { StreamingResponseBuilder } from "./streaming-response.server";
export {
  openVoiceSession,
  updateVoiceSession,
  closeVoiceSession,
  getVoiceSession,
  type VoiceSession,
} from "./voice-session.server";
export { SpeechEventBus } from "./speech-events.server";
export { ListeningStateStore, type ListeningSnapshot } from "./listening-state.server";
export {
  ThinkingStateStore,
  type ThinkingStage,
  type ThinkingSnapshot,
} from "./thinking-state.server";
export { SpeakingStateStore, type SpeakingSnapshot } from "./speaking-state.server";
export { toMemorySlice, summarizeEvidence, type MemoryTurnSlice } from "./memory-bridge.server";
export { validatePageContext, formatPageContext } from "./page-context-bridge.server";
export { resolveStyle } from "./response-style.server";
export { buildToneDirective } from "./executive-tone.server";
export { decideFallback, type FallbackInput } from "./fallback.server";
export {
  ConversationAudit,
  type ConversationAuditEntry,
  type ConversationAuditKind,
} from "./audit.server";
export { ConversationMetrics, type ConversationMetricsSnapshot } from "./metrics.server";
export { ConversationTelemetry, type TelemetrySink } from "./telemetry.server";
export {
  verifySnapshot,
  ConversationSnapshotSchema,
  type ConversationSnapshot,
  type VerificationResult,
} from "./verification.server";
