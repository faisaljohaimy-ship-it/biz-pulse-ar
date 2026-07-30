// End-to-end Self-Improvement pipeline orchestrator.
// collect evidence → evaluate → benchmark → detect gaps → score →
// prioritize → recommend → human approval → roadmap → audit → verify.
// Never mutates production code paths. All inputs are caller-supplied and
// carry evidence.

import type {
  AbResult,
  AbVariant,
  ApprovalRecord,
  Benchmark,
  BenchmarkComparison,
  EvaluationCriterion,
  EvaluationReport,
  EvidenceSample,
  FailureCase,
  FeedbackSignal,
  Gap,
  ImprovementProposal,
  QualitySignal,
  Recommendation,
  RegressionFinding,
  RoadmapEntry,
  SelfImprovementReport,
} from "./types";
import { createEvidenceStore } from "./evidence.server";
import { evaluateSubject } from "./evaluation.server";
import { compareBenchmark } from "./benchmark.server";
import { detectRegression } from "./regression.server";
import { detectKnowledgeGaps } from "./knowledge-gap.server";
import { detectPerformanceGaps } from "./performance-gap.server";
import { analyzeFailures } from "./failure-analysis.server";
import { summarizeFeedback } from "./feedback.server";
import { summarizeQuality } from "./quality.server";
import { analyzeAb } from "./ab-testing.server";
import { scoreImprovement } from "./scoring.server";
import { buildProposal } from "./improvement.server";
import { prioritizeProposals } from "./prioritization.server";
import { issueRecommendation } from "./recommendation.server";
import { applyApproval } from "./approval.server";
import { buildRoadmap } from "./roadmap.server";
import { createAuditLog } from "./audit.server";
import { computeMetrics } from "./metrics.server";
import { assembleReport } from "./verification.server";

export interface EvaluationSpec {
  readonly subject: string;
  readonly criteria: ReadonlyArray<EvaluationCriterion>;
}

export interface ProposalDraft {
  readonly id: string;
  readonly title: string;
  readonly subject: string;
  readonly hypothesis: string;
  readonly gapIds: ReadonlyArray<string>;
  readonly impact: number;
  readonly effort: number;
  readonly risk: number;
  readonly recommendationSummary: string;
  readonly requiredApprovals: ReadonlyArray<string>;
}

export interface AbExperimentSpec {
  readonly experimentId: string;
  readonly variants: ReadonlyArray<AbVariant>;
  readonly minSamplesPerVariant?: number;
}

export interface SelfImprovementPipelineInput {
  readonly evidence: ReadonlyArray<EvidenceSample>;
  readonly evaluations: ReadonlyArray<EvaluationSpec>;
  readonly benchmarks: ReadonlyArray<Benchmark>;
  readonly regressionThresholds: { warnPct: number; criticalPct: number };
  readonly requiredMetricsPerSubject: ReadonlyArray<string>;
  readonly minPerformanceScore: number;
  readonly failureCases: ReadonlyArray<FailureCase>;
  readonly feedback: ReadonlyArray<FeedbackSignal>;
  readonly qualitySignals: ReadonlyArray<QualitySignal>;
  readonly abExperiments: ReadonlyArray<AbExperimentSpec>;
  readonly proposalDrafts: ReadonlyArray<ProposalDraft>;
  readonly approvals: ReadonlyArray<ApprovalRecord>;
  readonly quarterAssign?: (proposal: ImprovementProposal, rank: number) => string;
  readonly now: string;
}

export interface SelfImprovementPipelineOutput {
  readonly report: SelfImprovementReport;
}

