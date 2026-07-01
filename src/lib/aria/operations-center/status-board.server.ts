// Executive status board — merges rollups from every domain into one board.
import type {
  HealthState,
  IncidentRecord,
  MeshHealth,
  MissionStatus,
  NormalizedSignal,
  Priority,
  ReadinessSnapshot,
  RiskRecord,
  RuntimeHealth,
  StatusBoard,
  StatusBoardEntry,
  ToolReadiness,
} from "./types";
import { classifyPriority } from "./control-plane.server";

function pickSeverity(items: ReadonlyArray<NormalizedSignal>, subject: string): {
  severity: NormalizedSignal["severity"];
  priority: Priority;
  detail: string;
  evidence: NormalizedSignal["evidence"];
} {
  const matching = items.filter((s) => s.subject === subject);
  if (matching.length === 0) {
    return { severity: "unknown", priority: "unknown", detail: "no_signal", evidence: [] };
  }
  const order = ["info", "low", "medium", "high", "critical"] as const;
  const worst = matching.reduce((a, b) =>
    order.indexOf(a.severity as (typeof order)[number]) >=
    order.indexOf(b.severity as (typeof order)[number])
      ? a
      : b,
  );
  return {
    severity: worst.severity,
    priority: worst.priority,
    detail: worst.detail,
    evidence: worst.evidence,
  };
}

function healthFromSeverity(sev: NormalizedSignal["severity"]): HealthState {
  if (sev === "critical" || sev === "high") return "down";
  if (sev === "medium") return "degraded";
  if (sev === "low" || sev === "info") return "healthy";
  return "unknown";
}

export function buildStatusBoard(input: {
  missions: ReadonlyArray<MissionStatus>;
  incidents: ReadonlyArray<IncidentRecord>;
  risks: ReadonlyArray<RiskRecord>;
  runtime: ReadonlyArray<RuntimeHealth>;
  mesh: ReadonlyArray<MeshHealth>;
  tools: ReadonlyArray<ToolReadiness>;
  readiness: ReadonlyArray<ReadinessSnapshot>;
  signals: ReadonlyArray<NormalizedSignal>;
  generatedAt: string;
}): StatusBoard {
  const entries: StatusBoardEntry[] = [];

  for (const m of input.missions) {
    const sig = pickSeverity(input.signals, m.missionId);
    entries.push({
      domain: "mission",
      subject: m.missionId,
      state: m.health,
      severity: sig.severity,
      priority: sig.priority,
      detail: m.detail,
      evidence: [...m.evidence, ...sig.evidence],
      updatedAt: m.updatedAt,
    });
  }
  for (const i of input.incidents) {
    entries.push({
      domain: "incident",
      subject: i.incidentId,
      state: i.state === "resolved" ? "healthy" : healthFromSeverity(i.severity),
      severity: i.severity,
      priority: classifyPriority(i.severity),
      detail: `state=${i.state}`,
      evidence: i.evidence,
      updatedAt: i.openedAt,
    });
  }
  for (const r of input.risks) {
    entries.push({
      domain: "risk",
      subject: r.riskId,
      state: healthFromSeverity(r.severity),
      severity: r.severity,
      priority: classifyPriority(r.severity),
      detail: `L=${r.likelihood.toFixed(2)} I=${r.impact.toFixed(2)}`,
      evidence: r.evidence,
      updatedAt: r.updatedAt,
    });
  }
  for (const n of input.runtime) {
    entries.push({
      domain: "runtime",
      subject: n.nodeId,
      state: n.state,
      severity: n.state === "down" ? "critical" : n.state === "degraded" ? "high" : "info",
      priority: classifyPriority(
        n.state === "down" ? "critical" : n.state === "degraded" ? "high" : "info",
      ),
      detail: `cpu=${n.cpuLoad ?? "?"} mem=${n.memLoad ?? "?"} q=${n.queueDepth ?? "?"}`,
      evidence: n.evidence,
      updatedAt: n.capturedAt,
    });
  }
  for (const m of input.mesh) {
    entries.push({
      domain: "mesh",
      subject: m.meshId,
      state: m.partitionSuspected ? "down" : m.state,
      severity: m.partitionSuspected
        ? "critical"
        : m.state === "down"
          ? "critical"
          : m.state === "degraded"
            ? "high"
            : "info",
      priority: classifyPriority(m.partitionSuspected ? "critical" : "info"),
      detail: `nodes=${m.reachableCount}/${m.nodeCount} partition=${m.partitionSuspected}`,
      evidence: m.evidence,
      updatedAt: m.capturedAt,
    });
  }
  for (const t of input.tools) {
    entries.push({
      domain: "tool",
      subject: t.toolId,
      state: t.state,
      severity: t.state === "down" ? "critical" : t.state === "degraded" ? "medium" : "info",
      priority: classifyPriority(
        t.state === "down" ? "critical" : t.state === "degraded" ? "medium" : "info",
      ),
      detail: `failureRate=${t.failureRate ?? "?"}`,
      evidence: t.evidence,
      updatedAt: t.lastCheckAt,
    });
  }
  for (const r of input.readiness) {
    entries.push({
      domain: "readiness",
      subject: r.subject,
      state: r.state,
      severity: r.state === "down" ? "critical" : r.state === "degraded" ? "medium" : "info",
      priority: classifyPriority(
        r.state === "down" ? "critical" : r.state === "degraded" ? "medium" : "info",
      ),
      detail: r.detail,
      evidence: r.evidence,
      updatedAt: r.capturedAt,
    });
  }

  const hasDown = entries.some((e) => e.state === "down");
  const hasDegraded = entries.some((e) => e.state === "degraded");
  const hasKnown = entries.some((e) => e.state !== "unknown");
  const overall: HealthState = hasDown
    ? "down"
    : hasDegraded
      ? "degraded"
      : hasKnown
        ? "healthy"
        : "unknown";

  return { generatedAt: input.generatedAt, entries, overall };
}
