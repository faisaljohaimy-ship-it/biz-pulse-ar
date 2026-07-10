/**
 * Home greeting store — tiny external store wiring the homepage greeting
 * button to the HomeVideoBackdrop video (which carries ARIA's voice track).
 *
 * The backdrop registers itself as the controller; the button calls
 * start/stop and renders from the shared state. No context provider, no
 * prop drilling — same pattern as intro-store.
 */
import { useSyncExternalStore } from "react";

export type HomeGreetingState = "idle" | "speaking";

interface HomeGreetingController {
  start: () => void;
  stop: () => void;
}

let state: HomeGreetingState = "idle";
let controller: HomeGreetingController | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Called by HomeVideoBackdrop to expose play/stop over its video element. */
export function registerHomeGreeting(c: HomeGreetingController): () => void {
  controller = c;
  return () => {
    if (controller === c) controller = null;
    setHomeGreetingState("idle");
  };
}

/** Called by the controller when playback actually starts/ends. */
export function setHomeGreetingState(next: HomeGreetingState) {
  if (state === next) return;
  state = next;
  emit();
}

export function startHomeGreeting() {
  controller?.start();
}

export function stopHomeGreeting() {
  controller?.stop();
}

export function useHomeGreetingState(): HomeGreetingState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => "idle" as const,
  );
}
