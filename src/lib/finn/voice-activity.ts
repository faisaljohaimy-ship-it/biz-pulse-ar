export type FinnVoiceActivityDecision = "continue" | "complete" | "no-speech";

export type FinnVoiceActivityState = {
  startedAt: number;
  candidateVoiceAt: number | null;
  lastVoiceAt: number | null;
  heardVoice: boolean;
};

export type FinnVoiceActivityConfig = {
  rmsThreshold: number;
  minimumVoiceMs: number;
  silenceMs: number;
  noSpeechMs: number;
  maximumCaptureMs: number;
};

export const FINN_VOICE_ACTIVITY_DEFAULTS: FinnVoiceActivityConfig = {
  // Tuned for fast mobile conversation turns: accept softer phone mics,
  // submit shortly after speech stops, and avoid long "silent listening" waits.
  // silenceMs 650: end-of-speech fires ~150ms sooner than the old 800 so the
  // reply starts faster in «مخاطبة» — still well above natural mid-clause
  // pauses (~300–450ms) so it does not cut a thinking speaker off.
  rmsThreshold: 0.008,
  minimumVoiceMs: 90,
  silenceMs: 650,
  noSpeechMs: 7_000,
  maximumCaptureMs: 18_000,
};

export function createFinnVoiceActivityState(startedAt: number): FinnVoiceActivityState {
  return {
    startedAt,
    candidateVoiceAt: null,
    lastVoiceAt: null,
    heardVoice: false,
  };
}

/**
 * Advance the recorder's small client-side voice activity detector.
 *
 * It intentionally uses only signal energy. No transcript, audio sample, or
 * biometric data leaves this function. Sustained energy is required before
 * speech is accepted so a tap/click spike does not submit an empty turn.
 */
export function advanceFinnVoiceActivity(input: {
  state: FinnVoiceActivityState;
  rms: number;
  now: number;
  config?: FinnVoiceActivityConfig;
}): {
  state: FinnVoiceActivityState;
  decision: FinnVoiceActivityDecision;
} {
  const config = input.config ?? FINN_VOICE_ACTIVITY_DEFAULTS;
  const now = Math.max(input.state.startedAt, input.now);
  const rms = Number.isFinite(input.rms) ? Math.max(0, input.rms) : 0;
  let candidateVoiceAt = input.state.candidateVoiceAt;
  let lastVoiceAt = input.state.lastVoiceAt;
  let heardVoice = input.state.heardVoice;

  if (rms >= config.rmsThreshold) {
    candidateVoiceAt ??= now;
    if (heardVoice || now - candidateVoiceAt >= config.minimumVoiceMs) {
      heardVoice = true;
      lastVoiceAt = now;
    }
  } else {
    candidateVoiceAt = null;
  }

  const state = {
    startedAt: input.state.startedAt,
    candidateVoiceAt,
    lastVoiceAt,
    heardVoice,
  };
  const elapsed = now - state.startedAt;

  if (elapsed >= config.maximumCaptureMs) {
    return { state, decision: heardVoice ? "complete" : "no-speech" };
  }
  if (!heardVoice && elapsed >= config.noSpeechMs) {
    return { state, decision: "no-speech" };
  }
  if (heardVoice && lastVoiceAt !== null && now - lastVoiceAt >= config.silenceMs) {
    return { state, decision: "complete" };
  }
  return { state, decision: "continue" };
}
