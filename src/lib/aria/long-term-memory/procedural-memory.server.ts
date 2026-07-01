/**
 * Procedural memory: workflows, steps, playbooks.
 */

import type { CaptureInput } from "./contracts";
import { captureRecord } from "./capture.server";
import { listRecords } from "./memory-store.server";
import type { MemoryRecord } from "./types";

export function captureProcedure(
  input: Omit<CaptureInput, "kind">,
): MemoryRecord {
  return captureRecord("procedural", input);
}

export function listProcedures(workspace_id?: string): readonly MemoryRecord[] {
  return listRecords(workspace_id).filter((r) => r.kind === "procedural");
}
