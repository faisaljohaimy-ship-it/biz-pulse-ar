// Phase 11.1 — Human Conversation Engine types.
// Strictly additive. No dependency on Brain/Memory/Runtime internals.

export type ConversationState =
  | "idle"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "resuming";

export type Lang = "ar" | "en";

export type Confidence = "unknown" | "low" | "medium" | "high";

export interface EvidenceRef {
  readonly kind: string;
  readonly id: string;
  readonly label?: string;
}

export interface ConversationTurn {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly lang: Lang;
  readonly ts: number;
  readonly interrupted?: boolean;
  readonly evidence?: readonly EvidenceRef[];
  readonly confidence?: Confidence;
}

export interface StreamChunk {
  readonly turnId: string;
  readonly seq: number;
  readonly text: string;
  readonly final: boolean;
}

export interface SpeechEvent {
  readonly kind:
    | "voice_start"
    | "voice_end"
    | "partial_transcript"
    | "final_transcript"
    | "tts_start"
    | "tts_chunk"
    | "tts_end"
    | "tts_abort"
    | "error";
  readonly ts: number;
  readonly detail?: string;
  readonly text?: string;
}

export interface PageContext {
  readonly route: string;
  readonly title?: string;
  readonly anchors?: readonly string[];
  readonly widgets?: readonly { id: string; kind: string; summary?: string }[];
}

export interface ResponseStyle {
  readonly length: "brief" | "detailed";
  readonly tone: "executive" | "warm" | "urgent";
  readonly lang: Lang;
}

export interface FallbackDecision {
  readonly kind: "unavailable" | "clarify" | "escalate" | "none";
  readonly reason_ar?: string;
  readonly reason_en?: string;
}
