/**
 * Phase 8.5 — Zod contracts. Strict, no optional execution fields.
 * These validate inputs to the Director's public surface only —
 * internal in-memory state is typed via `types.ts`.
 */
import { z } from "zod";

export const ExecuteMissionInputSchema = z.object({
  question: z.string().min(1).max(4_000),
  sessionId: z.string().min(1).max(120).nullable(),
  language: z.enum(["ar", "en", "mixed"]),
  timeoutMs: z.number().int().min(1_000).max(600_000),
  approvalRequired: z.boolean(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  metadata: z.record(z.string(), z.unknown()),
});

export type ExecuteMissionInputParsed = z.infer<typeof ExecuteMissionInputSchema>;

export const ResumeMissionInputSchema = z.object({
  sessionId: z.string().min(1).max(120),
  fromCheckpointId: z.string().min(1).max(120).nullable(),
});

export const PauseMissionInputSchema = z.object({
  sessionId: z.string().min(1).max(120),
  reason: z.string().min(1).max(400),
});

export const CancelMissionInputSchema = z.object({
  sessionId: z.string().min(1).max(120),
  reason: z.string().min(1).max(400),
});

export const RetryMissionInputSchema = z.object({
  sessionId: z.string().min(1).max(120),
  scope: z.enum(["failed_only", "since_last_checkpoint", "all"]),
});

export const RollbackMissionInputSchema = z.object({
  sessionId: z.string().min(1).max(120),
  toCheckpointId: z.string().min(1).max(120).nullable(),
  reason: z.string().min(1).max(400),
});

export const ApprovalResolutionInputSchema = z.object({
  sessionId: z.string().min(1).max(120),
  approvalId: z.string().min(1).max(120),
  granted: z.boolean(),
  resolver: z.string().min(1).max(120),
});
