/**
 * Decision memory: recommendations, approvals, rejections.
 */

import type { CaptureInput } from "./contracts";
import { captureRecord } from "./capture.server";
import { listRecords } from "./memory-store.server";
import type { MemoryRecord } from "./types";

export function captureDecision(
  input: Omit<CaptureInput, "kind">,
): MemoryRecord {
  return captureRecord("decision", input);
}

export function listDecisions(workspace_id?: string): readonly MemoryRecord[] {
  return listRecords(workspace_id).filter((r) => r.kind === "decision");
}
