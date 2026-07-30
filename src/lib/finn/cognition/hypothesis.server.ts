import { emitCognitiveEvent } from "./events";
import type { CognitiveMode, Evidence, Hypothesis } from "./types";

export interface HypothesisSeed {
  readonly statement: string;
  readonly rationale: string;
}

function nextId(): string {
  return `hyp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function keywordsOf(text: string): ReadonlyArray<string> {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length >= 4);
}

function overlap(a: ReadonlyArray<string>, b: ReadonlyArray<string>): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let n = 0;
  for (const t of a) if (setB.has(t)) n += 1;
  return n / Math.max(a.length, b.length);
}

function classify(
  hypothesisKeywords: ReadonlyArray<string>,
  evidence: ReadonlyArray<Evidence>,
): { supporting: string[]; opposing: string[]; supportScore: number } {
  const supporting: string[] = [];
  const opposing: string[] = [];
  let supportScore = 0;
  for (const e of evidence) {
    const claimKw = keywordsOf(e.claim);
    const rel = overlap(hypothesisKeywords, claimKw);
    if (rel < 0.1) continue;
    const negated = /\b(no|not|never|without|fails?|degraded)\b/i.test(e.claim);
    if (negated) {
      opposing.push(e.id);
      supportScore -= e.weight * rel;
    } else {
      supporting.push(e.id);
      supportScore += e.weight * rel;
    }
  }
  return { supporting, opposing, supportScore };
}

export function generateHypotheses(
  goal: string,
  evidence: ReadonlyArray<Evidence>,
  mode: CognitiveMode,
  seeds: ReadonlyArray<HypothesisSeed> = [],
): ReadonlyArray<Hypothesis> {
  const baseSeeds: HypothesisSeed[] = [
    {
      statement: `Proceed with primary path for: ${goal}`,
      rationale: `Baseline hypothesis derived from goal under ${mode} mode.`,
    },
    {
      statement: `Defer or gather more information before acting on: ${goal}`,
      rationale: "Alternative hypothesis prioritizing evidence completeness.",
    },
    {
      statement: `Adopt a contrarian approach to: ${goal}`,
      rationale: "Devil's advocate hypothesis to test assumptions.",
    },
  ];
  const all = [...baseSeeds, ...seeds];
  const results: Hypothesis[] = [];
  for (const seed of all) {
    const kw = keywordsOf(`${seed.statement} ${seed.rationale} ${goal}`);
    const { supporting, opposing, supportScore } = classify(kw, evidence);
    const rawConfidence = 0.5 + supportScore * 0.5;
    const confidence = Math.max(0, Math.min(1, rawConfidence));
    const rejected = confidence < 0.25 || (opposing.length > 0 && supporting.length === 0);
    results.push({
      id: nextId(),
      statement: seed.statement,
      rationale: seed.rationale,
      supportingEvidenceIds: supporting,
      opposingEvidenceIds: opposing,
      confidence,
      rejected,
      rejectionReason: rejected ? "insufficient_support" : null,
    });
  }
  emitCognitiveEvent("HypothesisGenerated", {
    total: results.length,
    accepted: results.filter((h) => !h.rejected).length,
  });
  return results;
}

export function selectHypotheses(hypotheses: ReadonlyArray<Hypothesis>): ReadonlyArray<Hypothesis> {
  const kept = hypotheses.filter((h) => !h.rejected);
  return kept.length > 0 ? kept : hypotheses.slice(0, 1);
}
