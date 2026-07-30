/**
 * Deduplication — merges duplicate tasks within a mission using a
 * composite signature (mission + agent + context sig + payload hash)
 * within a rolling time window. Duplicates are merged and receive the
 * canonical task's result.
 */
import type { Task } from "./types";

const DEDUPE_WINDOW_MS = 15_000;

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Fast, stable non-crypto hash — sufficient for in-process dedupe. */
function hash(input: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function taskSignature(
  task: Pick<Task, "missionId" | "agentId" | "contextSignature" | "payload">,
): string {
  return `${task.missionId}::${task.agentId}::${task.contextSignature ?? ""}::${hash(stableStringify(task.payload ?? {}))}`;
}

/** Find a mergeable canonical task inside the recent-live map. */
export function findDuplicate(
  candidate: Pick<Task, "missionId" | "agentId" | "contextSignature" | "payload" | "createdAt">,
  live: Iterable<Task>,
): Task | null {
  const sig = taskSignature(candidate);
  const now = Date.parse(candidate.createdAt);
  for (const t of live) {
    if (t.status === "completed" || t.status === "failed" || t.status === "cancelled") continue;
    if (taskSignature(t) !== sig) continue;
    const age = now - Date.parse(t.createdAt);
    if (age <= DEDUPE_WINDOW_MS) return t;
  }
  return null;
}
