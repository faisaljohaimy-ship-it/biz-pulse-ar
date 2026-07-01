// Feedback aggregator — weighted polarity by channel.
import type { FeedbackSignal } from "./types";
import { FeedbackSignalZ } from "./contracts";

export interface FeedbackSummary {
  readonly subject: string;
  readonly positive: number;
  readonly negative: number;
  readonly neutral: number;
  readonly unknown: number;
  readonly netScore: number; // -1..1; 0 when no signals
  readonly evidence: FeedbackSignal["evidence"];
}

export function summarizeFeedback(input: {
  subject: string;
  signals: ReadonlyArray<FeedbackSignal>;
}): FeedbackSummary {
  let pos = 0;
  let neg = 0;
  let neu = 0;
  let unk = 0;
  const evidence: Array<FeedbackSignal["evidence"][number]> = [];
  for (const raw of input.signals) {
    const s = FeedbackSignalZ.parse(raw);
    if (s.subject !== input.subject) continue;
    if (s.polarity === "positive") pos += s.weight;
    else if (s.polarity === "negative") neg += s.weight;
    else if (s.polarity === "neutral") neu += s.weight;
    else unk += s.weight;
    for (const e of s.evidence) evidence.push(e);
  }
  const total = pos + neg + neu + unk;
  const netScore = total === 0 ? 0 : (pos - neg) / Math.max(1, pos + neg + neu);
  return {
    subject: input.subject,
    positive: pos,
    negative: neg,
    neutral: neu,
    unknown: unk,
    netScore,
    evidence,
  };
}
