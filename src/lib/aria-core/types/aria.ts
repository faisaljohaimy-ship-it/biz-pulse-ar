/**
 * ARIA Brain Core — canonical types (Phase 1).
 *
 * These describe the public surface every ARIA manager, hook, and page adapter
 * must speak. Anything outside `src/lib/aria-core/` must import from here — not
 * from legacy `src/lib/aria/**` or from managers directly.
 */

// ─── UI mode / voice state ──────────────────────────────────────────────
export type AriaMode = "collapsed" | "docked" | "fullscreen";

export type AriaVoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "unavailable";

// ─── Page context (executive context surface) ───────────────────────────
export interface AriaPageContext {
  /** Current pathname (from TanStack router). */
  pathname: string;
  /** Human label for the page (e.g. "Sec — CCTV"). */
  label: string;
  /** Locale at the moment of context capture. */
  locale: "ar" | "en";
  /** Optional structured facts the page wants ARIA to know about. */
  facts?: Record<string, unknown>;
}

/** Full context snapshot as produced by ContextManager. */
export interface AriaContextSnapshot extends AriaPageContext {
  /** Coarse route group (first path segment). */
  module: string;
  /** Last path segment (screen name). */
  screen: string;
  /** RBAC placeholder — Phase 2 wires real permissions. */
  permissions: readonly string[];
  /** Extra page metadata registered by the current route. */
  pageMeta: Record<string, unknown>;
  /** Timestamp of the snapshot (ISO). */
  capturedAt: string;
}

// ─── Imperative open/ask options ────────────────────────────────────────
export interface AriaOpenOptions {
  /** Focus composer after opening. */
  focus?: boolean;
  /** Pre-seed the composer with a draft prompt. */
  draft?: string;
  /** Immediately send this prompt after open. */
  send?: string;
}

// ─── AI Router ──────────────────────────────────────────────────────────
export type AriaIntent =
  | "general"
  | "executive"
  | "long-context"
  | "writing"
  | "engineering"
  | "unknown";

export interface AriaRouteHint {
  intent: AriaIntent;
  /** True when the client suspects a long/complex prompt (>~4000 chars). */
  longContext: boolean;
  /** Sent as a header so the server router can score decisions. */
  locale: "ar" | "en";
}

// ─── Conversation lifecycle ─────────────────────────────────────────────
export type AriaTurnStatus =
  | "idle"
  | "queued"
  | "streaming"
  | "completed"
  | "cancelled"
  | "failed";

export interface AriaTurn {
  id: string;
  startedAt: string;
  status: AriaTurnStatus;
  intent: AriaIntent;
  /** Set once the response has fully finished. */
  endedAt?: string;
  /** Human-safe error message (already scrubbed of raw provider text). */
  error?: string;
}

// ─── Memory (interface only — Phase 2 will implement) ───────────────────
export interface AriaMemoryRecall {
  key: string;
  value: string;
  score?: number;
}

// ─── Voice (interface only — Phase 2 will implement) ────────────────────
export interface AriaVoiceCapabilities {
  stt: boolean;
  tts: boolean;
}
