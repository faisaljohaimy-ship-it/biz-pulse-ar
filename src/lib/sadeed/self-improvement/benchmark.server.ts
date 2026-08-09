// Benchmark comparisons — no synthetic baselines; every benchmark carries evidence.
import type { Benchmark, BenchmarkComparison, EvidenceSample, TriState } from "./types";
import { BenchmarkComparisonInputZ, BenchmarkZ } from "./contracts";

export function createBenchmark(input: {
  id: string;
  subject: string;
  metric: string;
  baseline: number;
  capturedAt: string;
  evidence: Benchmark["evidence"];
}): Benchmark {
  return BenchmarkZ.parse(input);
}

export function compareBenchmark(input: {
  benchmark: Benchmark;
  sample: EvidenceSample | null;
  comparedAt: string;
}): BenchmarkComparison {
  BenchmarkComparisonInputZ.parse(input);
  if (!input.sample) {
    return {
      benchmarkId: input.benchmark.id,
      subject: input.benchmark.subject,
      metric: input.benchmark.metric,
      baseline: input.benchmark.baseline,
      observed: null,
      deltaPct: null,
      regression: false,
      state: "unknown",
      comparedAt: input.comparedAt,
      evidence: input.benchmark.evidence,
    };
  }
  const observed = input.sample.value;
  const baseline = input.benchmark.baseline;
  const deltaPct = baseline === 0 ? null : (observed - baseline) / Math.abs(baseline);
  // Regression semantics: any deviation worse than baseline for "lower is better" metrics
  // is caller-defined; here we conservatively mark deltaPct > 0 as regression candidate,
  // and leave severity to regression.server.
  const regression = deltaPct !== null && deltaPct > 0;
  const state: TriState = deltaPct === null ? "unknown" : regression ? "fail" : "pass";
  return {
    benchmarkId: input.benchmark.id,
    subject: input.benchmark.subject,
    metric: input.benchmark.metric,
    baseline,
    observed,
    deltaPct,
    regression,
    state,
    comparedAt: input.comparedAt,
    evidence: [...input.benchmark.evidence, ...input.sample.evidence],
  };
}
