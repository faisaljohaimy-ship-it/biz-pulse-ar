import type { OpsAuditEntry, OpsMetrics, OpsTelemetry } from "./types";

export function emitOpsTelemetry(input: {
  metrics: OpsMetrics;
  audit: ReadonlyArray<OpsAuditEntry>;
  now: string;
  tail?: number;
}): OpsTelemetry {
  const tail = input.tail ?? 25;
  return { emittedAt: input.now, metrics: input.metrics, recent: input.audit.slice(-tail) };
}
