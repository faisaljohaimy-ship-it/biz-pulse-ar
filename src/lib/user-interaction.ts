/**
 * User Interaction & Audio Primer
 *
 * Tracks whether the user has interacted with the document in this session
 * AND — on that very first interaction — primes a shared `AudioContext` and
 * plays a silent buffer so that any subsequent audio (ARIA intro, TTS, etc.)
 * can start with sound on ALL devices (mobile / laptop / desktop) without a
 * fresh user gesture.
 *
 * Honest scope: the WHATWG/Chrome/WebKit autoplay policy requires a first
 * gesture per navigation. This module makes that gesture "count for the whole
 * session" so ARIA is effectively hands-free from second interaction onward.
 * Constitution: FR-17 / FR-18.
 */
const KEY = "nexios-user-interacted";
const AUDIO_PRIMED_KEY = "nexios-audio-primed";

let sharedCtx: AudioContext | null = null;

export function hasPriorInteraction(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function isAudioPrimed(): boolean {
  try {
    return window.sessionStorage.getItem(AUDIO_PRIMED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markInteracted(): void {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}

export function getPrimedAudioContext(): AudioContext | null {
  return sharedCtx;
}

function primeAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctor: typeof AudioContext =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new Ctor();
    // Resume inside gesture (required by iOS/Safari).
    void sharedCtx.resume().catch(() => {});
    // Play a 1-frame silent buffer to fully unlock the audio pipeline on iOS.
    const buf = sharedCtx.createBuffer(1, 1, 22050);
    const src = sharedCtx.createBufferSource();
    src.buffer = buf;
    src.connect(sharedCtx.destination);
    src.start(0);
    window.sessionStorage.setItem(AUDIO_PRIMED_KEY, "1");
  } catch {
    /* browser without WebAudio — nothing to prime */
  }
}

let installed = false;
export function installInteractionTracker(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const handler = () => {
    // CONSTITUTION FR-20 — Universal First-Gesture Audio Unlock.
    // A single user gesture MUST unlock the ENTIRE audio pipeline in one
    // synchronous tick: (1) prime shared AudioContext (iOS unlock buffer),
    // (2) unlock the ARIA global audio bus, (3) mark the session as
    // interacted. Any of the three missing → mobile devices refuse voice
    // even though the user tapped. Never split these across async work.
    markInteracted();
    primeAudio();
    // Lazy import to avoid a module cycle (audio-bus imports voice-timeline
    // which is fine, but user-interaction.ts must stay dependency-free at
    // module scope so it can be imported anywhere, including SSR paths).
    void import("./aria/audio-bus")
      .then((m) => { try { m.AriaAudioBus.unlock(); } catch { /* ignore */ } })
      .catch(() => { /* bus unavailable — audio prime alone still helps */ });
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
    window.removeEventListener("touchstart", handler);
    window.removeEventListener("click", handler);
  };
  window.addEventListener("pointerdown", handler, { once: true, passive: true });
  window.addEventListener("keydown", handler, { once: true });
  window.addEventListener("touchstart", handler, { once: true, passive: true });
  window.addEventListener("click", handler, { once: true });
}

