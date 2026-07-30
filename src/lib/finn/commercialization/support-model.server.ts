import type { EvidenceRef, SupportModel, SupportTier } from "./types";
import { SupportTierZ } from "./contracts";

export function buildSupportModel(input: {
  tiers: ReadonlyArray<SupportTier>;
  evidence: ReadonlyArray<EvidenceRef>;
}): SupportModel {
  if (input.tiers.length === 0) throw new Error("support model requires at least one tier");
  if (input.evidence.length === 0) throw new Error("support model requires evidence");
  return { tiers: input.tiers.map((t) => SupportTierZ.parse(t)), evidence: input.evidence };
}
