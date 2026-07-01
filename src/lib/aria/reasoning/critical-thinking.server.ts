/**
 * Phase 8.6 — Critical thinking pass. Checks logical consistency,
 * detects common biases, circular reasoning, and unsupported claims.
 * Pure static analysis over the reasoning artifacts.
 */
import type { Evidence, Hypothesis, ReasoningContext } from "./types";

export interface CriticalReport {
  logical_consistency: boolean;
  contradictions: Array<{ a: string; b: string; reason: string }>;
  bias_flags: string[];
  circular_flags: string[];
  unsupported_claims: string[];
  reasoning: string;
}

const BIAS_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "confirmation_bias", pattern: /always|never|obviously|clearly/i },
  { label: "recency_bias", pattern: /recent|latest|just\s+happened/i },
  { label: "availability_bias", pattern: /well[-\s]?known|everyone\s+knows/i },
  { label: "anchoring_bias", pattern: /baseline|our\s+usual/i },
  { label: "sunk_cost", pattern: /already\s+invested|we\s+spent/i },
];

const NEGATION = /\b(not|no|never|بدون|لا|لن|لم)\b/i;

export function criticalReview(
  context: ReasoningContext,
  hypotheses: Hypothesis[],
  evidence: Evidence[],
): CriticalReport {
  const contradictions = findContradictions(hypotheses);
  const bias = findBiases([context.question, ...hypotheses.map((h) => h.statement)]);
  const circular = findCircular(hypotheses);
  const unsupported = findUnsupported(hypotheses, evidence);

  const ok = contradictions.length === 0 && circular.length === 0 && unsupported.length === 0;

  return {
    logical_consistency: contradictions.length === 0,
    contradictions,
    bias_flags: Array.from(bias),
    circular_flags: circular,
    unsupported_claims: unsupported,
    reasoning: ok
      ? "Static checks pass: no contradictions, circularity, or unsupported claims detected."
      : `Static checks flagged issues: contradictions=${contradictions.length}, ` +
        `bias=${bias.size}, circular=${circular.length}, unsupported=${unsupported.length}.`,
  };
}

function findContradictions(list: Hypothesis[]): Array<{ a: string; b: string; reason: string }> {
  const results: Array<{ a: string; b: string; reason: string }> = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!.statement;
      const b = list[j]!.statement;
      const na = NEGATION.test(a);
      const nb = NEGATION.test(b);
      if (na === nb) continue;
      const stripA = a.replace(NEGATION, "").toLowerCase();
      const stripB = b.replace(NEGATION, "").toLowerCase();
      if (similarity(stripA, stripB) > 0.6) {
        results.push({ a, b, reason: "polar opposition detected on similar claim" });
      }
    }
  }
  return results;
}

function findBiases(texts: string[]): Set<string> {
  const flags = new Set<string>();
  for (const t of texts) {
    for (const { label, pattern } of BIAS_PATTERNS) {
      if (pattern.test(t)) flags.add(label);
    }
  }
  return flags;
}

function findCircular(list: Hypothesis[]): string[] {
  const flags: string[] = [];
  for (const h of list) {
    if (h.supporting_evidence_ids.length === 0 && /because/i.test(h.rationale)) {
      const [premise, conclusion] = h.rationale.split(/because/i, 2);
      if (premise && conclusion && similarity(premise, conclusion) > 0.7) {
        flags.push(h.id);
      }
    }
  }
  return flags;
}

function findUnsupported(list: Hypothesis[], evidence: Evidence[]): string[] {
  if (evidence.length === 0) return list.map((h) => h.id);
  return list
    .filter((h) => h.supporting_evidence_ids.length === 0 && h.confidence.value >= 0.5)
    .map((h) => h.id);
}

function similarity(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const tb = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter += 1;
  return inter / Math.max(ta.size, tb.size);
}
