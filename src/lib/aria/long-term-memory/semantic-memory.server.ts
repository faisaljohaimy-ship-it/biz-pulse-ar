/**
 * Semantic memory: facts, SOPs, definitions, policies.
 */

import type { CaptureInput } from "./contracts";
import { captureRecord } from "./capture.server";
import { listRecords } from "./memory-store.server";
import type { MemoryRecord } from "./types";

export function captureFact(input: Omit<CaptureInput, "kind">): MemoryRecord {
  return captureRecord("semantic", input);
}

export function listFacts(workspace_id?: string): readonly MemoryRecord[] {
  return listRecords(workspace_id).filter((r) => r.kind === "semantic");
}
