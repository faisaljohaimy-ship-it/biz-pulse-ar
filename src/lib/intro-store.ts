/**
 * Tiny external store so any component (root shell, watermark, greeter) can
 * subscribe to "is the Hero-Zero intro currently on screen?" without prop
 * drilling and without pulling in a full context provider.
 *
 * The intro overlay calls `setIntroActive(true)` on mount and `false` on
 * unmount / skip. Consumers use `useIntroActive()`.
 */
import { useSyncExternalStore } from "react";

let active = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setIntroActive(next: boolean) {
  if (active === next) return;
  active = next;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return active;
}

function getServerSnapshot() {
  return false;
}

export function useIntroActive() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
