/**
 * ARIA Global Audio Arbiter — the ONE channel every ARIA voice source must
 * pass through. Guarantees zero overlap: acquiring the channel hard-stops
 * whatever is currently playing (unless the caller has a lower priority
 * than the current owner).
 */
import { VoiceTimeline } from "./voice-timeline";

// The three live voice sources: homepage greeting, specialist-agent speech,
// and the copilot's Conversation-Mode reply TTS. ARIA chat always wins;
// specialist narration may preempt the greeting but never ARIA.
type Source = "hero-soundtrack" | "agent-tts" | "chat-tts";

const PRIORITY: Record<Source, number> = {
  "hero-soundtrack": 1,
  "agent-tts": 2,
  "chat-tts": 3,
};

// Owners allowed to bypass the "no gesture yet" guard when they pass
// { bypassGesture: true }. Only the hero soundtrack's optimistic first
// autoplay may do this — every ARIA / tour owner MUST wait for a real
// user gesture (via AriaAudioBus.unlock()).
const BYPASS_ALLOWED: ReadonlySet<Source> = new Set<Source>(["hero-soundtrack"]);

type StopFn = () => void;
type BusEvent =
  | { kind: "start" | "end"; source: Source }
  | { kind: "playing"; source: Source; audioEl?: HTMLMediaElement | null }
  | { kind: "stopped"; source: Source };
type Listener = (e: BusEvent) => void;

let current: { source: Source; stop: StopFn } | null = null;
let currentAudioEl: HTMLMediaElement | null = null;
let unlocked = false;
const listeners = new Set<Listener>();

let browserSpeech: SpeechSynthesis | null = null;
let nativeSpeak: ((utterance: SpeechSynthesisUtterance) => void) | null = null;
let nativeCancel: (() => void) | null = null;

function emit(e: BusEvent) {
  for (const l of listeners) {
    try {
      l(e);
    } catch {
      /* ignore */
    }
  }
}

// Double-voice watchdog — while chat-tts owns the channel, forcibly cancel
// any rogue browser speechSynthesis every 250ms so ARIA can NEVER be
// shadowed by a second voice.
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
function startWatchdog() {
  if (watchdogTimer != null) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  watchdogTimer = setInterval(() => {
    if (!current || current.source !== "chat-tts") return;
    const s = window.speechSynthesis;
    if (s && (s.speaking || s.pending)) {
      try {
        s.cancel();
      } catch {
        /* ignore */
      }

      console.warn("[aria] OVERLAP killed (rogue speechSynthesis while chat-tts owns bus)");
    }
  }, 250);
}
function stopWatchdog() {
  if (watchdogTimer != null) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

// Capture the native engine once, then block every direct call. Specialist
// speech can reach it only through speakAgentUtterance while agent-tts owns
// the arbiter. ARIA never uses this engine; she remains ElevenLabs-only.
if (typeof window !== "undefined" && window.speechSynthesis) {
  browserSpeech = window.speechSynthesis;
  nativeSpeak = browserSpeech.speak.bind(browserSpeech);
  nativeCancel = browserSpeech.cancel.bind(browserSpeech);
  window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
    const owner = current?.source ?? null;
    const stack = new Error().stack?.split("\n").slice(2, 6).join(" | ");
    VoiceTimeline.push("SPEECH_SYNTH", "direct speak() BLOCKED (use governed agent voice)", {
      owner,
      lang: u.lang,
      voice: u.voice?.name,
      text: u.text?.slice(0, 60),
      stack,
    });
    console.warn("[agent-voice] ungoverned browser speech blocked", { owner });
    return;
  };
  window.speechSynthesis.cancel = () => {
    VoiceTimeline.push("CANCEL", "speechSynthesis.cancel()", { owner: current?.source ?? null });
    return nativeCancel?.();
  };
}

