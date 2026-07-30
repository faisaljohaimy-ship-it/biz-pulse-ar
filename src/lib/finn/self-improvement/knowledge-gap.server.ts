// Knowledge-gap detector. Emits Gap records from missing evidence per subject.
import type { Gap, EvidenceSample } from "./types";
import { GapInputZ } from "./contracts";

let seq = 0;

export function detectKnowledgeGaps(input: {
  subjects: ReadonlyArray<string>;
  requiredMetrics: ReadonlyArray<string>;
  samples: ReadonlyArray<EvidenceSample>;
  detectedAt: string;
}): ReadonlyArray<Gap> {
  const gaps: Gap[] = [];
  for (const subject of input.subjects) {
    for (const metric of input.requiredMetrics) {
      const covered = input.samples.some((s) => s.subject === subject && s.metric === metric);
      if (covered) continue;
      seq += 1;
      const gap = {
        id: `gap_knowledge_${seq}`,
        kind: "knowledge" as const,
        subject,
        detail: `missing_metric:${metric}`,
        severity: "medium" as const,
        evidence: [
          {
            source: "self-improvement.knowledge-gap",
            ref: `${subject}:${metric}:${input.detectedAt}`,
            at: input.detectedAt,
          },
        ],
      };
      gaps.push(GapInputZ.parse(gap));
    }
  }
  return gaps;
}
