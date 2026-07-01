// Telemetry emitter.
import type { HealthReport, MeshMetrics, MeshTelemetry, PresenceReport } from "./types";

export function emitTelemetry(input: {
  metrics: MeshMetrics;
  health: ReadonlyArray<HealthReport>;
  presence: ReadonlyArray<PresenceReport>;
  now: string;
}): MeshTelemetry {
  return {
    emittedAt: input.now,
    metrics: input.metrics,
    health: input.health.slice(),
    presence: input.presence.slice(),
  };
}
