/**
 * Phase 10.1 — Health checks. Unknown remains UNKNOWN.
 */
import type { EvidenceRef, Health, HealthReport } from "./types";
import type { RuntimeStateStore } from "./state.server";
import type { HeartbeatMonitor } from "./heartbeat.server";
import type { ResourceMonitor } from "./resource.server";

export class HealthChecker {
  constructor(
    private readonly store: RuntimeStateStore,
    private readonly heartbeats: HeartbeatMonitor,
    private readonly resources: ResourceMonitor,
    private readonly maxQueueDepth: number,
  ) {}

  check(): HealthReport {
    const phase = this.store.getPhase();
    const usage = this.resources.snapshot();
    const stale = this.heartbeats.stale();

    const checks: Array<{ name: string; status: Health; detail?: string }> = [];

    if (phase === "accepting_jobs" || phase === "draining") {
      checks.push({ name: "phase", status: "healthy", detail: phase });
    } else if (phase === "crashed") {
      checks.push({ name: "phase", status: "unhealthy", detail: phase });
    } else if (phase === "stopped") {
      checks.push({ name: "phase", status: "degraded", detail: phase });
    } else {
      checks.push({ name: "phase", status: "unknown", detail: phase });
    }

    if (this.store.listWorkers().length === 0) {
      checks.push({ name: "workers", status: "degraded", detail: "no workers registered" });
    } else if (stale.length > 0) {
      checks.push({
        name: "workers",
        status: "degraded",
        detail: `${stale.length} stale heartbeat(s)`,
      });
    } else {
      checks.push({ name: "workers", status: "healthy" });
    }

    if (usage.queue_depth >= this.maxQueueDepth) {
      checks.push({ name: "queue", status: "unhealthy", detail: "queue full" });
    } else if (usage.queue_depth > this.maxQueueDepth * 0.8) {
      checks.push({ name: "queue", status: "degraded", detail: "queue high" });
    } else {
      checks.push({ name: "queue", status: "healthy" });
    }

    const status: Health = worstOf(checks.map((c) => c.status));

    const evidence: EvidenceRef[] = [
      {
        kind: "health",
        source: "runtime.production.health",
        captured_at: new Date().toISOString(),
      },
    ];

    return { status, phase, usage, checks, evidence };
  }
}

function worstOf(values: ReadonlyArray<Health>): Health {
  const order: Record<Health, number> = {
    unhealthy: 3,
    unknown: 2,
    degraded: 1,
    healthy: 0,
  };
  let worst: Health = "healthy";
  for (const v of values) {
    if (order[v] > order[worst]) worst = v;
  }
  return worst;
}
