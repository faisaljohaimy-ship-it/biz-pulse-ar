// Telemetry emitter for deployment layer.
import type { DeploymentMetrics, DeploymentTelemetry, ProbeResult } from "./types";

export function emitTelemetry(input: {
  metrics: DeploymentMetrics;
  probes: ReadonlyArray<ProbeResult>;
  now: string;
}): DeploymentTelemetry {
  return {
    emittedAt: input.now,
    metrics: input.metrics,
    probes: input.probes.slice(),
  };
}
