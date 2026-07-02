import type { ValueProposition } from "./types";
import { ValuePropositionZ } from "./contracts";

export function defineValueProposition(v: ValueProposition): ValueProposition {
  const parsed = ValuePropositionZ.parse(v);
  return { ...parsed, proofPoints: parsed.proofPoints ?? [] };
}
