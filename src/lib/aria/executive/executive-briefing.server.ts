import type { BriefingItem, EvidenceRef, ExecutiveBriefing, ExecutiveLanguage, Confidence } from "./types";
import { assertBriefingItem, EXECUTIVE_CONTRACTS } from "./contracts";

export interface BriefingSource {
  readonly id: string;
  readonly headline_ar: string;
  readonly headline_en: string;
  readonly detail_ar: string;
  readonly detail_en: string;
  readonly evidence: readonly EvidenceRef[];
}

export function composeBriefing(
  language: ExecutiveLanguage, sources: readonly BriefingSource[],
): ExecutiveBriefing {
  const filtered = sources.filter((s) => s.evidence.length > 0);
  const items: BriefingItem[] = filtered.slice(0, EXECUTIVE_CONTRACTS.BRIEFING_MAX_ITEMS)
    .map((s) => {
      const it: BriefingItem = {
        id: s.id,
        headline_ar: s.headline_ar, headline_en: s.headline_en,
        detail_ar: s.detail_ar, detail_en: s.detail_en,
        evidence: s.evidence,
      };
      assertBriefingItem(it);
      return it;
    });
  const confidence: Confidence =
    items.length === 0 ? "unknown"
    : items.every((i) => i.evidence.length >= 2) ? "high"
    : items.some((i) => i.evidence.length >= 2) ? "medium" : "low";
  return { issuedAt: Date.now(), language, items, confidence };
}
