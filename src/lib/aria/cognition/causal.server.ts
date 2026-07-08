import type { CausalGraph, CausalLink, Evidence } from "./types";

function keywordsOf(text: string): ReadonlyArray<string> {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length >= 4);
}

const CAUSAL_MARKERS = [
  "because",
  "due to",
  "leads to",
  "causes",
  "results in",
  "triggers",
  "drives",
];

function splitCausal(claim: string): { cause: string; effect: string } | null {
  const lower = claim.toLowerCase();
  for (const marker of CAUSAL_MARKERS) {
    const idx = lower.indexOf(marker);
    if (idx > 0) {
      const cause = claim.slice(0, idx).trim();
      const effect = claim.slice(idx + marker.length).trim();
      if (cause.length > 2 && effect.length > 2) return { cause, effect };
    }
  }
  return null;
}

export function buildCausalGraph(goal: string, evidence: ReadonlyArray<Evidence>): CausalGraph {
  const links: CausalLink[] = [];
  const causeCounts = new Map<string, number>();

  for (const e of evidence) {
    const parsed = splitCausal(e.claim);
    if (!parsed) continue;
    links.push({
      cause: parsed.cause,
      effect: parsed.effect,
      confidence: e.weight,
      evidenceIds: [e.id],
    });
    causeCounts.set(parsed.cause, (causeCounts.get(parsed.cause) ?? 0) + 1);
  }

  let rootCause: string | null = null;
  let maxCount = 0;
  for (const [cause, count] of causeCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      rootCause = cause;
    }
  }

  const goalKw = new Set(keywordsOf(goal));
  const secondOrderEffects: string[] = [];
  for (const link of links) {
    const effKw = keywordsOf(link.effect);
    const overlap = effKw.filter((k) => goalKw.has(k)).length;
    if (overlap === 0 && link.confidence >= 0.5) {
      secondOrderEffects.push(link.effect);
    }
  }

  return {
    rootCause,
    links,
    secondOrderEffects: Array.from(new Set(secondOrderEffects)).slice(0, 10),
  };
}
