import type { RecommendationItem, EvidenceRef, Priority, Confidence } from "./types";
import { assertRecommendation, EXECUTIVE_CONTRACTS } from "./contracts";

export interface RecommendationSource {
  readonly id: string;
  readonly action_ar: string;
  readonly action_en: string;
  readonly rationale_ar: string;
  readonly rationale_en: string;
  readonly evidence: readonly EvidenceRef[];
  readonly owner?: string;
  readonly dueBy?: string;
  readonly priority?: Priority;
}

// Never fabricates: requires evidence; drops sources without any.
export function composeRecommendations(
  sources: readonly RecommendationSource[],
): readonly RecommendationItem[] {
  const items: RecommendationItem[] = sources
    .filter((s) => s.evidence.length > 0)
    .slice(0, EXECUTIVE_CONTRACTS.RECOMMENDATION_MAX_ITEMS)
    .map((s) => {
      const conf: Confidence =
        s.evidence.length >= 3 ? "high" : s.evidence.length >= 2 ? "medium" : "low";
      const rec: RecommendationItem = {
        id: s.id,
        action_ar: s.action_ar,
        action_en: s.action_en,
        rationale_ar: s.rationale_ar,
        rationale_en: s.rationale_en,
        owner: s.owner,
        dueBy: s.dueBy,
        priority: s.priority ?? "medium",
        evidence: s.evidence,
        confidence: conf,
      };
      assertRecommendation(rec);
      return rec;
    });
  return items;
}
