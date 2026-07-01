/**
 * Pattern detection over the append-only experience store.
 *
 * Patterns are derived from real records only. When no window meets
 * the minimum sample size an empty result is returned; the engine
 * never fabricates a pattern.
 */

import type { EvidenceRef, PatternReport } from "./types";
import { listExperiences } from "./experience-store.server";
import { trendDelta } from "./scoring.server";

const MIN_WINDOW = 3;

function patternId(kind: string, ts: string): string {
  let h = 5381;
  const seed = `pat|${kind}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `pat_${(h >>> 0).toString(16)}`;
}

function toEvidence(ids: readonly string[]): readonly EvidenceRef[] {
  return Object.freeze(
    ids.map((id) => ({
      id,
      kind: "experience" as const,
      source: "evolution.experience-store",
      taken_at: new Date(0).toISOString(),
    })),
  ) as readonly EvidenceRef[];
}

export function detectPatterns(): readonly PatternReport[] {
  const all = listExperiences();
  if (all.length < MIN_WINDOW) return Object.freeze([]) as readonly PatternReport[];

  const created_at = new Date().toISOString();
  const reports: PatternReport[] = [];

  const failures = all.filter((r) => r.outcome === "failure");
  if (failures.length >= MIN_WINDOW) {
    reports.push({
      id: patternId("repeated_failure", created_at),
      created_at,
      kind: "repeated_failure",
      label: `Repeated failures observed (${failures.length}).`,
      window_size: all.length,
      observations: failures.length,
      delta: failures.length / all.length,
      evidence: toEvidence(failures.map((f) => f.id)),
    });
  }

  const successes = all.filter((r) => r.outcome === "success");
  if (successes.length >= MIN_WINDOW) {
    reports.push({
      id: patternId("repeated_success", created_at),
      created_at,
      kind: "repeated_success",
      label: `Repeated successes observed (${successes.length}).`,
      window_size: all.length,
      observations: successes.length,
      delta: successes.length / all.length,
      evidence: toEvidence(successes.map((s) => s.id)),
    });
  }

  const durations = all.map((r) => r.duration_ms);
  const latencyDelta = trendDelta(durations);
  if (latencyDelta !== 0) {
    reports.push({
      id: patternId("latency_trend", created_at),
      created_at,
      kind: "latency_trend",
      label:
        latencyDelta > 0
          ? "Duration trend increasing across recent executions."
          : "Duration trend decreasing across recent executions.",
      window_size: all.length,
      observations: durations.length,
      delta: latencyDelta,
      evidence: toEvidence(all.map((r) => r.id)),
    });
  }

  const tokens = all.map((r) => r.cost_tokens);
  const tokenDelta = trendDelta(tokens);
  if (tokenDelta !== 0) {
    reports.push({
      id: patternId("token_trend", created_at),
      created_at,
      kind: "token_trend",
      label:
        tokenDelta > 0
          ? "Token cost trend increasing."
          : "Token cost trend decreasing.",
      window_size: all.length,
      observations: tokens.length,
      delta: tokenDelta,
      evidence: toEvidence(all.map((r) => r.id)),
    });
  }

  return Object.freeze(reports) as readonly PatternReport[];
}
