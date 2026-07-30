import { emitCognitiveEvent } from "./events";
import type { Contradiction, ContradictionKind, Evidence, Hypothesis } from "./types";

function nextId(): string {
  return `ctr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const NEGATION = /\b(no|not|never|without|fails?|degraded|forbidden|denied|blocked)\b/i;

function isNegated(claim: string): boolean {
  return NEGATION.test(claim);
}

function claimKey(claim: string): string {
  return claim
    .toLowerCase()
    .replace(NEGATION, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .sort()
    .slice(0, 6)
    .join(" ");
}

export function detectContradictions(input: {
  evidence: ReadonlyArray<Evidence>;
  hypotheses: ReadonlyArray<Hypothesis>;
  policyStatements?: ReadonlyArray<string>;
  memoryStatements?: ReadonlyArray<string>;
  contextStatements?: ReadonlyArray<string>;
}): ReadonlyArray<Contradiction> {
  const contradictions: Contradiction[] = [];

  const byKey = new Map<string, Evidence[]>();
  for (const e of input.evidence) {
    const key = claimKey(e.claim);
    if (!key) continue;
    const arr = byKey.get(key) ?? [];
    arr.push(e);
    byKey.set(key, arr);
  }
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    const positives = group.filter((e) => !isNegated(e.claim));
    const negatives = group.filter((e) => isNegated(e.claim));
    if (positives.length > 0 && negatives.length > 0) {
      const severity =
        Math.min(positives[0].weight, negatives[0].weight) >= 0.6 ? "high" : "medium";
      contradictions.push({
        id: nextId(),
        kind: "logical",
        description: `Evidence conflicts on: "${positives[0].claim}" vs "${negatives[0].claim}".`,
        evidenceIds: [...positives.map((p) => p.id), ...negatives.map((n) => n.id)],
        severity,
      });
    }
  }

  for (const h of input.hypotheses) {
    if (h.supportingEvidenceIds.length > 0 && h.opposingEvidenceIds.length > 0 && !h.rejected) {
      contradictions.push({
        id: nextId(),
        kind: "logical",
        description: `Hypothesis "${h.statement}" has both supporting and opposing evidence.`,
        evidenceIds: [...h.supportingEvidenceIds, ...h.opposingEvidenceIds],
        severity: "medium",
      });
    }
  }

  const checkStatements = (
    label: ContradictionKind,
    statements: ReadonlyArray<string> | undefined,
  ) => {
    if (!statements || statements.length === 0) return;
    for (const stmt of statements) {
      const k = claimKey(stmt);
      const conflict = input.evidence.find(
        (e) => claimKey(e.claim) === k && isNegated(e.claim) !== isNegated(stmt),
      );
      if (conflict) {
        contradictions.push({
          id: nextId(),
          kind: label,
          description: `${label} conflict: "${stmt}" contradicts "${conflict.claim}".`,
          evidenceIds: [conflict.id],
          severity: label === "policy" ? "critical" : "high",
        });
      }
    }
  };
  checkStatements("policy", input.policyStatements);
  checkStatements("memory", input.memoryStatements);
  checkStatements("context", input.contextStatements);

  if (contradictions.length > 0) {
    emitCognitiveEvent("ContradictionDetected", { count: contradictions.length });
  }
  return contradictions;
}
