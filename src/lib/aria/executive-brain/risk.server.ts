/**
 * Risk Analyzer — normalizes model-reported risks into typed RiskSignal
 * rows, sorts by (probability × severity) and clamps score to [0,1].
 */
import type { RiskSignal } from "./types";
import type { ModelEnvelope } from "./contracts";

export function normalizeRisks(raw: ModelEnvelope["risks"]): RiskSignal[] {
  const rows: RiskSignal[] = raw.map((r) => {
    const probability = Math.max(0, Math.min(1, Number(r.probability) || 0));
    const severity = Math.max(0, Math.min(1, Number(r.severity) || 0));
    return {
      facet: r.facet,
      probability,
      severity,
      score: Math.max(0, Math.min(1, probability * severity)),
      title_en: r.title_en,
      title_ar: r.title_ar,
      mitigation_en: r.mitigation_en,
      mitigation_ar: r.mitigation_ar,
    };
  });
  return rows.sort((a, b) => b.score - a.score).slice(0, 6);
}
