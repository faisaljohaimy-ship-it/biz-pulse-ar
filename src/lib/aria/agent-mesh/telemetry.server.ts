// Telemetry emitter for agent mesh.
import type {
  MeshHealthReport,
  MeshMetrics,
  MeshTelemetry,
  PartitionReport,
} from "./types";

export function emitTelemetry(input: {
  metrics: MeshMetrics;
  health: ReadonlyArray<MeshHealthReport>;
  partition: PartitionReport | null;
  now: string;
}): MeshTelemetry {
  return {
    emittedAt: input.now,
    metrics: input.metrics,
    health: input.health.slice(),
    partition: input.partition,
  };
}
