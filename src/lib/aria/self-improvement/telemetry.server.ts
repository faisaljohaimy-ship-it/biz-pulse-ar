// Telemetry emitter.
import type {
  SelfImprovementAuditEntry,
  SelfImprovementMetrics,
  SelfImprovementTelemetry,
} from "./types";

export function emitTelemetry(input: {
  metrics: SelfImprovementMetrics;
  audit: ReadonlyArray<SelfImprovementAuditEntry>;
  now: string;
  tail?: number;
}): SelfImprovementTelemetry {
  const tail = input.tail ?? 25;
  const recent = input.audit.slice(-tail);
  return { emittedAt: input.now, metrics: input.metrics, recentAudit: recent };
}
