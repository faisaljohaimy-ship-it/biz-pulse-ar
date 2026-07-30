import type {
  CommercializationAuditEntry,
  CommercializationMetrics,
  CommercializationTelemetry,
} from "./types";

export function emitCommercializationTelemetry(input: {
  metrics: CommercializationMetrics;
  audit: ReadonlyArray<CommercializationAuditEntry>;
  now: string;
  tail?: number;
}): CommercializationTelemetry {
  return {
    emittedAt: input.now,
    metrics: input.metrics,
    recent: input.audit.slice(-(input.tail ?? 25)),
  };
}
