// Failure analysis — deterministic aggregation of caller-supplied failure cases.
import type { FailureCase } from "./types";
import { FailureCaseZ } from "./contracts";

export interface FailureBucket {
  readonly subject: string;
  readonly category: string;
  readonly occurrences: number;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly evidence: FailureCase["evidence"];
}

export function analyzeFailures(input: {
  cases: ReadonlyArray<FailureCase>;
}): ReadonlyArray<FailureBucket> {
  const buckets = new Map<string, FailureBucket>();
  for (const raw of input.cases) {
    const c = FailureCaseZ.parse(raw);
    const key = `${c.subject}::${c.category}`;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        subject: c.subject,
        category: c.category,
        occurrences: c.occurrences,
        firstSeenAt: c.firstSeenAt,
        lastSeenAt: c.lastSeenAt,
        evidence: c.evidence,
      });
    } else {
      buckets.set(key, {
        subject: c.subject,
        category: c.category,
        occurrences: existing.occurrences + c.occurrences,
        firstSeenAt:
          Date.parse(existing.firstSeenAt) <= Date.parse(c.firstSeenAt)
            ? existing.firstSeenAt
            : c.firstSeenAt,
        lastSeenAt:
          Date.parse(existing.lastSeenAt) >= Date.parse(c.lastSeenAt)
            ? existing.lastSeenAt
            : c.lastSeenAt,
        evidence: [...existing.evidence, ...c.evidence],
      });
    }
  }
  return [...buckets.values()].sort((a, b) => b.occurrences - a.occurrences);
}
