// Metrics aggregator.
import type {
  ApprovalRecord,
  BenchmarkComparison,
  EvaluationReport,
  EvidenceSample,
  Gap,
  ImprovementProposal,
  Recommendation,
  RegressionFinding,
  Roadmap,
  SelfImprovementMetrics,
} from "./types";

const CONF: Record<string, number> = { high: 1, medium: 0.66, low: 0.33, unknown: 0 };

export function computeMetrics(input: {
  evidence: ReadonlyArray<EvidenceSample>;
  evaluations: ReadonlyArray<EvaluationReport>;
  comparisons: ReadonlyArray<BenchmarkComparison>;
  regressions: ReadonlyArray<RegressionFinding>;
  gaps: ReadonlyArray<Gap>;
  proposals: ReadonlyArray<ImprovementProposal>;
  recommendations: ReadonlyArray<Recommendation>;
  approvals: ReadonlyArray<ApprovalRecord>;
  roadmap: Roadmap;
}): SelfImprovementMetrics {
  const approvals = input.approvals.filter((a) => a.decision === "approve").length;
  const rejections = input.approvals.filter((a) => a.decision === "reject").length;
  const confidences = input.proposals.map((p) => CONF[p.score.confidence] ?? 0);
  const avg =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
  return {
    evidenceCount: input.evidence.length,
    evaluations: input.evaluations.length,
    benchmarks: input.comparisons.length,
    regressions: input.regressions.length,
    gaps: input.gaps.length,
    proposals: input.proposals.length,
    recommendations: input.recommendations.length,
    approvals,
    rejections,
    roadmapEntries: input.roadmap.entries.length,
    avgConfidence: avg,
  };
}
