/**
 * ARIA Global Audio Arbiter — the ONE channel every ARIA voice source must
 * pass through. Guarantees zero overlap: acquiring the channel hard-stops
 * whatever is currently playing (unless the caller has a lower priority
 * than the current owner).
 */
import { VoiceTimeline } from "./voice-timeline";

type Source = "hero-greeting" | "panel-greeting" | "chat-tts";

const PRIORITY: Record<Source, number> = {
  "hero-greeting": 1,
  "panel-greeting": 2,
  "chat-tts": 3,
};


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
  for (const l of listeners) { try { l(e); } catch { /* ignore */ } }
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
      try { s.cancel(); } catch { /* ignore */ }
      console.warn("[aria-voice] watchdog killed rogue speechSynthesis");
    }
  }, 250);
}
function stopWatchdog() {
  if (watchdogTimer != null) { clearInterval(watchdogTimer); watchdogTimer = null; }
}



// Module-scope singleton — survives React remounts, StrictMode double-invoke,
// and any component re-registration. The ONLY way to reset is a full reload.
let greetingPlayedThisSession = false;

// ── Runtime assertion: browser SpeechSynthesis is ONLY legal in Greeting
// Mode. Any speak() while chat-tts owns the channel (or no greeting owns
// it) throws immediately, naming the offender via stack trace.
if (typeof window !== "undefined" && window.speechSynthesis) {
  const nativeSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
    const owner = current?.source ?? null;
    const isGreeting = owner === "hero-greeting" || owner === "panel-greeting";
    if (!isGreeting) {
      const err = new Error(
        `[aria-voice] ASSERTION: browser SpeechSynthesis invoked outside Greeting Mode (owner=${owner ?? "none"})`,
      );
      console.error(err);
      throw err;
    }
    console.log("[aria-voice] speechSynthesis.speak allowed (greeting mode)", { owner });
    return nativeSpeak(u);
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

  /** True if the auto-greeting has already been claimed this session. */
  hasGreeted(): boolean {
    return greetingPlayedThisSession;
  },
  /** Atomic claim — returns true only for the FIRST caller this session. */
  claimGreeting(): boolean {
    if (greetingPlayedThisSession) return false;
    greetingPlayedThisSession = true;
    return true;
  },
  /** For the on-demand replay chip: force replay without resetting the flag. */
  forceReplayGreeting() {
    greetingPlayedThisSession = true;
  },


  /**
   * Request the voice channel. Returns true if granted.
   * Granting ALWAYS hard-stops whatever is playing first.
   */
  acquire(source: Source, stop: StopFn): boolean {
    if (current && PRIORITY[source] < PRIORITY[current.source]) {
      console.log("[aria-bus] acquire DENIED", { requested: source, owner: current.source });
      return false;
    }
    if (current) {
      const prev = current.source;
      console.log("[aria-bus] preempting owner", { prev, next: source });
      try { current.stop(); } catch { /* ignore */ }
      if (currentAudioEl) { emit({ kind: "stopped", source: prev }); currentAudioEl = null; }
      emit({ kind: "end", source: prev });
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    current = { source, stop };
    console.log("[aria-bus] ACQUIRED", { owner: source, provider: source === "chat-tts" ? "elevenlabs-queue" : "greeting" });
    if (source === "chat-tts") startWatchdog(); else stopWatchdog();
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
    emit({ kind: "playing", source, audioEl: currentAudioEl });
  },

  /** Signal audio has stopped (ended / pause / interrupt). Motion freezes. */
  notifyStopped(source: Source) {
    if (current?.source !== source) return;
    if (currentAudioEl) currentAudioEl = null;
    emit({ kind: "stopped", source });
  },

  release(source: Source) {
    if (current?.source === source) {
      console.log("[aria-bus] RELEASED", { owner: source });
      if (currentAudioEl) { emit({ kind: "stopped", source }); currentAudioEl = null; }
      current = null;
      stopWatchdog();
      emit({ kind: "end", source });
    }
  },

  stopAll() {
    if (current) {
      const prev = current.source;
      try { current.stop(); } catch { /* ignore */ }
      if (currentAudioEl) { emit({ kind: "stopped", source: prev }); currentAudioEl = null; }
      current = null;
      stopWatchdog();
      emit({ kind: "end", source: prev });
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }

  },


  /** Subscribe to start/end events. Returns unsubscribe fn. */
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => { listeners.delete(l); };
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
