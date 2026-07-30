/**
 * Benchmark samples.
 *
 * Benchmarks are recorded as raw samples. Aggregations are deterministic
 * pure functions over the collected samples.
 */

import type { BenchmarkSample, EvidenceRef, Severity } from "./types";

const SAMPLES: BenchmarkSample[] = [];

export interface BenchmarkInput {
  readonly label: string;
  readonly runtime_cost_ms: number;
  readonly token_cost: number;
  readonly latency_ms: number;
  readonly reliability: number;
  readonly risk: Severity;
  readonly evidence: readonly EvidenceRef[];
}

function benchId(label: string, ts: string): string {
  let h = 5381;
  const seed = `bench|${label}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `bench_${(h >>> 0).toString(16)}`;
}

export function recordBenchmark(input: BenchmarkInput): BenchmarkSample {
  const created_at = new Date().toISOString();
  const sample: BenchmarkSample = Object.freeze({
    id: benchId(input.label, created_at),
    created_at,
    label: input.label,
    runtime_cost_ms: input.runtime_cost_ms,
    token_cost: input.token_cost,
    latency_ms: input.latency_ms,
    reliability: input.reliability,
    risk: input.risk,
    evidence: Object.freeze([...input.evidence]) as readonly EvidenceRef[],
  });
  SAMPLES.push(sample);
  return sample;
}

export function listBenchmarks(): readonly BenchmarkSample[] {
  return SAMPLES.slice();
}

export function findBenchmark(id: string): BenchmarkSample | undefined {
  return SAMPLES.find((s) => s.id === id);
}
