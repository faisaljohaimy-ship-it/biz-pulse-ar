// Phase 10.2 — Deployment contracts. Zod validators for every entry point.
import { z } from "zod";

export const EvidenceRefZ = z.object({
  source: z.string().min(1),
  ref: z.string().min(1),
  at: z.string().min(1),
});

export const EnvironmentSpecZ = z.object({
  kind: z.enum(["development", "staging", "production", "unknown"]),
  region: z.string().min(1),
  runtime: z.enum(["workerd", "node", "edge", "unknown"]),
  features: z.array(z.string()).default([]),
});

export const RegisterNodeInputZ = z.object({
  id: z.string().min(1),
  address: z.string().min(1),
  zone: z.string().min(1),
  capacity: z.number().int().positive(),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const HeartbeatInputZ = z.object({
  nodeId: z.string().min(1),
  at: z.string().min(1),
  load: z.number().min(0).max(1),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const JobZ = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  key: z.string().optional(),
  weight: z.number().positive().default(1),
  submittedAt: z.string().min(1),
});

export const LoadStrategyZ = z.enum([
  "round_robin",
  "least_loaded",
  "hash",
  "sticky",
  "unknown",
]);

export const LeaderElectionInputZ = z.object({
  clusterId: z.string().min(1),
  candidateIds: z.array(z.string().min(1)).min(1),
  quorum: z.number().int().positive(),
  term: z.number().int().nonnegative(),
  votes: z.record(z.string(), z.string()).default({}),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const AcquireLockInputZ = z.object({
  key: z.string().min(1),
  nodeId: z.string().min(1),
  ttlMs: z.number().int().positive(),
  now: z.string().min(1),
});

export const FailoverInputZ = z.object({
  failedNodeId: z.string().min(1),
  candidates: z.array(z.string().min(1)).default([]),
  jobsOnFailedNode: z.array(z.string().min(1)).default([]),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const ScalingSignalsZ = z.object({
  currentNodes: z.number().int().nonnegative(),
  targetUtilization: z.number().min(0).max(1),
  observedUtilization: z.number().min(0).max(1),
  minNodes: z.number().int().positive(),
  maxNodes: z.number().int().positive(),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const RollbackInputZ = z.object({
  fromChannel: z.enum(["canary", "beta", "stable", "rollback", "unknown"]),
  toChannel: z.enum(["canary", "beta", "stable", "rollback", "unknown"]),
  reason: z.string().min(1),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const ProbeInputZ = z.object({
  nodeId: z.string().min(1),
  kind: z.enum(["health", "readiness", "liveness"]),
  signals: z
    .object({
      lastHeartbeatAgeMs: z.number().nonnegative().optional(),
      workerPoolReady: z.boolean().optional(),
      configLoaded: z.boolean().optional(),
    })
    .default({}),
  now: z.string().min(1),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const WorkerPoolInputZ = z.object({
  nodeId: z.string().min(1),
  size: z.number().int().positive(),
  now: z.string().min(1),
});
