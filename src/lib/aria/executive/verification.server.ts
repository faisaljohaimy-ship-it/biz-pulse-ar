import type { ExecutiveBriefing, RecommendationItem, InsightItem, DailySummary } from "./types";
import {
  assertBriefingItem,
  assertRecommendation,
  assertInsight,
  assertDailySummary,
} from "./contracts";

export interface ExecutiveVerification {
  readonly ok: boolean;
  readonly violations: readonly string[];
  readonly checkedAt: number;
}

export function verifyExecutiveSurface(input: {
  readonly briefing?: ExecutiveBriefing;
  readonly recommendations?: readonly RecommendationItem[];
  readonly insights?: readonly InsightItem[];
  readonly dailySummary?: DailySummary;
}): ExecutiveVerification {
  const v: string[] = [];
  const tryAll = <T>(arr: readonly T[] | undefined, fn: (x: T) => void, label: string) => {
    if (!arr) return;
    for (const x of arr) {
      try {
        fn(x);
      } catch (e) {
        v.push(`${label}: ${(e as Error).message}`);
      }
    }
  };
  if (input.briefing) tryAll(input.briefing.items, assertBriefingItem, "briefing");
  tryAll(input.recommendations, assertRecommendation, "recommendation");
  tryAll(input.insights, assertInsight, "insight");
  if (input.dailySummary) {
    try {
      assertDailySummary(input.dailySummary);
    } catch (e) {
      v.push(`daily: ${(e as Error).message}`);
    }
  }
  return { ok: v.length === 0, violations: v, checkedAt: Date.now() };
}
