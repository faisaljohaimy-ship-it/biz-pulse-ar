import type { ExecutiveMode, ExecutivePresenceSnapshot } from "./types";

const R = new Map<string, ExecutivePresenceSnapshot>();

export function setExecutivePresence(
  id: string,
  mode: ExecutiveMode,
  visible = true,
): ExecutivePresenceSnapshot {
  const snap: ExecutivePresenceSnapshot = {
    mode,
    visible,
    attentive: mode !== "reporting",
    readyForQuestion: mode === "advisor" || mode === "listening",
    since: Date.now(),
  };
  R.set(id, snap);
  return snap;
}

export function getExecutivePresence(id: string): ExecutivePresenceSnapshot | null {
  return R.get(id) ?? null;
}

export function clearExecutivePresence(id: string): void {
  R.delete(id);
}
