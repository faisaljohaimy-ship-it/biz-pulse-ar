import type {
  BriefingItem,
  RecommendationItem,
  InsightItem,
  PriorityItem,
  DailySummary,
} from "./types";

export const EXECUTIVE_CONTRACTS = {
  BRIEFING_MAX_ITEMS: 5,
  PRIORITY_MAX_ITEMS: 7,
  RECOMMENDATION_MAX_ITEMS: 5,
  INSIGHT_MAX_ITEMS: 5,
  DAILY_MAX_BULLETS: 6,
  BRIEF_MAX_SENTENCES: 3,
  DETAILED_MAX_SENTENCES: 8,
} as const;

function requireBilingual(a: string, b: string, field: string): void {
  if (!a?.trim() || !b?.trim()) throw new Error(`${field} must be bilingual`);
}

export function assertBriefingItem(x: BriefingItem): void {
  requireBilingual(x.headline_ar, x.headline_en, "briefing headline");
  requireBilingual(x.detail_ar, x.detail_en, "briefing detail");
  if (x.evidence.length === 0) throw new Error(`briefing ${x.id} missing evidence`);
}

export function assertRecommendation(x: RecommendationItem): void {
  requireBilingual(x.action_ar, x.action_en, "recommendation action");
  requireBilingual(x.rationale_ar, x.rationale_en, "recommendation rationale");
  if (x.evidence.length === 0) throw new Error(`recommendation ${x.id} missing evidence`);
  if (x.confidence === "unknown") throw new Error(`recommendation ${x.id} unknown confidence`);
}

export function assertInsight(x: InsightItem): void {
  requireBilingual(x.headline_ar, x.headline_en, "insight headline");
  if (x.evidence.length === 0) throw new Error(`insight ${x.id} missing evidence`);
}

export function assertPriority(x: PriorityItem): void {
  requireBilingual(x.title_ar, x.title_en, "priority title");
  if (!Number.isFinite(x.score) || x.score < 0 || x.score > 100) {
    throw new Error(`priority ${x.id} score out of range`);
  }
}

export function assertDailySummary(x: DailySummary): void {
  requireBilingual(x.headline_ar, x.headline_en, "daily summary headline");
  if (x.bullets_ar.length !== x.bullets_en.length) {
    throw new Error("daily summary bullets must have bilingual parity");
  }
  if (x.bullets_ar.length > EXECUTIVE_CONTRACTS.DAILY_MAX_BULLETS) {
    throw new Error("too many daily summary bullets");
  }
}
