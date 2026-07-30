// Snapshot — persistable digest of a checkpoint.
import type { Checkpoint, Snapshot } from "./types";
import { SnapshotInputZ } from "./contracts";

export function captureSnapshot(input: {
  id: string;
  checkpoint: Checkpoint;
  digest: string;
  sizeBytes: number;
  capturedAt: string;
}): Snapshot {
  return SnapshotInputZ.parse({
    id: input.id,
    checkpointId: input.checkpoint.id,
    digest: input.digest,
    sizeBytes: input.sizeBytes,
    capturedAt: input.capturedAt,
  });
}
