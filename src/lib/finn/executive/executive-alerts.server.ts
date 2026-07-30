import type { AlertItem, EvidenceRef, Severity } from "./types";

export interface AlertSource {
  readonly id: string;
  readonly title_ar: string;
  readonly title_en: string;
  readonly severity: Severity;
  readonly evidence: readonly EvidenceRef[];
}

const ORDER: Record<Severity, number> = { critical: 3, warn: 2, watch: 1, info: 0 };

export function selectExecutiveAlerts(
  sources: readonly AlertSource[],
  limit = 5,
): readonly AlertItem[] {
  return sources
    .filter((s) => s.evidence.length > 0)
    .map(
      (s): AlertItem => ({
        id: s.id,
        severity: s.severity,
        title_ar: s.title_ar,
        title_en: s.title_en,
        evidence: s.evidence,
      }),
    )
    .sort((a, b) => ORDER[b.severity] - ORDER[a.severity])
    .slice(0, limit);
}
