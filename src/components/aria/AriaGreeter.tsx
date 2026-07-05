/**
 * AriaGreeter — DISABLED.
 *
 * The homepage auto-greeting on first pointerdown has been removed.
 * The site greeting now plays ONLY when the user explicitly taps the
 * hero chip «🔊 استمع للتعريف» (which calls speak(..., 'panel-greeting')
 * directly through the audio bus).
 *
 * The chat-panel greeting (fired when the ARIA panel opens) is owned
 * by AriaCopilot / audio bus and is unaffected.
 *
 * Kept as a no-op export so existing imports in __root.tsx keep working.
 */
export function AriaGreeter() {
  return null;
}

export default AriaGreeter;
