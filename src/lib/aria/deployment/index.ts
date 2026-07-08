// Phase 10.2 — Deployment & Distributed Cluster public barrel.
// Server-only, strictly additive.

export * from "./types";
export * as DeploymentContracts from "./contracts";
export { validateEnvironment } from "./environment.server";
export { createNode, applyHeartbeat, markStatus } from "./node.server";
export {
  createCluster,
  addNode,
  updateNode,
  removeNode,
  readyNodes,
  setLeader,
} from "./cluster.server";
export { createWorkerPool, claimSlot, releaseSlot, utilization } from "./worker-pool.server";
export { pickNode } from "./load-balancer.server";
export { routeJobs } from "./job-routing.server";
export { electLeader } from "./leader-election.server";
export { acquireLock, releaseLock, createMemoryLockStore } from "./distributed-lock.server";
export { planFailover } from "./failover.server";
export { planScaling } from "./scaling.server";
export { planRollback } from "./rollback.server";
export { nextChannel, canPromote } from "./release-channel.server";
export { healthProbe } from "./health-probe.server";
export { readinessProbe } from "./readiness-probe.server";
export { livenessProbe } from "./liveness-probe.server";
export { createAuditLog } from "./audit.server";
export { computeMetrics } from "./metrics.server";
export { emitTelemetry } from "./telemetry.server";
export { verifyDeployment, assembleReport } from "./verification.server";
export {
  runDeploymentPipeline,
  type DeploymentPipelineInput,
  type DeploymentPipelineOutput,
  type NodeSpec,
} from "./deployment.server";
