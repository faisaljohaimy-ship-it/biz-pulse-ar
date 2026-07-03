/**
 * ARIA Singleton — canonical types.
 *
 * There is exactly ONE ARIA in the NEXIOS OS. These types describe its
 * public surface. Any component that wants to talk to ARIA imports from
 * here — never from legacy `src/lib/aria/**` modules.
 */

export type AriaMode = "collapsed" | "docked" | "fullscreen";

export type AriaVoiceState = "idle" | "listening" | "thinking" | "speaking";

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

export interface AriaOpenOptions {
  /** Focus composer after opening. */
  focus?: boolean;
  /** Pre-seed the composer with a draft prompt. */
  draft?: string;
  /** Immediately send this prompt after open. */
  send?: string;
}
