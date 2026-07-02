// Phase 10.6 — Pilot Readiness Zod contracts.
import { z } from "zod";

export const EvidenceRefZ = z.object({
  source: z.string().min(1),
  ref: z.string().min(1),
  at: z.string().min(1),
});

export const PilotScopeZ = z.object({
  pilotId: z.string().min(1),
  title: z.string().min(1),
  sponsor: z.string().min(1),
  businessUnit: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  includedCapabilities: z.array(z.string().min(1)).min(1),
  excludedCapabilities: z.array(z.string().min(1)).default([]),
  participants: z.array(z.string().min(1)).min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const StakeholderZ = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  influence: z.enum(["low", "medium", "high", "critical", "unknown"]),
  stance: z.enum(["champion", "supporter", "neutral", "skeptic", "blocker", "unknown"]),
  interests: z.array(z.string().min(1)).default([]),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const SuccessCriterionZ = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  metric: z.string().min(1),
  target: z.number().finite(),
  comparator: z.enum(["lte", "gte", "eq"]),
  weight: z.number().min(0).max(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const DemoStepZ = z.object({
  order: z.number().int().positive(),
  title: z.string().min(1),
  narrative: z.string().min(1),
  capability: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const AcceptanceTestInputZ = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  criterionId: z.string().nullable(),
  precondition: z.string().min(1),
  action: z.string().min(1),
  expected: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const FeedbackItemZ = z.object({
  id: z.string().min(1),
  participantId: z.string().min(1),
  channel: z.enum(["interview", "survey", "observed", "email", "unknown"]),
  sentiment: z.enum(["positive", "negative", "neutral", "unknown"]),
  detail: z.string().min(1),
  capturedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const TrainingModuleZ = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  audience: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const SupportChannelZ = z.object({
  id: z.string().min(1),
  kind: z.enum(["email", "chat", "phone", "onsite", "unknown"]),
  slaMinutes: z.number().int().nonnegative().nullable(),
  hours: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const RiskEntryZ = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  likelihood: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  severity: z.enum(["low", "medium", "high", "critical", "unknown"]),
  mitigation: z.string().min(1),
  owner: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const GovernancePlanZ = z.object({
  pilotId: z.string().min(1),
  steeringCommittee: z.array(z.string().min(1)).min(1),
  cadence: z.string().min(1),
  decisionRights: z
    .array(z.object({ decision: z.string().min(1), owner: z.string().min(1) }))
    .min(1),
  escalationPolicy: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const RolloutWaveZ = z.object({
  waveNumber: z.number().int().positive(),
  label: z.string().min(1),
  targetUsers: z.number().int().nonnegative(),
  startDate: z.string().min(1),
  exitCriteriaIds: z.array(z.string().min(1)).default([]),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const ValueDriverZ = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  annualValue: z.number().finite().nonnegative(),
  currency: z.string().min(1),
  confidence: z.enum(["low", "medium", "high", "unknown"]),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const RoiInputsZ = z.object({
  investment: z.number().finite().nonnegative(),
  annualValue: z.number().finite().nonnegative(),
  annualCost: z.number().finite().nonnegative(),
  horizonYears: z.number().int().positive(),
  discountRate: z.number().min(0).max(1),
  currency: z.string().min(1),
});
