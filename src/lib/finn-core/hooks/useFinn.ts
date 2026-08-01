/**
 * FINN Brain Core — canonical hook.
 *
 * The ONE hook every route/component uses to talk to FINN. Delegates to the
 * store for reactive state and to the Brain for imperative submits.
 *
 * Forbidden alternatives (do not create):
 *   - direct `fetch("/api/chat", ...)` from components
 *   - direct model-provider SDK calls from components
 *   - a second FINN store, provider, or conversation
 */
import { useCallback } from "react";
import type { FinnOpenOptions, FinnPageContext } from "../types/finn";
import { useFinnStore } from "../state/finn-store";
import { finnBrain } from "../core/finn-brain";

export function useFinn() {
  const mode = useFinnStore((s) => s.mode);
  const voice = useFinnStore((s) => s.voice);
  const pageContext = useFinnStore((s) => s.pageContext);
  const activeTurn = useFinnStore((s) => s.activeTurn);
  const enqueue = useFinnStore((s) => s.enqueue);
  const setMode = useFinnStore((s) => s.setMode);
  const setPageContext = useFinnStore((s) => s.setPageContext);

  const open = useCallback(
    (options?: FinnOpenOptions) => enqueue({ kind: "open", options }),
    [enqueue],
  );
  const close = useCallback(() => enqueue({ kind: "close" }), [enqueue]);
  const focus = useCallback(() => enqueue({ kind: "focus" }), [enqueue]);
  const ask = useCallback((text: string) => {
    void finnBrain.submit(text);
  }, []);

  return {
    mode,
    voice,
    pageContext,
    activeTurn,
    open,
    close,
    focus,
    ask,
    setMode,
    setPageContext,
  };
}

/**
 * Register the current page as FINN's active context. Call this once per
 * route from a `useEffect`. Safe to call with the same value repeatedly.
 */
export function setFinnPageContext(ctx: FinnPageContext) {
  useFinnStore.getState().setPageContext(ctx);
}
