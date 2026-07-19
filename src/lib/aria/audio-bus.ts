/**
 * ARIA Global Audio Arbiter — the ONE channel every ARIA voice source must
 * pass through. Guarantees zero overlap: acquiring the channel hard-stops
 * whatever is currently playing (unless the caller has a lower priority
 * than the current owner).
 */
import { VoiceTimeline } from "./voice-timeline";

// The four live voice sources: homepage greeting, specialist-agent speech,
// the conversation greeting, and reply TTS. ARIA chat always wins;
// specialist narration may preempt the homepage but never ARIA.
type Source = "hero-soundtrack" | "agent-tts" | "conversation-greeting" | "chat-tts";

// Contract (agent-voice-contract.test.ts): "agent-tts": 2 and "chat-tts": 3
// are pinned. The conversation greeting shares the agent tier — ARIA reply
// TTS (chat-tts) always outranks everything.
const PRIORITY: Record<Source, number> = {
  "hero-soundtrack": 1,
  "agent-tts": 2,
  "conversation-greeting": 2,
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

function emit(e: BusEvent) {
  for (const l of listeners) {
    try {
      l(e);
    } catch {
      /* ignore */
    }
  }
}

export const AriaAudioBus = {
  /** Call from the FIRST user gesture (any tap). Unlocks autoplay on iOS. */
  unlock() {
    unlocked = true;
  },
  isUnlocked() {
    return unlocked;
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
      console.warn("[aria-audio-bus] acquire REFUSED — no user gesture yet", {
        source,
        stack,
      });
      VoiceTimeline.push("OWNER", "acquire REFUSED (no gesture)", {
        source,
        stack,
      });
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
      VoiceTimeline.push("PREEMPT", "owner preempted", {
        prev,
        next: source,
        stack,
      });
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
    current = { source, stop };
    VoiceTimeline.push("OWNER", "ACQUIRED", {
      owner: source,
      provider:
        source === "chat-tts"
          ? "elevenlabs-layan-queue"
          : source === "conversation-greeting"
            ? "elevenlabs-layan-greeting"
            : source === "agent-tts"
              ? "elevenlabs-layan-agent"
              : "greeting",
      stack,
      bypass,
    });
    emit({ kind: "start", source });
    return true;
  },

  /**
   * Signal that real audio playback has begun (audio element 'playing' event
   * ). This is the single clock that
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
      emit({ kind: "end", source: prev });
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
