/**
 * Zod contracts for Task Bus inputs (internal, server-only).
 */
import { z } from "zod";

export const TaskPrioritySchema = z.enum(["critical", "high", "medium", "low", "background"]);

export const EnqueueTaskInputSchema = z.object({
  missionId: z.string().min(1).max(120),
  agentId: z.string().min(1).max(64),
  intent: z.string().min(1).max(64),
  priority: TaskPrioritySchema.optional(),
  dependencies: z.array(z.string().min(1)).max(64).optional(),
  parentTaskId: z.string().min(1).max(120).nullable().optional(),
  approvalRequired: z.boolean().optional(),
  timeout: z.number().int().min(200).max(300_000).optional(),
  deadline: z.string().nullable().optional(),
  memoryScope: z.string().max(120).optional(),
  contextSignature: z.string().max(256).optional(),
  estimatedCost: z.enum(["low", "medium", "high"]).optional(),
  estimatedLatency: z.number().int().min(1).max(300_000).optional(),
  evidenceRefs: z.array(z.string()).max(64).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  delayMs: z.number().int().min(0).max(300_000).optional(),
});

export type EnqueueTaskInputParsed = z.infer<typeof EnqueueTaskInputSchema>;
