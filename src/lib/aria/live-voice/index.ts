// Phase 11.4 — ARIA Live Voice public barrel.
// Strictly additive. Consumes Phase 11.1 conversation + Phase 11.3 motion.

export * from "./types";
export * from "./contracts";
export {
  detectVoiceProvider,
  VOICE_MODELS,
  VOICE_ENDPOINT,
  DEFAULT_VOICES,
} from "./voice-provider.server";
export { transcribeAudio, type SttInput, type SttResponse } from "./speech-to-text.server";
export { synthesizeSpeech, type TtsResponse } from "./text-to-speech.server";
export { decodeSseAudio, type DecodeResult } from "./streaming-audio.server";
export { VoiceInterruptionController, type VoiceInterruption } from "./interruptions.server";
export { VadEngine, type VadOptions } from "./vad.server";
export { detectLanguage } from "./language-detection.server";
export { AudioStateStore } from "./audio-state.server";
export {
  openLiveVoiceSession,
  getLiveVoiceSession,
  updateLiveVoiceSession,
  closeLiveVoiceSession,
  reconcileSingleActive,
} from "./voice-session.server";
export {
  decideVoiceFallback,
  type FallbackInput,
  type VoiceFallbackDecision,
  type VoiceFallbackKind,
} from "./fallback.server";
export { LiveVoiceAudit, type LiveVoiceAuditEntry, type LiveVoiceAuditKind } from "./audit.server";
export { LiveVoiceMetrics, type LiveVoiceMetricsSnapshot } from "./metrics.server";
export { verifyLiveVoice, type LiveVoiceVerification } from "./verification.server";
