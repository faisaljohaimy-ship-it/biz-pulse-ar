// Voice session — tracks a single voice conversation lifecycle.
// Does not perform TTS/STT itself; it coordinates external providers.
import type { Lang } from "./types";

export interface VoiceSession {
  readonly id: string;
  readonly startedAt: number;
  readonly lang: Lang;
  endedAt?: number;
  activeTurnId?: string | null;
  mic: "off" | "listening" | "muted";
  tts: "idle" | "playing" | "aborted";
}

const SESSIONS = new Map<string, VoiceSession>();

function makeId(): string {
  return `vs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function openVoiceSession(lang: Lang): VoiceSession {
  const s: VoiceSession = {
    id: makeId(),
    startedAt: Date.now(),
    lang,
    mic: "off",
    tts: "idle",
  };
  SESSIONS.set(s.id, s);
  return s;
}

export function updateVoiceSession(id: string, patch: Partial<VoiceSession>): VoiceSession | null {
  const cur = SESSIONS.get(id);
  if (!cur) return null;
  const next: VoiceSession = { ...cur, ...patch };
  SESSIONS.set(id, next);
  return next;
}

export function closeVoiceSession(id: string): void {
  const cur = SESSIONS.get(id);
  if (!cur) return;
  SESSIONS.set(id, { ...cur, endedAt: Date.now(), mic: "off", tts: "idle" });
}

export function getVoiceSession(id: string): VoiceSession | null {
  return SESSIONS.get(id) ?? null;
}
