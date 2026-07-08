/**
 * Phase 9.0 — Zod contracts for the production layer.
 * Additive only. These validate inputs to the production APIs
 * (log ingestion, audit ingestion, performance samples).
 */

import { z } from "zod";

export const SeveritySchema = z.enum(["info", "notice", "warn", "error", "critical"]);

export const TraceIdsSchema = z.object({
  trace_id: z.string().min(1),
  request_id: z.string().nullish(),
  session_id: z.string().nullish(),
  mission_id: z.string().nullish(),
  agent_id: z.string().nullish(),
  task_id: z.string().nullish(),
});

export const LogEntrySchema = TraceIdsSchema.extend({
  ts: z.string(),
  level: SeveritySchema,
  source: z.string().min(1),
  message: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
  error_class: z.string().optional(),
});
export type LogEntryInput = z.infer<typeof LogEntrySchema>;

export const AuditEntrySchema = z.object({
  ts: z.string(),
  category: z.enum(["user_action", "aria_decision", "mission", "task", "security", "approval"]),
  actor: z.string().nullish(),
  org_id: z.string().nullish(),
  action: z.string().min(1),
  subject_type: z.string().optional(),
  subject_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  trace_id: z.string().optional(),
});
export type AuditEntryInput = z.infer<typeof AuditEntrySchema>;

export const PerformanceSampleSchema = z.object({
  ts: z.string(),
  route: z.string().min(1),
  duration_ms: z.number().nonnegative(),
  status: z.number().int(),
  slow: z.boolean(),
});
export type PerformanceSampleInput = z.infer<typeof PerformanceSampleSchema>;

export const TestRegistryEntrySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["unit", "integration", "e2e", "regression", "smoke", "failure"]),
  label: z.string().min(1),
  target: z.string().min(1),
  status: z.enum(["planned", "passing", "failing", "skipped", "unknown"]),
  last_run_at: z.string().optional(),
  notes: z.string().optional(),
});
export type TestRegistryEntryInput = z.infer<typeof TestRegistryEntrySchema>;
