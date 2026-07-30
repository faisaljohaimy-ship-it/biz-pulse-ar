/**
 * Escalation registry — records escalations for critical/blocked decisions.
 */
import type { AuthorityLevel, EscalationEntry } from "./types";
import { record } from "./audit-trail.server";
import { incr } from "./metrics.server";

const store = new Map<string, EscalationEntry>();

export function escalate(input: {
  action_id: string;
  level: AuthorityLevel;
  reason: string;
}): EscalationEntry {
  const e: EscalationEntry = {
    id: `esc_${Date.now().toString(36)}_${store.size.toString(36)}`,
    action_id: input.action_id,
    level: input.level,
    reason: input.reason,
    created_at: new Date().toISOString(),
  };
  store.set(e.id, e);
  record({
    action_id: input.action_id,
    stage: "escalation",
    actor: "governance",
    ok: true,
    detail: `to=${input.level} reason=${input.reason}`,
  });
  incr(`gov.escalation.${input.level}`);
  return e;
}

export function acknowledgeEscalation(id: string, operator_id: string): EscalationEntry | null {
  const cur = store.get(id);
  if (!cur || cur.acknowledged_at) return cur ?? null;
  const updated: EscalationEntry = {
    ...cur,
    acknowledged_at: new Date().toISOString(),
    acknowledged_by: operator_id,
  };
  store.set(id, updated);
  record({
    action_id: cur.action_id,
    stage: "escalation.ack",
    actor: operator_id,
    ok: true,
  });
  return updated;
}

export function listOpen(): readonly EscalationEntry[] {
  return Array.from(store.values()).filter((e) => !e.acknowledged_at);
}
