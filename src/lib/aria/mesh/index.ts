// Phase 10.3 — Distributed Agent Mesh public barrel.
// Server-only. Strictly additive. Does not modify prior layers.

export * from "./types";
export * as MeshContracts from "./contracts";
export { createNode, applyHeartbeat, markStatus } from "./node.server";
export {
  createCluster,
  addNode,
  updateNode,
  removeNode,
  upsertPeer,
  activeNodes,
  setLeader,
} from "./cluster.server";
export { createPeer, observePeer } from "./peer.server";
export { runDiscovery } from "./discovery.server";
export {
  createRegistry,
  register,
  deregister,
  findByCapability,
} from "./registry.server";
export { selectRoute, type RouterState } from "./routing.server";
export { routeByCapability } from "./capability-routing.server";
export { scheduleBatch } from "./scheduler.server";
export { measureDistribution } from "./load-balancing.server";
export { classifyNode, applyClassification } from "./heartbeat.server";
export { computeHealth } from "./health.server";
export { observePresence } from "./presence.server";
export { electLeader } from "./leader-election.server";
export { evaluateQuorum } from "./quorum.server";
export { tallyConsensus } from "./consensus.server";
export {
  acquireLock,
  releaseLock,
  createMemoryLockStore,
} from "./distributed-lock.server";
export {
  cacheGet,
  cacheSet,
  createMemoryCacheStore,
} from "./distributed-cache.server";
export { admitMessage } from "./message-bus.server";
export { planBroadcast } from "./broadcast.server";
export { planReplication, replicationLagMs } from "./replication.server";
export { captureCheckpoint } from "./checkpoint.server";
export { captureSnapshot } from "./snapshot.server";
export { planRecovery } from "./recovery.server";
export { createPolicy, authorizeCapability } from "./policy.server";
export { computeMetrics } from "./metrics.server";
export { emitTelemetry } from "./telemetry.server";
export { createAuditLog } from "./audit.server";
export { verifyMesh, assembleReport } from "./verification.server";
export {
  runMeshPipeline,
  type MeshPipelineInput,
  type MeshPipelineOutput,
  type MeshNodeSpec,
} from "./mesh.server";
