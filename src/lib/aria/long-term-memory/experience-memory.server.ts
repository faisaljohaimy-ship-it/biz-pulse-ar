/**
 * Experience memory: failures, successes, lessons.
 *
 * This module does NOT reach into the Self-Evolution engine — it only
 * stores the experience-shaped memory record. Cross-referencing to
 * evolution ExperienceRecords happens via EvidenceRef `kind: "experience"`.
 */

import type { CaptureInput } from "./contracts";
import { captureRecord } from "./capture.server";
import { listRecords } from "./memory-store.server";
import type { MemoryRecord } from "./types";

export function captureExperience(
  input: Omit<CaptureInput, "kind">,
): MemoryRecord {
  return captureRecord("experience", input);
}

export function listExperiences(workspace_id?: string): readonly MemoryRecord[] {
  return listRecords(workspace_id).filter((r) => r.kind === "experience");
}
