// Phase 10.3 — Agent Mesh contracts. Zod validators.
import { z } from "zod";

export const EvidenceRefZ = z.object({
  source: z.string().min(1),
  ref: z.string().min(1),
  at: z.string().min(1),
});

export const RegisterNodeInputZ = z.object({
  id: z.string().min(1),
  address: z.string().min(1),
  zone: z.string().min(1),
  joinedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const HeartbeatInputZ = z.object({
  nodeId: z.string().min(1),
  at: z.string().min(1),
  load: z.number().min(0).max(1),
  rttMs: z.number().nonnegative().nullable().default(null),
});

export const AgentDescriptorInputZ = z.object({
  agentId: z.string().min(1),
  nodeId: z.string().min(1),
  capabilities: z.array(z.string().min(1)).default([]),
  version: z.string().min(1),
  status: z.enum(["available", "busy", "offline", "unknown"]).default("available"),
  registeredAt: z.string().min(1),
});

export const MissionInputZ = z.object({
  id: z.string().min(1),
  capability: z.string().min(1),
  key: z.string().optional(),
  priority: z.number().nonnegative().default(0),
  submittedAt: z.string().min(1),
});

export const LeaseInputZ = z.object({
  missionId: z.string().min(1),
  holderNodeId: z.string().min(1),
  holderAgentId: z.string().min(1),
  ttlMs: z.number().int().positive(),
  now: z.string().min(1),
});

export const LockInputZ = z.object({
  key: z.string().min(1),
  nodeId: z.string().min(1),
  ttlMs: z.number().int().positive(),
  now: z.string().min(1),
});

export const ConsensusInputZ = z.object({
  proposalId: z.string().min(1),
  term: z.number().int().nonnegative(),
  proposerNodeId: z.string().min(1),
  value: z.string().min(1),
  submittedAt: z.string().min(1),
  quorum: z.number().int().positive(),
  votes: z.record(z.string(), z.enum(["accept", "reject"])).default({}),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const MembershipInputZ = z.object({
  clusterId: z.string().min(1),
  members: z.array(z.string().min(1)).default([]),
  leaderId: z.string().nullable().default(null),
  term: z.number().int().nonnegative().default(0),
  quorum: z.number().int().positive(),
  generatedAt: z.string().min(1),
});

export const ReplicationInputZ = z.object({
  missionId: z.string().min(1),
  primaryNodeId: z.string().min(1),
  replicaNodeIds: z.array(z.string().min(1)).default([]),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().min(1),
});

export const PartitionInputZ = z.object({
  reachable: z.array(z.string().min(1)).default([]),
  unreachable: z.array(z.string().min(1)).default([]),
  quorum: z.number().int().positive(),
  detectedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const HealthInputZ = z.object({
  nodeId: z.string().min(1),
  signals: z
    .object({
      lastHeartbeatAgeMs: z.number().nonnegative().optional(),
      load: z.number().min(0).max(1).optional(),
      errorRate: z.number().min(0).max(1).optional(),
    })
    .default({}),
  checkedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const RouteMissionInputZ = z.object({
  mission: MissionInputZ,
  membershipQuorumMet: z.boolean(),
  partitionSafe: z.boolean(),
});
