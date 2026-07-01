/**
 * Phase 8.6 — Evidence collection. Consumes ONLY seeded evidence
 * supplied by the caller (typically the Planner via Context Engine).
 * Never fabricates evidence, never opens network or database
 * connections.
 */
import type { Evidence } from "./types";
import type { ReasonInputParsed } from "./contracts";
import { clamp01, confidence, nowIso, shortId } from "./util";

export interface EvidenceReport {
  evidence: Evidence[];
  quality: number; // 0..1 aggregate quality
  reasoning: string;
}

export function collectEvidence(input: ReasonInputParsed): EvidenceReport {
  const now = Date.now();
  const evidence: Evidence[] = input.seed_evidence.map((seed) => {
    const freshnessScore = freshnessToScore(seed.freshness_ms);
    const weight = clamp01(0.35 * freshnessScore + 0.65 * seed.reliability);
    return {
      id: shortId("ev"),
      claim: seed.claim,
      source: seed.source,
      source_kind: seed.source_kind,
      weight,
      freshness_ms: seed.freshness_ms,
      reliability: seed.reliability,
      supports: "mixed",
      reasoning: `weight = 0.35 * freshness (${freshnessScore.toFixed(2)}) + 0.65 * reliability (${seed.reliability.toFixed(2)})`,
      collected_at: nowIso(),
    };
  });

  const quality =
    evidence.length === 0
      ? 0
      : evidence.reduce((sum, e) => sum + e.weight, 0) / evidence.length;

  return {
    evidence,
    quality,
    reasoning:
      evidence.length === 0
        ? "No evidence supplied — confidence must be treated as very low."
        : `Aggregated ${evidence.length} seed items into weighted evidence set.`,
  };

  void now; // retained for potential future decay tuning
}

export function scoreEvidenceAgainstClaim(
  evidence: Evidence[],
  claim: string,
): { supporting: Evidence[]; opposing: Evidence[]; weight: number } {
  const terms = tokenize(claim);
  if (terms.length === 0) {
    return { supporting: [], opposing: [], weight: 0 };
  }
  const supporting: Evidence[] = [];
  const opposing: Evidence[] = [];
  for (const e of evidence) {
    const overlap = overlapScore(terms, tokenize(e.claim));
    if (overlap >= 0.35) supporting.push(e);
    else if (overlap >= 0.15) opposing.push(e); // marginal / possibly opposing
  }
  const weight =
    supporting.reduce((s, e) => s + e.weight, 0) -
    0.5 * opposing.reduce((s, e) => s + e.weight, 0);
  return { supporting, opposing, weight: clamp01(weight) };
}

export function evidenceConfidence(evidence: Evidence[]) {
  if (evidence.length === 0) {
    return confidence(0.1, "no evidence available");
  }
  const avg = evidence.reduce((s, e) => s + e.weight, 0) / evidence.length;
  return confidence(
    clamp01(0.3 + 0.7 * avg),
    `aggregate weight across ${evidence.length} items`,
    evidence.map((e) => e.id),
  );
}

function freshnessToScore(ms: number | null): number {
  if (ms === null) return 0.4;
  const hours = ms / 3_600_000;
  if (hours <= 1) return 1;
  if (hours <= 24) return 0.85;
  if (hours <= 24 * 7) return 0.6;
  if (hours <= 24 * 30) return 0.4;
  return 0.2;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function overlapScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const bs = new Set(b);
  const hits = a.reduce((n, w) => n + (bs.has(w) ? 1 : 0), 0);
  return hits / a.length;
}
