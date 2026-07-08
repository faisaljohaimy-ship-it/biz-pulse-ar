// Engagement (Phase 11.7 façade) — wraps 11.6 engagement-state and adds
// a lightweight session record for continuous conversation context.
import { noteEngagement, getEngagement, resetEngagement } from "./engagement-state.server";
import type { EngagementLevel } from "./types";

export interface EngagementSession {
  readonly id: string;
  readonly startedAt: number;
  readonly lang: "ar" | "en";
  turns: number;
  lastActivity: number;
  lastLevel: EngagementLevel;
}

const S = new Map<string, EngagementSession>();

export function openEngagement(id: string, lang: "ar" | "en"): EngagementSession {
  const cur = S.get(id);
  if (cur) return cur;
  const s: EngagementSession = {
    id,
    startedAt: Date.now(),
    lang,
    turns: 0,
    lastActivity: Date.now(),
    lastLevel: "dormant",
  };
  S.set(id, s);
  return s;
}

export function recordUserInteraction(id: string, kind: "text" | "voice"): EngagementLevel {
  const level = noteEngagement(id, kind === "voice" ? "user_voice" : "user_input");
  const cur = S.get(id);
  if (cur) {
    cur.turns += 1;
    cur.lastActivity = Date.now();
    cur.lastLevel = level;
    S.set(id, cur);
  }
  return level;
}

export function tickEngagement(id: string): EngagementLevel {
  const level = noteEngagement(id, "tick");
  const cur = S.get(id);
  if (cur) {
    cur.lastLevel = level;
    S.set(id, cur);
  }
  return level;
}

export function engagementLevel(id: string): EngagementLevel {
  return getEngagement(id);
}
export function closeEngagement(id: string): void {
  S.delete(id);
  resetEngagement(id);
}
