// Checkpoint — capture the mesh state at a point in time.
import type { CapabilityRegistry, Checkpoint, MeshCluster } from "./types";
import { CheckpointInputZ } from "./contracts";

export function captureCheckpoint(input: {
  id: string;
  cluster: MeshCluster;
  registry: CapabilityRegistry;
  capturedAt: string;
}): Checkpoint {
  const payload = {
    id: input.id,
    clusterId: input.cluster.id,
    term: input.cluster.term,
    nodeIds: input.cluster.nodes.map((n) => n.id),
    capabilities: input.registry.entries.slice(),
    capturedAt: input.capturedAt,
  };
  return CheckpointInputZ.parse(payload);
}
