// Phase 11.4 — ARIA Live Voice types.
// Strictly additive. Consumes Phase 11.1 conversation + Phase 11.3 motion.

export type VoiceLang = "ar" | "en" | "unknown";
export type AudioState =
  | "idle"
  | "listening"
  | "capturing"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error";

export interface VoiceProviderCapabilities {
  readonly stt: boolean;
  readonly tts: boolean;
  readonly reason?: string;
}

export interface SttResult {
  readonly text: string;
  readonly lang: VoiceLang;
  readonly confidence: number; // 0..1
  readonly durationMs: number;
}

export interface TtsChunk {
  readonly seq: number;
  readonly base64: string;
  readonly mime: string;
  readonly final: boolean;
}

export interface TtsRequest {
  readonly text: string;
  readonly lang: VoiceLang;
  readonly voice?: string;
  readonly speed?: number;
}

export interface VadFrame {
  readonly rms: number; // 0..1 root-mean-square amplitude
  readonly ts: number;
}

export interface VadDecision {
  readonly speaking: boolean;
  readonly since: number;
}

export interface LiveVoiceSession {
  readonly id: string;
  readonly startedAt: number;
  endedAt?: number;
  lang: VoiceLang;
  greeted: boolean;
  activeTurnId: string | null;
  audio: AudioState;
}
