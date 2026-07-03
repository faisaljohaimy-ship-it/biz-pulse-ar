/**
 * ARIA Brain Core — canonical hook.
 *
 * The ONE hook every route/component uses to talk to ARIA. Delegates to the
 * store for reactive state and to the Brain for imperative submits.
 *
 * Forbidden alternatives (do not create):
 *   - direct `fetch("/api/chat", ...)` from components
 *   - direct OpenAI / Claude / OpenRouter SDK calls from components
 *   - a second ARIA store, provider, or conversation
 */
import { useCallback } from "react";
import type { AriaOpenOptions, AriaPageContext } from "../types/aria";
import { useAriaStore } from "../state/aria-store";
import { ariaBrain } from "../core/aria-brain";

export function useAria() {
  const mode = useAriaStore((s) => s.mode);
  const voice = useAriaStore((s) => s.voice);
  const voiceEnabled = useAriaStore((s) => s.voiceEnabled);
  const pageContext = useAriaStore((s) => s.pageContext);
  const activeTurn = useAriaStore((s) => s.activeTurn);
  const enqueue = useAriaStore((s) => s.enqueue);
  const setMode = useAriaStore((s) => s.setMode);
  const setVoiceEnabled = useAriaStore((s) => s.setVoiceEnabled);
  const setPageContext = useAriaStore((s) => s.setPageContext);

  const open = useCallback(
    (options?: AriaOpenOptions) => enqueue({ kind: "open", options }),
    [enqueue],
  );
  const close = useCallback(() => enqueue({ kind: "close" }), [enqueue]);
  const focus = useCallback(() => enqueue({ kind: "focus" }), [enqueue]);
  const ask = useCallback(
    (text: string) => {
      void ariaBrain.submit(text);
    },
    [],
  );

  return {
    mode,
    voice,
    voiceEnabled,
    pageContext,
    activeTurn,
    open,
    close,
    focus,
    ask,
    setMode,
    setVoiceEnabled,
    setPageContext,
  };
}

/**
 * Register the current page as ARIA's active context. Call this once per
 * route from a `useEffect`. Safe to call with the same value repeatedly.
 */
export function setAriaPageContext(ctx: AriaPageContext) {
  useAriaStore.getState().setPageContext(ctx);
}
