/**
 * Phase 8.9 — Zod contracts for the Executive AI Operating System.
 *
 * Every public entrypoint validates its input through one of these schemas.
 * Subsystem-owned payloads (BrainRequest, ExecutionPlan, ...) keep their
 * own contracts in their originating phase — we never re-validate them.
 */

import { z } from "zod";

export const PrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export const HorizonSchema = z.enum(["operational", "strategic", "long_term"]);
export const ObjectiveStatusSchema = z.enum([
  "draft",
  "active",
  "at_risk",
  "achieved",
  "abandoned",
]);

export const StartSessionInputSchema = z.object({
  owner: z.string().min(1).max(200),
  org_id: z.string().min(1).max(200).nullable().optional(),
  workspace_id: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  departments: z.array(z.string().min(1).max(200)).max(64).optional(),
  projects: z.array(z.string().min(1).max(200)).max(128).optional(),
  focus_site: z.string().min(1).max(200).optional(),
});
export type StartSessionInput = z.infer<typeof StartSessionInputSchema>;

export const ContinueSessionInputSchema = z.object({
  session_id: z.string().min(1),
  question: z.string().min(1).max(4000),
  lang: z.enum(["ar", "en", "mixed"]).optional(),
  objective_id: z.string().min(1).optional(),
  api_key: z.string().min(1).optional(),
});
export type ContinueSessionInput = z.infer<typeof ContinueSessionInputSchema>;

export const FinishSessionInputSchema = z.object({
  session_id: z.string().min(1),
  reason: z.string().min(1).max(500).optional(),
});
export type FinishSessionInput = z.infer<typeof FinishSessionInputSchema>;

export const RestoreSessionInputSchema = z.object({
  session_id: z.string().min(1),
});
export type RestoreSessionInput = z.infer<typeof RestoreSessionInputSchema>;

export const CreateObjectiveInputSchema = z.object({
  workspace_id: z.string().min(1),
  title: z.string().min(1).max(240),
  description: z.string().min(1).max(4000),
  horizon: HorizonSchema,
  priority: PrioritySchema,
  owner: z.string().min(1).max(200).optional(),
  due_at: z.string().datetime().optional(),
});
export type CreateObjectiveInput = z.infer<typeof CreateObjectiveInputSchema>;

export const UpdateObjectiveInputSchema = z.object({
  objective_id: z.string().min(1),
  status: ObjectiveStatusSchema.optional(),
  progress: z.number().min(0).max(1).optional(),
  priority: PrioritySchema.optional(),
  due_at: z.string().datetime().nullable().optional(),
});
export type UpdateObjectiveInput = z.infer<typeof UpdateObjectiveInputSchema>;

export const CreateArtifactInputSchema = z.object({
  workspace_id: z.string().min(1),
  session_id: z.string().min(1).nullable().optional(),
  mission_id: z.string().min(1).nullable().optional(),
  kind: z.enum([
    "plan",
    "report",
    "result",
    "evidence",
    "answer",
    "reasoning",
    "file",
    "note",
  ]),
  label: z.string().min(1).max(240),
  summary: z.string().max(4000).optional(),
  payload: z.unknown(),
});
export type CreateArtifactInput = z.infer<typeof CreateArtifactInputSchema>;
