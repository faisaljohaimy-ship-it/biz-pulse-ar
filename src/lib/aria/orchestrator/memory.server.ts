/**
 * Mission history — references only. Executive Memory itself is owned
 * by Phase 6 (`executive-brain/memory.server.ts`) and is NOT duplicated.
 * We keep a tiny per-session ring of mission ids so the UI/audit layer
 * can look up which missions ran without re-loading full memory.
 */
import { loadMemory } from "../executive-brain/memory.server";
import type { ExecutiveBrainMemory } from "../executive-brain/types";

interface MissionRef {
  mission_id: string;
  intent: string;
  ts: string;
}

const HISTORY_LIMIT = 20;
const missionRefs = new Map<string, MissionRef[]>();

export function recordMissionRef(sessionId: string, ref: MissionRef): void {
  const list = missionRefs.get(sessionId) ?? [];
  list.push(ref);
  while (list.length > HISTORY_LIMIT) list.shift();
  missionRefs.set(sessionId, list);
}

export function listMissionRefs(sessionId: string): MissionRef[] {
  return missionRefs.get(sessionId) ?? [];
}

export function loadSharedMemory(sessionId: string | undefined): ExecutiveBrainMemory | null {
  if (!sessionId) return null;
  try {
    return loadMemory(sessionId);
  } catch {
    return null;
  }
}
