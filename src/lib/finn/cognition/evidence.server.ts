import { EvidenceSchema } from "./contracts";
import { emitCognitiveEvent } from "./events";
import type { Evidence, EvidenceSource, EvidenceStrength } from "./types";

export interface EvidenceSeed {
  readonly claim: string;
  readonly source: EvidenceSource;
  readonly refs?: ReadonlyArray<string>;
  readonly weightHint?: number;
}

function nextId(): string {
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function strengthFor(weight: number): EvidenceStrength {
  if (weight >= 0.85) return "conclusive";
  if (weight >= 0.65) return "strong";
  if (weight >= 0.4) return "moderate";
  return "weak";
}

function weightFrom(seed: EvidenceSeed): number {
  const trust = seed.source.trust;
  const hint = seed.weightHint ?? trust;
  return clamp01(trust * 0.6 + hint * 0.4);
}

export function collectEvidence(seeds: ReadonlyArray<EvidenceSeed>): ReadonlyArray<Evidence> {
  const collected: Evidence[] = [];
  for (const seed of seeds) {
    const claim = seed.claim.trim();
    if (claim.length === 0) continue;
    const weight = weightFrom(seed);
    const evidence = EvidenceSchema.parse({
      id: nextId(),
      claim,
      source: seed.source,
      weight,
      strength: strengthFor(weight),
      capturedAt: new Date().toISOString(),
      refs: seed.refs ?? [],
    });
    collected.push(evidence);
  }
  const ranked = [...collected].sort((a, b) => b.weight - a.weight);
  emitCognitiveEvent("EvidenceCollected", { count: ranked.length });
  return ranked;
}

export function rejectWeak(
  evidence: ReadonlyArray<Evidence>,
  threshold = 0.25,
): ReadonlyArray<Evidence> {
  return evidence.filter((e) => e.weight >= threshold);
}

export function coverageScore(evidence: ReadonlyArray<Evidence>): number {
  if (evidence.length === 0) return 0;
  const totalWeight = evidence.reduce((s, e) => s + e.weight, 0);
  const kindDiversity = new Set(evidence.map((e) => e.source.kind)).size;
  const diversityBoost = Math.min(kindDiversity / 4, 1);
  const avg = totalWeight / evidence.length;
  return clamp01(avg * 0.7 + diversityBoost * 0.3);
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
