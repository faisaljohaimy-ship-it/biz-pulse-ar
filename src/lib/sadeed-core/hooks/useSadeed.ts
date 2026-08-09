/**
 * SADEED Brain Core — canonical hook.
 *
 * The ONE hook every route/component uses to talk to SADEED. Delegates to the
 * store for reactive state and to the Brain for imperative submits.
 *
 * Forbidden alternatives (do not create):
 *   - direct `fetch("/api/chat", ...)` from components
 *   - direct model-provider SDK calls from components
 *   - a second SADEED store, provider, or conversation
 */
import { useCallback } from "react";
import type { SadeedOpenOptions, SadeedPageContext } from "../types/sadeed";
import { useSadeedStore } from "../state/sadeed-store";
import { sadeedBrain } from "../core/sadeed-brain";

export function useSadeed() {
  const mode = useSadeedStore((s) => s.mode);
  const voice = useSadeedStore((s) => s.voice);
  const pageContext = useSadeedStore((s) => s.pageContext);
  const activeTurn = useSadeedStore((s) => s.activeTurn);
  const enqueue = useSadeedStore((s) => s.enqueue);
  const setMode = useSadeedStore((s) => s.setMode);
  const setPageContext = useSadeedStore((s) => s.setPageContext);

  const open = useCallback(
    (options?: SadeedOpenOptions) => enqueue({ kind: "open", options }),
    [enqueue],
  );
  const close = useCallback(() => enqueue({ kind: "close" }), [enqueue]);
  const focus = useCallback(() => enqueue({ kind: "focus" }), [enqueue]);
  const ask = useCallback((text: string) => {
    void sadeedBrain.submit(text);
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
 * Register the current page as SADEED's active context. Call this once per
 * route from a `useEffect`. Safe to call with the same value repeatedly.
 */
export function setSadeedPageContext(ctx: SadeedPageContext) {
  useSadeedStore.getState().setPageContext(ctx);
}
