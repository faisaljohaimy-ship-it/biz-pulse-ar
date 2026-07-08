// Escalation ladder. Deterministic role progression by severity.
import type { Alert, EscalationHop, EscalationRecord, OperatorRole, Severity } from "./types";

const LADDER: OperatorRole[] = ["operator", "supervisor", "director", "executive", "board"];

const START_INDEX: Record<Severity, number> = {
  info: 0,
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
  unknown: 0,
};

let seq = 0;

export function buildEscalation(alert: Alert, at: string): EscalationRecord {
  seq += 1;
  const startIdx = START_INDEX[alert.severity] ?? 0;
  const start = LADDER[startIdx];
  const hops: EscalationHop[] = [{ toRole: start, at, reason: `initial:${alert.severity}` }];
  return {
    id: `esc_${seq}_${alert.id}`,
    alertId: alert.id,
    currentRole: start,
    hops,
    resolvedAt: null,
    evidence: alert.evidence,
  };
}

export function escalate(rec: EscalationRecord, at: string, reason: string): EscalationRecord {
  const idx = LADDER.indexOf(rec.currentRole);
  if (idx < 0 || idx >= LADDER.length - 1) return rec;
  const next = LADDER[idx + 1];
  return {
    ...rec,
    currentRole: next,
    hops: [...rec.hops, { toRole: next, at, reason }],
  };
}

export function resolveEscalation(rec: EscalationRecord, at: string): EscalationRecord {
  return { ...rec, resolvedAt: at };
}
