// Mesh health supervision.
import type { HealthState, MeshHealth } from "./types";
import { MeshHealthZ } from "./contracts";

export function validateMesh(m: MeshHealth): MeshHealth {
  return MeshHealthZ.parse(m);
}

export function summarizeMesh(meshes: ReadonlyArray<MeshHealth>): {
  total: number;
  partitions: number;
  overall: HealthState;
} {
  let partitions = 0;
  let downCount = 0;
  let degradedCount = 0;
  for (const m of meshes) {
    if (m.partitionSuspected) partitions += 1;
    if (m.state === "down") downCount += 1;
    else if (m.state === "degraded") degradedCount += 1;
  }
  let overall: HealthState = "healthy";
  if (meshes.length === 0) overall = "unknown";
  else if (downCount > 0 || partitions > 0) overall = "down";
  else if (degradedCount > 0) overall = "degraded";
  return { total: meshes.length, partitions, overall };
}
