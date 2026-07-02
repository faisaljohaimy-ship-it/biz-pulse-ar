// Deterministic metrics derived from the audit log.
import type { I18nMetricsSnapshot } from "./types";
import { auditHistory } from "./audit.server";

export function metricsSnapshot(): I18nMetricsSnapshot {
  const entries = auditHistory(undefined, 500);
  let ar = 0, en = 0, last: number | null = null;
  for (const e of entries) {
    if (e.to === "ar") ar++; else en++;
    last = e.at;
  }
  return {
    totalSwitches: entries.length,
    arActive: ar,
    enActive: en,
    lastSwitchAt: last,
  };
}
