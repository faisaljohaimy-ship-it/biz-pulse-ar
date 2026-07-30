// Acceptance signals — append-only ring buffer of experiential events.
import type { AcceptanceSignal } from "./types";

const MAX = 300;
const SIGNALS = new Map<string, AcceptanceSignal[]>();

export function recordAcceptanceSignal(
  id: string,
  kind: AcceptanceSignal["kind"],
  detail?: Record<string, unknown>,
): AcceptanceSignal {
  const sig: AcceptanceSignal = { kind, ts: Date.now(), detail };
  const list = SIGNALS.get(id) ?? [];
  list.push(sig);
  if (list.length > MAX) list.shift();
  SIGNALS.set(id, list);
  return sig;
}

export function acceptanceSignals(id: string, n = 50): readonly AcceptanceSignal[] {
  const list = SIGNALS.get(id) ?? [];
  return list.slice(-n);
}

export function acceptanceScore(id: string): number {
  const list = SIGNALS.get(id) ?? [];
  let score = 0;
  for (const s of list) {
    if (s.kind === "greeting_delivered") score += 10;
    else if (s.kind === "user_response") score += 15;
    else if (s.kind === "step_completed") score += 20;
    else if (s.kind === "handoff") score += 5;
    else if (s.kind === "clarification_needed") score -= 2;
    else if (s.kind === "disengagement") score -= 10;
  }
  return score;
}
