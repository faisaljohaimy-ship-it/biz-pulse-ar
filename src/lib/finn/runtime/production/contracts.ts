/**
 * Phase 10.1 — Zod contracts for Production Runtime.
 */
import { z } from "zod";

export const RuntimePhaseSchema = z.enum([
  "idle",
  "booting",
  "loading_config",
  "initializing",
  "registering_workers",
  "starting_scheduler",
  "accepting_jobs",
  "draining",
  "stopped",
  "crashed",
]);

export const JobStatusSchema = z.enum([
  "queued",
  "dispatched",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "unknown",
]);

export const HealthSchema = z.enum(["healthy", "degraded", "unhealthy", "unknown"]);

export const EvidenceRefSchema = z.object({
  kind: z.enum([
    "config",
    "startup",
    "shutdown",
    "dispatch",
    "worker",
    "queue",
    "health",
    "heartbeat",
    "checkpoint",
    "state",
    "resource",
    "audit",
    "metric",
    "recovery",
    "session",
  ]),
  source: z.string().min(1),
  ref: z.string().optional(),
  captured_at: z.string().min(1),
});

export const RuntimeConfigSchema = z.object({
  runtime_id: z.string().min(1),
  max_workers: z.number().int().positive(),
  max_queue_depth: z.number().int().positive(),
  heartbeat_interval_ms: z.number().int().positive(),
  job_timeout_ms: z.number().int().positive(),
  checkpoint_enabled: z.boolean(),
});

export const WorkerDescriptorSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  concurrency: z.number().int().positive(),
  registered_at: z.string().min(1),
});

export const JobSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  enqueued_at: z.string().min(1),
  not_before: z.string().optional(),
});

export const HeartbeatSchema = z.object({
  worker_id: z.string().min(1),
  at: z.string().min(1),
  healthy: z.boolean(),
  note: z.string().optional(),
});

export const SessionSchema = z.object({
  id: z.string().min(1),
  principal: z.string().min(1),
  created_at: z.string().min(1),
  last_seen_at: z.string().min(1),
  closed_at: z.string().optional(),
});

export function validateConfig(input: unknown) {
  return RuntimeConfigSchema.parse(input);
}
export function validateWorker(input: unknown) {
  return WorkerDescriptorSchema.parse(input);
}
export function validateJob(input: unknown) {
  return JobSchema.parse(input);
}
export function validateHeartbeat(input: unknown) {
  return HeartbeatSchema.parse(input);
}
