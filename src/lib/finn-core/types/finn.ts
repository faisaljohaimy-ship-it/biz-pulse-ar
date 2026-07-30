/**
 * FINN Brain Core — canonical types (Phase 1).
 *
 * These describe the public surface every FINN manager, hook, and page adapter
 * must speak. Anything outside `src/lib/finn-core/` must import from here — not
 * from legacy `src/lib/finn/**` or from managers directly.
 */

// ─── UI mode / voice state ──────────────────────────────────────────────
export type FinnMode = "collapsed" | "docked" | "fullscreen";

export type FinnVoiceState = "idle" | "listening" | "processing" | "speaking" | "unavailable";

// ─── Page context (executive context surface) ───────────────────────────
export interface FinnPageContext {
  /** Current pathname (from TanStack router). */
  pathname: string;
  /** Human label for the page (e.g. "Sec — CCTV"). */
  label: string;
  /** Locale at the moment of context capture. */
  locale: "ar" | "en";
  /** Optional structured facts the page wants FINN to know about. */
  facts?: Record<string, unknown>;
}

/** Full context snapshot as produced by ContextManager. */
export interface FinnContextSnapshot extends FinnPageContext {
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
export interface FinnOpenOptions {
  /** Focus composer after opening. */
  focus?: boolean;
  /** Pre-seed the composer with a draft prompt. */
  draft?: string;
  /** Immediately send this prompt after open. */
  send?: string;
}

// ─── AI Router ──────────────────────────────────────────────────────────
export type FinnIntent =
  | "general"
  | "executive"
  | "long-context"
  | "writing"
  | "engineering"
  | "unknown";

export interface FinnRouteHint {
  intent: FinnIntent;
  /** True when the client suspects a long/complex prompt (>~4000 chars). */
  longContext: boolean;
  /** Sent as a header so the server router can score decisions. */
  locale: "ar" | "en";
}

// ─── Conversation lifecycle ─────────────────────────────────────────────
export type FinnTurnStatus = "idle" | "queued" | "streaming" | "completed" | "cancelled" | "failed";

export interface FinnTurn {
  id: string;
  startedAt: string;
  status: FinnTurnStatus;
  intent: FinnIntent;
  /** Set once the response has fully finished. */
  endedAt?: string;
  /** Human-safe error message (already scrubbed of raw provider text). */
  error?: string;
}

// ─── Memory (interface only — Phase 2 will implement) ───────────────────
export interface FinnMemoryRecall {
  key: string;
  value: string;
  score?: number;
}

// ─── Voice (interface only — Phase 2 will implement) ────────────────────
export interface FinnVoiceCapabilities {
  stt: boolean;
  tts: boolean;
}
