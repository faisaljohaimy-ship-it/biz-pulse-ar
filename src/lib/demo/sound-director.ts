// Executive Demo — Sound Director
// Subtle procedural WebAudio cues (no assets, no network). GPU-cheap.
// Phase 4.2 · Executive Cinematic Experience

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, durationMs: number, gain = 0.06, type: OscillatorType = "sine") {
  const ac = ensureCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = ac.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.connect(g).connect(ac.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

export const soundDirector = {
  /** Unlock the AudioContext inside a user gesture. Safe no-op otherwise. */
  unlock() { ensureCtx()?.resume().catch(() => {}); },
  click()         { tone(880, 90, 0.04, "triangle"); },
  stepAdvance()   { tone(660, 140, 0.05, "sine"); setTimeout(() => tone(990, 160, 0.04, "sine"), 90); },
  notification()  { tone(1320, 120, 0.05, "sine"); setTimeout(() => tone(1760, 140, 0.04, "sine"), 110); },
  ambient()       { tone(220, 500, 0.02, "sine"); },
};
