// Phase 10.4 — Self-Improvement contracts. Zod validators for every entry.
import { z } from "zod";

export const EvidenceRefZ = z.object({
  source: z.string().min(1),
  ref: z.string().min(1),
  at: z.string().min(1),
});

export const EvidenceSampleZ = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  metric: z.string().min(1),
  value: z.number().finite(),
  unit: z.string().min(1),
  capturedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1, "evidence-linked required"),
});

export const CriterionZ = z.object({
  id: z.string().min(1),
  metric: z.string().min(1),
  target: z.number().finite(),
  comparator: z.enum(["lte", "gte", "eq"]),
  weight: z.number().min(0).max(1),
});

export const EvaluationInputZ = z.object({
  subject: z.string().min(1),
  criteria: z.array(CriterionZ).min(1),
  samples: z.array(EvidenceSampleZ).default([]),
  evaluatedAt: z.string().min(1),
});

export const BenchmarkZ = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  metric: z.string().min(1),
  baseline: z.number().finite(),
  capturedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const BenchmarkComparisonInputZ = z.object({
  benchmark: BenchmarkZ,
  sample: EvidenceSampleZ.nullable(),
  comparedAt: z.string().min(1),
});

export const RegressionInputZ = z.object({
  comparison: z.any(),
  threshold: z.object({
    warnPct: z.number().min(0).max(1).default(0.1),
    criticalPct: z.number().min(0).max(1).default(0.25),
  }),
});

export const GapInputZ = z.object({
  id: z.string().min(1),
  kind: z.enum(["knowledge", "capability", "performance", "quality", "reliability", "unknown"]),
  subject: z.string().min(1),
  detail: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical", "unknown"]),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const FailureCaseZ = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  category: z.string().min(1),
  occurrences: z.number().int().nonnegative(),
  firstSeenAt: z.string().min(1),
  lastSeenAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const FeedbackSignalZ = z.object({
  id: z.string().min(1),
  subject: z.string().min(1),
  channel: z.enum(["user", "operator", "automated", "unknown"]),
  polarity: z.enum(["positive", "negative", "neutral", "unknown"]),
  weight: z.number().min(0).max(1),
  capturedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const ScoringInputZ = z.object({
  impact: z.number().min(0).max(1),
  effort: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
  evidenceCount: z.number().int().nonnegative(),
});

export const ProposalInputZ = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().min(1),
  gapIds: z.array(z.string().min(1)).default([]),
  hypothesis: z.string().min(1),
  proposedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const RecommendationInputZ = z.object({
  id: z.string().min(1),
  proposalId: z.string().min(1),
  summary: z.string().min(1),
  requiredApprovals: z.array(z.string().min(1)).min(1),
  issuedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const AbVariantZ = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  samples: z.array(EvidenceSampleZ).default([]),
});

export const AbInputZ = z.object({
  experimentId: z.string().min(1),
  variants: z.array(AbVariantZ).min(2),
  minSamplesPerVariant: z.number().int().positive().default(10),
});

export const QualitySignalZ = z.object({
  subject: z.string().min(1),
  dimension: z.enum(["accuracy", "helpfulness", "safety", "latency", "cost"]),
  value: z.number().finite(),
  unit: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const ApprovalInputZ = z.object({
  proposalId: z.string().min(1),
  approverId: z.string().min(1),
  decision: z.enum(["approve", "reject", "defer", "unknown"]),
  justification: z.string().min(1),
  decidedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const RoadmapInputZ = z.object({
  generatedAt: z.string().min(1),
  entries: z.array(
    z.object({
      rank: z.number().int().positive(),
      proposalId: z.string().min(1),
      recommendationId: z.string().nullable(),
      targetQuarter: z.string().min(1),
      composite: z.number().min(0).max(1),
      confidence: z.enum(["low", "medium", "high", "unknown"]),
    }),
  ),
});