export const AriaAudioBus = {
  /** Call from the FIRST user gesture (any tap). Unlocks autoplay on iOS. */
  unlock() {
    unlocked = true;
  },
  isUnlocked() {
    return unlocked;
  },

  /** Free voices currently exposed by the user's browser/operating system. */
  systemVoices(): SpeechSynthesisVoice[] {
    try {
      return browserSpeech?.getVoices() ?? [];
    } catch {
      return [];
    }
  },

  /**
   * The only authorized bridge to browser speech. It succeeds exclusively
   * while the specialist channel owns the bus; callers cannot use it for ARIA.
   */
  speakAgentUtterance(utterance: SpeechSynthesisUtterance): boolean {
    if (current?.source !== "agent-tts" || !nativeSpeak) return false;
    VoiceTimeline.push("SPEECH_SYNTH", "governed free agent voice", {
      owner: current.source,
      lang: utterance.lang,
      voice: utterance.voice?.name ?? "system-default",
      text: utterance.text.slice(0, 60),
    });
    nativeSpeak(utterance);
    return true;
  },

  cancelAgentUtterance(): void {
    if (current?.source !== "agent-tts") return;
    try {
      nativeCancel?.();
    } catch {
      /* ignore */
    }
  },

  /**
   * Request the voice channel. Returns true if granted.
   * Granting ALWAYS hard-stops whatever is playing first.
   */
  acquire(source: Source, stop: StopFn, opts?: { bypassGesture?: boolean }): boolean {
    const stack = new Error().stack?.split("\n").slice(2, 5).join(" | ");
    // Global no-autoplay guard: refuse any AUDIBLE source unless the bus has
    // been unlocked by a real user gesture. AriaAudioBus.unlock() MUST be
    // called from inside a click / tap / keydown handler. This blocks all
    // on-mount / on-load / on-scroll audio, no matter which component tries.
    // EXEMPTION: the hero soundtrack's ONE optimistic mount-time attempt may
    // pass { bypassGesture: true }. No ARIA / tour source is ever exempt.
    const bypass = opts?.bypassGesture === true && BYPASS_ALLOWED.has(source);
    if (!unlocked && !bypass) {
      console.warn("[aria-audio-bus] acquire REFUSED — no user gesture yet", { source, stack });
      VoiceTimeline.push("OWNER", "acquire REFUSED (no gesture)", { source, stack });
      return false;
    }
    if (current && PRIORITY[source] < PRIORITY[current.source]) {
      VoiceTimeline.push("OWNER", "acquire DENIED (lower priority)", {
        requested: source,
        owner: current.source,
        stack,
      });
      return false;
    }
    if (current) {
      const prev = current.source;
      VoiceTimeline.push("PREEMPT", "owner preempted", { prev, next: source, stack });
      try {
        current.stop();
      } catch {
        /* ignore */
      }
      if (currentAudioEl) {
        emit({ kind: "stopped", source: prev });
        currentAudioEl = null;
      }
      emit({ kind: "end", source: prev });
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    current = { source, stop };
    VoiceTimeline.push("OWNER", "ACQUIRED", {
      owner: source,
      provider:
        source === "chat-tts"
          ? "elevenlabs-queue"
          : source === "agent-tts"
            ? "free-system-agent-voice"
            : "greeting",
      stack,
      bypass,
    });
    if (source === "chat-tts") startWatchdog();
    else stopWatchdog();
    emit({ kind: "start", source });
    return true;
  },

  /**
   * Signal that real audio playback has begun (audio element 'playing' event
   * OR SpeechSynthesisUtterance.onstart). This is the single clock that
   * drives motion — video starts here, never before.
   */
  notifyPlaying(source: Source, audioEl?: HTMLMediaElement | null) {
    if (current?.source !== source) return;
    currentAudioEl = audioEl ?? null;
    VoiceTimeline.push("BUS", "notifyPlaying", { source, hasEl: !!audioEl });
    emit({ kind: "playing", source, audioEl: currentAudioEl });
  },

  /** Signal audio has stopped (ended / pause / interrupt). Motion freezes. */
  notifyStopped(source: Source) {
    if (current?.source !== source) return;
    if (currentAudioEl) currentAudioEl = null;
    VoiceTimeline.push("BUS", "notifyStopped", { source });
    emit({ kind: "stopped", source });
  },

  release(source: Source) {
    if (current?.source === source) {
      VoiceTimeline.push("RELEASE", "released", { owner: source });
      if (currentAudioEl) {
        emit({ kind: "stopped", source });
        currentAudioEl = null;
      }
      current = null;
      stopWatchdog();
      emit({ kind: "end", source });
    }
  },

  stopAll() {
    if (current) {
      const prev = current.source;
      try {
        current.stop();
      } catch {
        /* ignore */
      }
      if (currentAudioEl) {
        emit({ kind: "stopped", source: prev });
        currentAudioEl = null;
      }
      current = null;
      stopWatchdog();
      emit({ kind: "end", source: prev });
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
  },

  /** Subscribe to start/end events. Returns unsubscribe fn. */
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },

  /** Current owner source, or null if idle. */
  currentSource(): Source | null {
    return current?.source ?? null;
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => AriaAudioBus.stopAll());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") AriaAudioBus.stopAll();
  });
}
