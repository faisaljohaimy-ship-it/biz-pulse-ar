import type { PriorityItem, Priority, EvidenceRef } from "./types";
import { assertPriority, EXECUTIVE_CONTRACTS } from "./contracts";

export interface PrioritySource {
  readonly id: string;
  readonly title_ar: string;
  readonly title_en: string;
  readonly severity: "info" | "watch" | "warn" | "critical";
  readonly impact: number; // 0..100
  readonly urgency: number; // 0..100
  readonly evidence: readonly EvidenceRef[];
}

function levelForScore(score: number): Priority {
  if (score >= 85) return "urgent";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function rankPriorities(sources: readonly PrioritySource[]): readonly PriorityItem[] {
  const scored = sources
    .filter((s) => s.evidence.length > 0)
    .map((s) => {
      const sevBoost =
        s.severity === "critical"
          ? 20
          : s.severity === "warn"
            ? 10
            : s.severity === "watch"
              ? 5
              : 0;
      const score = Math.min(
        100,
        Math.max(0, Math.round(s.impact * 0.5 + s.urgency * 0.5) + sevBoost),
      );
      const item: PriorityItem = {
        id: s.id,
        title_ar: s.title_ar,
        title_en: s.title_en,
        priority: levelForScore(score),
        score,
        evidence: s.evidence,
      };
      assertPriority(item);
      return item;
    });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, EXECUTIVE_CONTRACTS.PRIORITY_MAX_ITEMS);
}
