/**
 * FINN global presence state — subscribed by the backdrop for CSS-only
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

export type FinnPresenceState = "idle" | "listening" | "thinking" | "speaking";

let current: FinnPresenceState = "idle";
const listeners = new Set<(s: FinnPresenceState) => void>();

export const ariaState = {
  get(): FinnPresenceState {
    return current;
  },
  set(next: FinnPresenceState) {
    if (next === current) return;
    current = next;
    for (const l of listeners) l(next);
  },
  subscribe(fn: (s: FinnPresenceState) => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

export function useFinnPresenceState(): FinnPresenceState {
  const [s, setS] = useState<FinnPresenceState>(() => ariaState.get());
  useEffect(() => ariaState.subscribe(setS), []);
  return s;
}
