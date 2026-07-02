// Phase 11.5 — Hero Integration types.
// Strictly additive orchestration between Hero UI and existing ARIA engines.

import type { AudioState, VoiceLang } from "../live-voice/types";

export type HeroPresence =
  | "boot"
  | "idle"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error";

export type HeroGlow = "dim" | "ambient" | "attentive" | "focused" | "radiant" | "alert";

export type HeroButtonId =
  | "talk_to_aria"
  | "executive_briefing"
  | "start_demo"
  | "show_risks"
  | "show_today_summary"
  | "generate_report";

export type HeroButtonStatus = "idle" | "loading" | "success" | "error";

export interface HeroButtonState {
  readonly id: HeroButtonId;
  readonly status: HeroButtonStatus;
  readonly message_ar?: string;
  readonly message_en?: string;
  readonly startedAt?: number;
  readonly completedAt?: number;
}

export interface HeroState {
  readonly instanceId: string;
  readonly startedAt: number;
  presence: HeroPresence;
  glow: HeroGlow;
  audio: AudioState;
  lang: VoiceLang;
  greeted: boolean;
  activeTurnId: string | null;
  activeButton: HeroButtonId | null;
  buttons: Readonly<Record<HeroButtonId, HeroButtonState>>;
  lastError?: { code: string; message: string; ts: number };
}

export type HeroEventKind =
  | "boot"
  | "greet"
  | "click_avatar"
  | "click_button"
  | "voice_result"
  | "response_chunk"
  | "response_done"
  | "interrupt"
  | "error";

export interface HeroEvent {
  readonly kind: HeroEventKind;
  readonly ts: number;
  readonly detail?: Record<string, unknown>;
}

export interface HeroActionOutcome {
  readonly ok: boolean;
  readonly buttonId: HeroButtonId;
  readonly turnId?: string;
  readonly message_ar: string;
  readonly message_en: string;
  readonly reason?: string;
}
