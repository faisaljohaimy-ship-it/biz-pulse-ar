// Phase 10.3 — Mesh contracts. Zod validators for every entrypoint.
import { z } from "zod";

export const EvidenceRefZ = z.object({
  source: z.string().min(1),
  ref: z.string().min(1),
  at: z.string().min(1),
});

export const NodeIdentityZ = z.object({
  id: z.string().min(1),
  publicKeyFingerprint: z.string().min(1),
  issuedAt: z.string().min(1),
});

export const JoinNodeInputZ = z.object({
  id: z.string().min(1),
  address: z.string().min(1),
  zone: z.string().min(1),
  identity: NodeIdentityZ,
  capabilities: z.array(z.string().min(1)).default([]),
  joinedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const HeartbeatInputZ = z.object({
  nodeId: z.string().min(1),
  at: z.string().min(1),
  load: z.number().min(0).max(1),
  rttMs: z.number().nonnegative().nullable().default(null),
  evidence: z.array(EvidenceRefZ).default([]),
});

export const CapabilityDescriptorZ = z.object({
  capability: z.string().min(1),
  nodeId: z.string().min(1),
  version: z.string().min(1),
  weight: z.number().positive().default(1),
});

export const RouteRequestZ = z.object({
  messageId: z.string().min(1),
  capability: z.string().min(1),
  key: z.string().optional(),
  weight: z.number().positive().default(1),
  submittedAt: z.string().min(1),
});

export const LoadStrategyZ = z.enum([
  "round_robin",
  "least_loaded",
  "hash",
  "capability_affinity",
  "unknown",
]);

export const LeaderElectionInputZ = z.object({
  clusterId: z.string().min(1),
  candidateIds: z.array(z.string().min(1)).min(1),
  quorum: z.number().int().positive(),
  term: z.number().int().nonnegative(),
  votes: z.record(z.string(), z.string()).default({}),
  decidedAt: z.string().min(1),
  evidence: z.array(EvidenceRefZ).default([]),
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

export const MessageInputZ = z.object({
  id: z.string().min(1),
  kind: z.enum(["direct", "broadcast", "gossip", "consensus", "control", "unknown"]),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().nullable().default(null),
  capability: z.string().nullable().default(null),
  payloadRef: z.string().min(1),
  issuedAt: z.string().min(1),
  ttl: z.number().int().positive(),
  hops: z.number().int().nonnegative().default(0),
  signature: z.string().min(1),
});

export const AcquireLockInputZ = z.object({
  key: z.string().min(1),
  nodeId: z.string().min(1),
  ttlMs: z.number().int().positive(),
  now: z.string().min(1),
});

export const CacheSetInputZ = z.object({
  key: z.string().min(1),
  valueRef: z.string().min(1),
  ownerNodeId: z.string().min(1),
  ttlMs: z.number().int().positive(),
  now: z.string().min(1),
});

export const ReplicationInputZ = z.object({
  key: z.string().min(1),
  primaryNodeId: z.string().min(1),
  replicaNodeIds: z.array(z.string().min(1)).default([]),
  version: z.number().int().nonnegative(),
  updatedAt: z.string().min(1),
});

export const CheckpointInputZ = z.object({
  id: z.string().min(1),
  clusterId: z.string().min(1),
  term: z.number().int().nonnegative(),
  nodeIds: z.array(z.string().min(1)).default([]),
  capabilities: z.array(CapabilityDescriptorZ).default([]),
  capturedAt: z.string().min(1),
});

export const SnapshotInputZ = z.object({
  id: z.string().min(1),
  checkpointId: z.string().min(1),
  digest: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  capturedAt: z.string().min(1),
});

export const RecoveryInputZ = z.object({
  clusterId: z.string().min(1),
  restoreFromCheckpointId: z.string().min(1),
  rejoinNodeIds: z.array(z.string().min(1)).default([]),
  requeuedMessageIds: z.array(z.string().min(1)).default([]),
  decidedAt: z.string().min(1),
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

export const PresenceInputZ = z.object({
  nodeId: z.string().min(1),
  lastSeenAt: z.string().nullable().default(null),
  rttMs: z.number().nonnegative().nullable().default(null),
  now: z.string().min(1),
});

export const PolicyZ = z.object({
  requireMutualAuth: z.boolean().default(true),
  maxTtl: z.number().int().positive().default(30),
  maxHops: z.number().int().positive().default(8),
  allowedCapabilities: z.array(z.string().min(1)).default([]),
  deniedCapabilities: z.array(z.string().min(1)).default([]),
  zeroTrust: z.boolean().default(true),
});