export function runSelfImprovementPipeline(
  input: SelfImprovementPipelineInput,
): SelfImprovementPipelineOutput {
  const audit = createAuditLog();

  // 1. evidence
  const store = createEvidenceStore();
  for (const s of input.evidence) store.ingest(s);
  audit.append({
    at: input.now,
    stage: "evidence",
    status: input.evidence.length > 0 ? "pass" : "unknown",
    detail: `samples=${input.evidence.length}`,
  });

  // 2. evaluations
  const evaluations: EvaluationReport[] = input.evaluations.map((spec) =>
    evaluateSubject({
      subject: spec.subject,
      criteria: spec.criteria,
      samples: store.bySubject(spec.subject),
      evaluatedAt: input.now,
    }),
  );
  audit.append({
    at: input.now,
    stage: "evaluate",
    status: "pass",
    detail: `evaluations=${evaluations.length}`,
  });

  // 3. benchmarks + regressions
  const comparisons: BenchmarkComparison[] = input.benchmarks.map((b) =>
    compareBenchmark({
      benchmark: b,
      sample: store.latest(b.subject, b.metric),
      comparedAt: input.now,
    }),
  );
  const regressions: RegressionFinding[] = [];
  for (const c of comparisons) {
    const r = detectRegression({
      comparison: c,
      thresholds: input.regressionThresholds,
      detectedAt: input.now,
    });
    if (r) regressions.push(r);
  }
  audit.append({
    at: input.now,
    stage: "benchmark",
    status: "pass",
    detail: `comparisons=${comparisons.length} regressions=${regressions.length}`,
  });

  // 4. gaps
  const knowledgeGaps = detectKnowledgeGaps({
    subjects: [...new Set(input.evaluations.map((e) => e.subject))],
    requiredMetrics: input.requiredMetricsPerSubject,
    samples: input.evidence,
    detectedAt: input.now,
  });
  const performanceGaps = detectPerformanceGaps({
    evaluations,
    minScore: input.minPerformanceScore,
  });
  const gaps: Gap[] = [...knowledgeGaps, ...performanceGaps];
  audit.append({
    at: input.now,
    stage: "detect_gaps",
    status: "pass",
    detail: `knowledge=${knowledgeGaps.length} performance=${performanceGaps.length}`,
  });

  // 5. failure + feedback + quality context (audit-only)
  const failureBuckets = analyzeFailures({ cases: input.failureCases });
  audit.append({
    at: input.now,
    stage: "failure_analysis",
    status: "pass",
    detail: `buckets=${failureBuckets.length}`,
  });

  const feedbackSubjects = [...new Set(input.feedback.map((f) => f.subject))];
  for (const subject of feedbackSubjects) {
    const summary = summarizeFeedback({ subject, signals: input.feedback });
    audit.append({
      at: input.now,
      stage: "feedback",
      status: "pass",
      detail: `subject=${subject} net=${summary.netScore.toFixed(2)}`,
    });
  }

  const qualitySubjects = [...new Set(input.qualitySignals.map((q) => q.subject))];
  for (const subject of qualitySubjects) {
    const q = summarizeQuality({ subject, signals: input.qualitySignals });
    audit.append({
      at: input.now,
      stage: "quality",
      status: q.state,
      detail: `subject=${subject}`,
    });
  }

  // 6. A/B analysis
  const abResults: AbResult[] = input.abExperiments.map((exp) =>
    analyzeAb({
      experimentId: exp.experimentId,
      variants: exp.variants,
      minSamplesPerVariant: exp.minSamplesPerVariant,
      evaluatedAt: input.now,
    }),
  );

  // 7. score + build proposals
  const gapById = new Map(gaps.map((g) => [g.id, g] as const));
  const proposalsUnsorted: ImprovementProposal[] = [];
  const recommendations: Recommendation[] = [];

  for (const draft of input.proposalDrafts) {
    const relevantGaps = draft.gapIds
      .map((id) => gapById.get(id))
      .filter((g): g is Gap => Boolean(g));
    const evidenceCount = relevantGaps.reduce((acc, g) => acc + g.evidence.length, 0);
    const score = scoreImprovement({
      impact: draft.impact,
      effort: draft.effort,
      risk: draft.risk,
      evidenceCount,
    });
    let proposal: ImprovementProposal | null = null;
    try {
      proposal = buildProposal({
        id: draft.id,
        title: draft.title,
        subject: draft.subject,
        gaps: relevantGaps,
        hypothesis: draft.hypothesis,
        score,
        proposedAt: input.now,
      });
    } catch {
      audit.append({
        at: input.now,
        stage: "propose",
        status: "unknown",
        detail: `no_evidence_gap:${draft.id}`,
      });
      continue;
    }
    proposalsUnsorted.push(proposal);
    const rec = issueRecommendation({
      proposal,
      summary: draft.recommendationSummary,
      requiredApprovals: draft.requiredApprovals,
      issuedAt: input.now,
    });
    if (rec) recommendations.push(rec);
  }

  // 8. prioritize
  const proposals = prioritizeProposals(proposalsUnsorted);
  audit.append({
    at: input.now,
    stage: "prioritize",
    status: "pass",
    detail: `proposals=${proposals.length}`,
  });

  // 9. apply approvals (human-in-the-loop)
  const approvedProposals: ImprovementProposal[] = proposals.map((p) => {
    const approvalsForP = input.approvals.filter((a) => a.proposalId === p.id);
    let cur = p;
    for (const a of approvalsForP) cur = applyApproval(cur, a);
    return cur;
  });
  audit.append({
    at: input.now,
    stage: "approval",
    status: input.approvals.length > 0 ? "pass" : "unknown",
    detail: `approvals=${input.approvals.length}`,
  });

  // 10. roadmap (only approved)
  const approvedOnly = approvedProposals.filter((p) => p.status === "approved");
  const roadmap = buildRoadmap({
    approvedProposals: approvedOnly,
    recommendations,
    quarterAssign:
      input.quarterAssign ??
      ((_p: ImprovementProposal, rank: number) => `Q${((rank - 1) % 4) + 1}`),
    generatedAt: input.now,
  });
  audit.append({
    at: input.now,
    stage: "roadmap",
    status: roadmap.entries.length > 0 ? "pass" : "unknown",
    detail: `entries=${roadmap.entries.length}`,
  });

  // 11. metrics + verified report
  const metrics = computeMetrics({
    evidence: input.evidence,
    evaluations,
    comparisons,
    regressions,
    gaps,
    proposals: approvedProposals,
    recommendations,
    approvals: input.approvals,
    roadmap,
  });

  const report = assembleReport({
    report: {
      evaluations,
      comparisons,
      regressions,
      gaps,
      failureCases: input.failureCases,
      feedback: input.feedback,
      proposals: approvedProposals,
      recommendations,
      abResults,
      approvals: input.approvals,
      roadmap,
      metrics,
      audit: audit.entries(),
      generatedAt: input.now,
    },
  });

  return { report };
}

export type { RoadmapEntry };
