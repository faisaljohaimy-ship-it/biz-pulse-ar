/**
 * SADEED Brain Core — canonical types (Phase 1).
 *
 * These describe the public surface every SADEED manager, hook, and page adapter
 * must speak. Anything outside `src/lib/sadeed-core/` must import from here — not
 * from legacy `src/lib/sadeed/**` or from managers directly.
 */

// ─── UI mode / voice state ──────────────────────────────────────────────
export type SadeedMode = "collapsed" | "docked" | "fullscreen";

export type SadeedVoiceState = "idle" | "listening" | "processing" | "speaking" | "unavailable";

// ─── Page context (executive context surface) ───────────────────────────
export interface SadeedPageContext {
  /** Current pathname (from TanStack router). */
  pathname: string;
  /** Human label for the page (e.g. "Sec — CCTV"). */
  label: string;
  /** Locale at the moment of context capture. */
  locale: "ar" | "en";
  /** Optional structured facts the page wants SADEED to know about. */
  facts?: Record<string, unknown>;
}

/** Full context snapshot as produced by ContextManager. */
export interface SadeedContextSnapshot extends SadeedPageContext {
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
export interface SadeedOpenOptions {
  /** Focus composer after opening. */
  focus?: boolean;
  /** Pre-seed the composer with a draft prompt. */
  draft?: string;
  /** Immediately send this prompt after open. */
  send?: string;
}

// ─── AI Router ──────────────────────────────────────────────────────────
export type SadeedIntent =
  "general" | "executive" | "long-context" | "writing" | "engineering" | "unknown";

export interface SadeedRouteHint {
  intent: SadeedIntent;
  /** True when the client suspects a long/complex prompt (>~4000 chars). */
  longContext: boolean;
  /** Sent as a header so the server router can score decisions. */
  locale: "ar" | "en";
}

// ─── Conversation lifecycle ─────────────────────────────────────────────
export type SadeedTurnStatus =
  "idle" | "queued" | "streaming" | "completed" | "cancelled" | "failed";

export interface SadeedTurn {
  id: string;
  startedAt: string;
  status: SadeedTurnStatus;
  intent: SadeedIntent;
  /** Set once the response has fully finished. */
  endedAt?: string;
  /** Human-safe error message (already scrubbed of raw provider text). */
  error?: string;
}

// ─── Memory (interface only — Phase 2 will implement) ───────────────────
export interface SadeedMemoryRecall {
  key: string;
  value: string;
  score?: number;
}

// ─── Voice (interface only — Phase 2 will implement) ────────────────────
export interface SadeedVoiceCapabilities {
  stt: boolean;
  tts: boolean;
}
