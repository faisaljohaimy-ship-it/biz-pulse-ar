/**
 * SADEED Voice Timeline — a single append-only ring buffer for every
 * event in the audio pipeline. Populated from audio-bus, SadeedCopilot,
 * aria-voice, and the voice-policy assertion.
 *
 * Local diagnostics are available in the browser console.
 * Production deliberately retains only event tags and timing; raw chat/voice
 * messages, metadata, and stack traces must not be exposed via console or the
 * globally accessible timeline dump.
 */
export type VoiceTag =
  | "CHAT"
  | "STREAM"
  | "SENTENCE"
  | "TTS_REQ"
  | "TTS_RES"
  | "AUDIO_CREATED"
  | "AUDIO_PLAY"
  | "AUDIO_END"
  | "AUDIO_ERROR"
  | "QUEUE"
  | "OWNER"
  | "BUS"
  | "VOICE"
  | "FALLBACK"
  | "SPEECH_SYNTH"
  | "INTERRUPT"
  | "CANCEL"
  | "PREEMPT"
  | "RELEASE"
  | "HTMLAUDIO"
  | "AUDIOCTX"
  | "FETCH"
  | "ASSERTION"
  | "NOTE";

interface VoiceEvent {
  t: number; // ms since page load
  dt: number; // ms since previous event
  tag: VoiceTag;
  msg: string;
  data?: Record<string, unknown>;
  stack?: string;
}

const MAX = 500;
const buf: VoiceEvent[] = [];
let last = -1;

function now(): number {
  if (typeof performance !== "undefined") return Math.round(performance.now());
  return Date.now();
}

export const VoiceTimeline = {
  push(tag: VoiceTag, msg: string, data?: Record<string, unknown>, opts?: { stack?: boolean }) {
    if (typeof window === "undefined") return;
    const t = now();
    const dt = last < 0 ? 0 : t - last;
    last = t;
    // Browser debug surfaces are globally readable. Never retain voice/chat
    // text, arbitrary payloads (which may include credentials), or stacks in production.
    const diagnostic = import.meta.env.DEV;
    const evt: VoiceEvent = { t, dt, tag, msg: diagnostic ? msg : tag };
    if (diagnostic && data) evt.data = data;
    if (diagnostic && opts?.stack) {
      try {
        evt.stack = new Error().stack?.split("\n").slice(2, 6).join("\n");
      } catch {
        /* ignore */
      }
    }
    buf.push(evt);
    if (buf.length > MAX) buf.shift();

    if (diagnostic) console.log(`[${tag}] +${dt}ms ${msg}`, data ?? "");
  },
  dump(): VoiceEvent[] {
    return buf.slice();
  },
  clear() {
    buf.length = 0;
    last = -1;
  },
};

if (typeof window !== "undefined") {
  const w = window as unknown as {
    __ariaTimeline?: VoiceEvent[];
    __dumpSadeedTimeline?: () => void;
    __clearSadeedTimeline?: () => void;
  };
  w.__ariaTimeline = buf;
  w.__dumpSadeedTimeline = () => {
    console.table(buf.map((e) => ({ t: e.t, dt: e.dt, tag: e.tag, msg: e.msg })));
    const json = JSON.stringify(buf, null, 2);
    try {
      navigator.clipboard?.writeText(json).then(
        () => console.log(`[timeline] ${buf.length} events copied to clipboard`),
        () => console.log(json),
      );
    } catch {
      console.log(json);
    }
  };
  w.__clearSadeedTimeline = () => {
    VoiceTimeline.clear();
    console.log("[timeline] cleared");
  };
}
