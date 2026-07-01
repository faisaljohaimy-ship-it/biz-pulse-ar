// Phase 10.5 — Operations Center Zod validators.
import { z } from "zod";

export const EvidenceRefZ = z.object({
  source: z.string().min(1),
  ref: z.string().min(1),
  at: z.string().min(1),
});

export const SeverityZ = z.enum(["info", "low", "medium", "high", "critical", "unknown"]);
export const PriorityZ = z.enum(["p4", "p3", "p2", "p1", "p0", "unknown"]);
export const HealthZ = z.enum(["healthy", "degraded", "down", "unknown"]);
export const RoleZ = z.enum([
  "operator",
  "supervisor",
  "director",
  "executive",
  "board",
  "unknown",
]);

export const OpsSignalZ = z.object({
  id: z.string().min(1),
  domain: z.enum([
    "mission",
    "incident",
    "risk",
    "runtime",
    "mesh",
    "tool",
    "readiness",
    "unknown",
  ]),
  subject: z.string().min(1),
  severity: SeverityZ,
  detail: z.string().min(1),
  capturedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1, "evidence-linked required"),
});

export const MissionStatusZ = z.object({
  missionId: z.string().min(1),
  phase: z.enum(["planning", "executing", "paused", "completed", "failed", "unknown"]),
  progressPct: z.number().min(0).max(1).nullable(),
  health: HealthZ,
  detail: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
  updatedAt: z.string().min(1),
});

export const IncidentRecordZ = z.object({
  incidentId: z.string().min(1),
  subject: z.string().min(1),
  severity: SeverityZ,
  state: z.enum(["open", "acknowledged", "mitigating", "resolved", "unknown"]),
  openedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const RiskRecordZ = z.object({
  riskId: z.string().min(1),
  subject: z.string().min(1),
  likelihood: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  severity: SeverityZ,
  evidence: z.array(EvidenceRefZ).min(1),
  updatedAt: z.string().min(1),
});

export const RuntimeHealthZ = z.object({
  nodeId: z.string().min(1),
  state: HealthZ,
  cpuLoad: z.number().min(0).max(1).nullable(),
  memLoad: z.number().min(0).max(1).nullable(),
  queueDepth: z.number().int().nonnegative().nullable(),
  evidence: z.array(EvidenceRefZ).min(1),
  capturedAt: z.string().min(1),
});

export const MeshHealthZ = z.object({
  meshId: z.string().min(1),
  nodeCount: z.number().int().nonnegative(),
  reachableCount: z.number().int().nonnegative(),
  partitionSuspected: z.boolean(),
  state: HealthZ,
  evidence: z.array(EvidenceRefZ).min(1),
  capturedAt: z.string().min(1),
});

export const ToolReadinessZ = z.object({
  toolId: z.string().min(1),
  state: HealthZ,
  lastCheckAt: z.string().min(1),
  failureRate: z.number().min(0).max(1).nullable(),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const ReadinessSnapshotZ = z.object({
  subject: z.string().min(1),
  state: HealthZ,
  detail: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
  capturedAt: z.string().min(1),
});

export const OperatorActionZ = z.object({
  id: z.string().min(1),
  requestedBy: z.string().min(1),
  role: RoleZ,
  command: z.string().min(1),
  target: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()).default({}),
  justification: z.string().min(1),
  requestedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const ApprovalRecordZ = z.object({
  actionId: z.string().min(1),
  approverId: z.string().min(1),
  role: RoleZ,
  decision: z.enum(["approve", "reject", "defer", "unknown"]),
  justification: z.string().min(1),
  decidedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).default([]),
});
