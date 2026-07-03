/**
 * ARIA Singleton — public hook.
 *
 * The ONE hook every route/component uses to talk to ARIA. Do not import
 * legacy `useAriaSnapshot`, `useAriaDock`, `useCopilot`, etc. — those are
 * deprecated and slated for removal (see src/lib/aria-core/README.md).
 */
import { useCallback } from "react";
import type { AriaOpenOptions, AriaPageContext } from "./types";
import { useAriaStore } from "./store";

export function useAria() {
  const mode = useAriaStore((s) => s.mode);
  const voice = useAriaStore((s) => s.voice);
  const voiceEnabled = useAriaStore((s) => s.voiceEnabled);
  const pageContext = useAriaStore((s) => s.pageContext);
  const enqueue = useAriaStore((s) => s.enqueue);
  const setMode = useAriaStore((s) => s.setMode);
  const setVoiceEnabled = useAriaStore((s) => s.setVoiceEnabled);

  const open = useCallback(
    (options?: AriaOpenOptions) => enqueue({ kind: "open", options }),
    [enqueue],
  );
  const close = useCallback(() => enqueue({ kind: "close" }), [enqueue]);
  const focus = useCallback(() => enqueue({ kind: "focus" }), [enqueue]);
  const ask = useCallback((text: string) => enqueue({ kind: "send", text }), [enqueue]);

  return {
    mode,
    voice,
    voiceEnabled,
    pageContext,
    open,
    close,
    focus,
    ask,
    setMode,
    setVoiceEnabled,
  };
}

/**
 * Register the current page as ARIA's active context. Call this once per
 * route from a `useEffect`. Safe to call with the same value repeatedly.
 */
export function setAriaPageContext(ctx: AriaPageContext) {
  useAriaStore.getState().setPageContext(ctx);
}
