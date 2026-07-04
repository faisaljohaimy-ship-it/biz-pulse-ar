/**
 * ARIA Global Audio Arbiter — the ONE channel every ARIA voice source must
 * pass through. Guarantees zero overlap: acquiring the channel hard-stops
 * whatever is currently playing (unless the caller has a lower priority
 * than the current owner).
 */
type Source = "hero-greeting" | "panel-greeting" | "chat-tts";

const PRIORITY: Record<Source, number> = {
  "hero-greeting": 1,
  "panel-greeting": 2,
  "chat-tts": 3,
};

type StopFn = () => void;

let current: { source: Source; stop: StopFn } | null = null;
let unlocked = false;

// Module-scope singleton — survives React remounts, StrictMode double-invoke,
// and any component re-registration. The ONLY way to reset is a full reload.
let greetingPlayedThisSession = false;

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
    if (current && PRIORITY[source] < PRIORITY[current.source]) return false;
    if (current) {
      try {
        current.stop();
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    current = { source, stop };
    return true;
  },

  release(source: Source) {
    if (current?.source === source) current = null;
  },

  stopAll() {
    if (current) {
      try {
        current.stop();
      } catch {
        /* ignore */
      }
      current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => AriaAudioBus.stopAll());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") AriaAudioBus.stopAll();
  });
}
