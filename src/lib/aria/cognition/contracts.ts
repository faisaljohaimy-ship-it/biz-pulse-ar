import { z } from "zod";

export const EvidenceSourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["memory", "context", "execution", "reasoning", "learning", "external"]),
  label: z.string().min(1),
  trust: z.number().min(0).max(1),
});

export const EvidenceSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(1),
  source: EvidenceSourceSchema,
  weight: z.number().min(0).max(1),
  strength: z.enum(["weak", "moderate", "strong", "conclusive"]),
  capturedAt: z.string().min(1),
  refs: z.array(z.string().min(1)),
});

export const AssumptionSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  criticality: z.enum(["low", "medium", "high"]),
  evidenceIds: z.array(z.string().min(1)),
});

export const HypothesisSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  rationale: z.string().min(1),
  supportingEvidenceIds: z.array(z.string().min(1)),
  opposingEvidenceIds: z.array(z.string().min(1)),
  confidence: z.number().min(0).max(1),
  rejected: z.boolean(),
  rejectionReason: z.string().min(1).nullable(),
});

export const DecisionOptionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  hypothesisId: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)),
});

export const TradeoffSchema = z.object({
  optionId: z.string().min(1),
  pros: z.array(z.string().min(1)),
  cons: z.array(z.string().min(1)),
  cost: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
  speed: z.number().min(0).max(1),
  accuracy: z.number().min(0).max(1),
  complexity: z.number().min(0).max(1),
  compliance: z.number().min(0).max(1),
  maintainability: z.number().min(0).max(1),
});

export const DecisionScoreSchema = z.object({
  optionId: z.string().min(1),
  score: z.number().min(0).max(1),
  components: z.record(z.number()),
});

export const RiskSignalSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  likelihood: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  evidenceIds: z.array(z.string().min(1)),
});

export const SimulationResultSchema = z.object({
  optionId: z.string().min(1),
  outcome: z.enum(["best", "expected", "worst"]),
  narrative: z.string().min(1),
  probability: z.number().min(0).max(1),
  kpiDelta: z.record(z.number()),
});

export const ExecutiveRecommendationSchema = z.object({
  decisionOptionId: z.string().min(1),
  title: z.string().min(1),
  rationale: z.string().min(1),
  nextAction: z.string().min(1),
  businessImpact: z.string().min(1),
  requiresApproval: z.boolean(),
});
