/**
 * Episodic memory: events, incidents, conversations, missions.
 */

import type { CaptureInput } from "./contracts";
import { captureRecord } from "./capture.server";
import { listRecords } from "./memory-store.server";
import type { MemoryRecord } from "./types";

export function captureEpisode(input: Omit<CaptureInput, "kind">): MemoryRecord {
  return captureRecord("episodic", input);
}

export function listEpisodes(workspace_id?: string): readonly MemoryRecord[] {
  return listRecords(workspace_id).filter((r) => r.kind === "episodic");
}
