// Incident classification and escalation eligibility.
import type { IncidentRecord, Priority, Severity } from "./types";
import { IncidentRecordZ } from "./contracts";
import { classifyPriority } from "./control-plane.server";

export function validateIncident(i: IncidentRecord): IncidentRecord {
  return IncidentRecordZ.parse(i);
}

export function incidentPriority(i: IncidentRecord): Priority {
  return classifyPriority(i.severity);
}

export function shouldEscalateIncident(
  i: IncidentRecord,
  minSeverity: Severity = "high",
): boolean {
  const order: Severity[] = ["info", "low", "medium", "high", "critical"];
  const iRank = order.indexOf(i.severity);
  const minRank = order.indexOf(minSeverity);
  if (iRank < 0 || minRank < 0) return false;
  return iRank >= minRank && i.state !== "resolved";
}

export function summarizeIncidents(all: ReadonlyArray<IncidentRecord>): {
  open: number;
  critical: number;
  high: number;
} {
  return {
    open: all.filter((i) => i.state !== "resolved").length,
    critical: all.filter((i) => i.severity === "critical" && i.state !== "resolved").length,
    high: all.filter((i) => i.severity === "high" && i.state !== "resolved").length,
  };
}
