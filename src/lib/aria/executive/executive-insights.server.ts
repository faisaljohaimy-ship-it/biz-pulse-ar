import type { InsightItem, EvidenceRef, Confidence } from "./types";
import { assertInsight, EXECUTIVE_CONTRACTS } from "./contracts";

export interface InsightSource {
  readonly id: string;
  readonly headline_ar: string;
  readonly headline_en: string;
  readonly reasoning_ar: string;
  readonly reasoning_en: string;
  readonly evidence: readonly EvidenceRef[];
}

export function generateInsights(sources: readonly InsightSource[]): readonly InsightItem[] {
  const items: InsightItem[] = sources
    .filter((s) => s.evidence.length > 0)
    .slice(0, EXECUTIVE_CONTRACTS.INSIGHT_MAX_ITEMS)
    .map((s) => {
      const conf: Confidence =
        s.evidence.length >= 3 ? "high" : s.evidence.length >= 2 ? "medium" : "low";
      const it: InsightItem = { ...s, confidence: conf };
      assertInsight(it);
      return it;
    });
  return items;
}
