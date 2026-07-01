// Phase 10.3 — Agent Mesh public barrel. Server-only. Strictly additive.

export * from "./types";
export * as AgentMeshContracts from "./contracts";
export {
  createNode,
  createRegistry,
  addNode,
  updateNode,
  removeNode,
  applyHeartbeat,
  markStatus,
  activeNodes,
  type NodeRegistry,
} from "./node-registry.server";
export {
  createAgentRegistry,
  registerAgent,
  deregisterAgent,
  setAgentStatus,
  agentsForNode,
  availableAgents,
  type AgentRegistry,
} from "./agent-registry.server";
export { buildCapabilityMap, bindingsFor } from "./capability-map.server";
export { routeMission } from "./routing.server";
export { tallyConsensus } from "./consensus.server";
export {
  classifyHeartbeat,
  applyDelta,
  toObservation,
  type Thresholds,
  type HeartbeatDelta,
} from "./heartbeat.server";
export { computeMembership, membershipQuorumMet } from "./membership.server";
export { planReplication } from "./replication.server";
export {
  detectPartition,
  partitionSafeForExecution,
} from "./partition-detection.server";
export { evaluateQuorum } from "./quorum.server";
export {
  acquireLease,
  releaseLease,
  createMemoryLeaseStore,
  type LeaseStore,
} from "./lease.server";
export {
  acquireLock,
  releaseLock,
  createMemoryLockStore,
  type LockStore,
} from "./mesh-lock.server";
export { routeMissionBatch } from "./mesh-task-routing.server";
export { computeHealth } from "./mesh-health.server";
export { planRecovery, type RecoveryInput } from "./mesh-recovery.server";
export { createAuditLog } from "./audit.server";
export { computeMetrics } from "./metrics.server";
export { emitTelemetry } from "./telemetry.server";
export { verifyMesh, assembleReport } from "./verification.server";
export {
  runAgentMeshPipeline,
  type MeshPipelineInput,
  type MeshPipelineOutput,
  type MeshNodeSpec,
  type AgentSpec,
  type ReplicationSpec,
} from "./mesh.server";
