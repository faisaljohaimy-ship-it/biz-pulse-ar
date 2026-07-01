// Performance-gap detector — flags subjects whose evaluation score is below target.
import type { EvaluationReport, Gap } from "./types";
import { GapInputZ } from "./contracts";

let seq = 0;

export function detectPerformanceGaps(input: {
  evaluations: ReadonlyArray<EvaluationReport>;
  minScore: number; // 0..1
}): ReadonlyArray<Gap> {
  const gaps: Gap[] = [];
  for (const ev of input.evaluations) {
    if (ev.overall === "unknown") continue;
    if (ev.score >= input.minScore) continue;
    seq += 1;
    const severity: Gap["severity"] =
      ev.score < input.minScore / 2 ? "high" : "medium";
    gaps.push(
      GapInputZ.parse({
        id: `gap_perf_${seq}`,
        kind: "performance",
        subject: ev.subject,
        detail: `score=${ev.score.toFixed(3)} < ${input.minScore}`,
        severity,
        evidence:
          ev.evidence.length > 0
            ? ev.evidence
            : [
                {
                  source: "self-improvement.performance-gap",
                  ref: `${ev.subject}:${ev.evaluatedAt}`,
                  at: ev.evaluatedAt,
                },
              ],
      }),
    );
  }
  return gaps;
}
