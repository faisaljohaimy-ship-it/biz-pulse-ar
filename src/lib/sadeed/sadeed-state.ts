/**
 * SADEED global presence state — subscribed by the backdrop for CSS-only
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

export type SadeedPresenceState = "idle" | "listening" | "thinking" | "speaking";

let current: SadeedPresenceState = "idle";
const listeners = new Set<(s: SadeedPresenceState) => void>();

export const sadeedState = {
  get(): SadeedPresenceState {
    return current;
  },
  set(next: SadeedPresenceState) {
    if (next === current) return;
    current = next;
    for (const l of listeners) l(next);
  },
  subscribe(fn: (s: SadeedPresenceState) => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

export function useSadeedPresenceState(): SadeedPresenceState {
  const [s, setS] = useState<SadeedPresenceState>(() => sadeedState.get());
  useEffect(() => sadeedState.subscribe(setS), []);
  return s;
}
