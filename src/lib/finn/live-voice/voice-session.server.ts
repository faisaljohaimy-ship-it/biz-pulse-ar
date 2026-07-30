// Session store — one active live voice session per session id.
import type { LiveVoiceSession, VoiceLang } from "./types";

const SESSIONS = new Map<string, LiveVoiceSession>();

function uid(): string {
  return `lv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function openLiveVoiceSession(lang: VoiceLang = "ar"): LiveVoiceSession {
  const s: LiveVoiceSession = {
    id: uid(),
    startedAt: Date.now(),
    lang,
    greeted: false,
    activeTurnId: null,
    audio: "idle",
  };
  SESSIONS.set(s.id, s);
  return s;
}

export function getLiveVoiceSession(id: string): LiveVoiceSession | null {
  return SESSIONS.get(id) ?? null;
}

export function updateLiveVoiceSession(
  id: string,
  patch: Partial<Omit<LiveVoiceSession, "id" | "startedAt">>,
): LiveVoiceSession | null {
  const cur = SESSIONS.get(id);
  if (!cur) return null;
  const next: LiveVoiceSession = { ...cur, ...patch };
  SESSIONS.set(id, next);
  return next;
}

export function closeLiveVoiceSession(id: string): void {
  const cur = SESSIONS.get(id);
  if (!cur) return;
  SESSIONS.set(id, { ...cur, endedAt: Date.now(), audio: "idle", activeTurnId: null });
}

/** Enforces single active session per user; closes older ones. */
export function reconcileSingleActive(currentId: string): void {
  for (const [id, s] of SESSIONS) {
    if (id !== currentId && !s.endedAt) closeLiveVoiceSession(id);
  }
}
