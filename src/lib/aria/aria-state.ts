/**
 * ARIA global presence state — subscribed by the backdrop for CSS-only
 * motion states. No React context; a tiny module-scoped store lets any
 * component push a state without prop-drilling.
 *
 * States:
 *  - idle      → slow breathing
 *  - listening → user typing / mic hot
 *  - thinking  → request in flight
 *  - speaking  → TTS playing
 */
import { useEffect, useState } from "react";

export type AriaPresenceState = "idle" | "listening" | "thinking" | "speaking";

let current: AriaPresenceState = "idle";
const listeners = new Set<(s: AriaPresenceState) => void>();

export const ariaState = {
  get(): AriaPresenceState {
    return current;
  },
  set(next: AriaPresenceState) {
    if (next === current) return;
    current = next;
    for (const l of listeners) l(next);
  },
  subscribe(fn: (s: AriaPresenceState) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useAriaPresenceState(): AriaPresenceState {
  const [s, setS] = useState<AriaPresenceState>(() => ariaState.get());
  useEffect(() => { const off = ariaState.subscribe(setS); return () => { off; }; }, []);
  return s;
}
