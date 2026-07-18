/**
 * ARIA Voice Timeline — a single append-only ring buffer for every
 * event in the audio pipeline. Populated from audio-bus, useAriaSpeech,
 * AriaCopilot, aria-voice, and the SpeechSynthesis assertion.
 *
 * In the browser console:
 *   __dumpAriaTimeline()          → console.table + copy JSON to clipboard
 *   __clearAriaTimeline()         → reset the buffer
 *   __ariaTimeline                → raw array
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
let last = 0;

function now(): number {
  if (typeof performance !== "undefined") return Math.round(performance.now());
  return Date.now();
}

export const VoiceTimeline = {
  push(tag: VoiceTag, msg: string, data?: Record<string, unknown>, opts?: { stack?: boolean }) {
    if (typeof window === "undefined") return;
    const t = now();
    const dt = last ? t - last : 0;
    last = t;
    const evt: VoiceEvent = { t, dt, tag, msg, data };
    if (opts?.stack) {
      try {
        evt.stack = new Error().stack?.split("\n").slice(2, 6).join("\n");
      } catch {
        /* ignore */
      }
    }
    buf.push(evt);
    if (buf.length > MAX) buf.shift();

    console.log(`[${tag}] +${dt}ms ${msg}`, data ?? "");
  },
  dump(): VoiceEvent[] {
    return buf.slice();
  },
  clear() {
    buf.length = 0;
    last = 0;
  },
};

if (typeof window !== "undefined") {
  const w = window as unknown as {
    __ariaTimeline?: VoiceEvent[];
    __dumpAriaTimeline?: () => void;
    __clearAriaTimeline?: () => void;
  };
  w.__ariaTimeline = buf;
  w.__dumpAriaTimeline = () => {
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
  w.__clearAriaTimeline = () => {
    VoiceTimeline.clear();
    console.log("[timeline] cleared");
  };
}
