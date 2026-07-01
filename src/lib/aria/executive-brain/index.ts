/**
 * Executive Brain — public server-side surface.
 *
 * Import points for callers (endpoints, server functions):
 *   import { runExecutiveBrain, BrainRequestSchema } from "@/lib/aria/executive-brain";
 *
 * Callers must render ONLY `text_ar` / `text_en` to end users. Every other
 * field on `ExecutiveBrainAnswer` is internal and consumed by executive UI
 * panels or the audit trail.
 */
export { runExecutiveBrain } from "./brain.server";
export type { RunExecutiveBrainOptions } from "./brain.server";
export { BrainRequestSchema, ModelEnvelopeSchema } from "./contracts";
export type { ModelEnvelope } from "./contracts";
export type {
  BrainRequest,
  BrainAnchor,
  BrainWidget,
  BrainTurn,
  BrainPage,
  ExecutiveBrainAnswer,
  ExecutiveBrainMemory,
  DecisionMode,
  DecisionProposal,
  ReasoningType,
  RiskFacet,
  RiskSignal,
  Recommendation,
  Priority,
  ConfidenceBreakdown,
} from "./types";
