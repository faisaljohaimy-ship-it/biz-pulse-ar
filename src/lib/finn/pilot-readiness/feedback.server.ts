// Feedback capture — validated, evidence-linked.
import type { FeedbackItem } from "./types";
import { FeedbackItemZ } from "./contracts";

export function captureFeedback(f: FeedbackItem): FeedbackItem {
  return FeedbackItemZ.parse(f);
}

export function summarizeFeedback(all: ReadonlyArray<FeedbackItem>): {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  unknown: number;
  netScore: number; // -1..1
} {
  const pos = all.filter((f) => f.sentiment === "positive").length;
  const neg = all.filter((f) => f.sentiment === "negative").length;
  const neu = all.filter((f) => f.sentiment === "neutral").length;
  const unk = all.filter((f) => f.sentiment === "unknown").length;
  const denom = Math.max(1, pos + neg + neu);
  return {
    total: all.length,
    positive: pos,
    negative: neg,
    neutral: neu,
    unknown: unk,
    netScore: (pos - neg) / denom,
  };
}
