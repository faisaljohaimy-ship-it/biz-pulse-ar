import type { PilotAuditEntry, PilotMetrics, PilotTelemetry } from "./types";

export function emitPilotTelemetry(input: {
  metrics: PilotMetrics;
  audit: ReadonlyArray<PilotAuditEntry>;
  now: string;
  tail?: number;
}): PilotTelemetry {
  return {
    emittedAt: input.now,
    metrics: input.metrics,
    recent: input.audit.slice(-(input.tail ?? 25)),
  };
}
