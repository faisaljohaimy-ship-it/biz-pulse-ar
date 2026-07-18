/**
 * Client-side pub/sub for the CURRENT ARIA voice source. Powers the
 * VOICE_DEBUG corner badge so we can SEE (not guess) which engine is
 * speaking at any instant: EL (ElevenLabs, Layan), BR (browser fallback),
 * GRT (static greeting). Amber flashes indicate a failure/fallback.
 */
export type VoiceSource = "elevenlabs" | "browser" | "greeting";
export type VoiceEvent = {
  source: VoiceSource;
  reason: string;
  voiceId?: string;
  status?: number;
  failed?: boolean;
  at: number;
};

type Listener = (e: VoiceEvent | null) => void;

const listeners = new Set<Listener>();
let current: VoiceEvent | null = null;

function isDebugFlagOn(): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> })
      .env;
    if (env?.VITE_VOICE_DEBUG === "true") return true;
    if (
      typeof window !== "undefined" &&
      window.localStorage?.getItem("aria-voice-debug") === "1"
    )
      return true;
  } catch {
    /* ignore */
  }
  return false;
}

function shortVoiceId(id?: string): string {
  return id ? id.slice(0, 6) : "?";
}

export const AriaVoiceDebug = {
  isDebugOn: isDebugFlagOn,

  /** Announce the voice engine that is (about to) speak this utterance. */
  emit(e: Omit<VoiceEvent, "at">): void {
    const evt: VoiceEvent = { ...e, at: Date.now() };
    current = evt;

    console.log(
      `[aria-voice] source=${evt.source} id=${shortVoiceId(evt.voiceId)} reason=${evt.reason}` +
        (typeof evt.status === "number" ? ` status=${evt.status}` : "") +
        (evt.failed ? " FAILED" : ""),
    );
    for (const l of listeners) {
      try {
        l(evt);
      } catch {
        /* ignore */
      }
    }
  },

  clear(): void {
    current = null;
    for (const l of listeners) {
      try {
        l(null);
      } catch {
        /* ignore */
      }
    }
  },

  current(): VoiceEvent | null {
    return current;
  },

  subscribe(l: Listener): () => void {
    listeners.add(l);
    try {
      l(current);
    } catch {
      /* ignore */
    }
    return () => {
      listeners.delete(l);
    };
  },
};

export function isGreetingEnabled(): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> })
      .env;
    if (env?.VITE_GREETING_ENABLED === "false") return false;
    if (
      typeof window !== "undefined" &&
      window.localStorage?.getItem("aria-greeting-off") === "1"
    )
      return false;
  } catch {
    /* ignore */
  }
  return true;
}
