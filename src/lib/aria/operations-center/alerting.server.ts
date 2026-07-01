// Alert generation from normalized signals. Deterministic, dedupe by signal id.
import type { Alert, NormalizedSignal, Severity } from "./types";

const ORDER: Severity[] = ["info", "low", "medium", "high", "critical"];

export function shouldAlert(sig: NormalizedSignal, minSeverity: Severity): boolean {
  if (sig.severity === "unknown" || minSeverity === "unknown") return false;
  return ORDER.indexOf(sig.severity) >= ORDER.indexOf(minSeverity);
}

let seq = 0;

export function buildAlert(sig: NormalizedSignal, openedAt: string): Alert {
  seq += 1;
  return {
    id: `alert_${seq}_${sig.id}`,
    signalId: sig.id,
    severity: sig.severity,
    priority: sig.priority,
    subject: sig.subject,
    detail: sig.detail,
    openedAt,
    evidence: sig.evidence,
  };
}

export function buildAlerts(
  signals: ReadonlyArray<NormalizedSignal>,
  minSeverity: Severity,
  openedAt: string,
): ReadonlyArray<Alert> {
  const out: Alert[] = [];
  const seen = new Set<string>();
  for (const s of signals) {
    if (seen.has(s.id)) continue;
    if (!shouldAlert(s, minSeverity)) continue;
    seen.add(s.id);
    out.push(buildAlert(s, openedAt));
  }
  return out;
}
