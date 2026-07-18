export type AriaVoiceActivityDecision = "continue" | "complete" | "no-speech";

export type AriaVoiceActivityState = {
  startedAt: number;
  candidateVoiceAt: number | null;
  lastVoiceAt: number | null;
  heardVoice: boolean;
};

export type AriaVoiceActivityConfig = {
  rmsThreshold: number;
  minimumVoiceMs: number;
  silenceMs: number;
  noSpeechMs: number;
  maximumCaptureMs: number;
};

export const ARIA_VOICE_ACTIVITY_DEFAULTS: AriaVoiceActivityConfig = {
  rmsThreshold: 0.018,
  minimumVoiceMs: 120,
  silenceMs: 1_250,
  noSpeechMs: 10_000,
  maximumCaptureMs: 30_000,
};

export function createAriaVoiceActivityState(
  startedAt: number,
): AriaVoiceActivityState {
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
export function advanceAriaVoiceActivity(input: {
  state: AriaVoiceActivityState;
  rms: number;
  now: number;
  config?: AriaVoiceActivityConfig;
}): {
  state: AriaVoiceActivityState;
  decision: AriaVoiceActivityDecision;
} {
  const config = input.config ?? ARIA_VOICE_ACTIVITY_DEFAULTS;
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
  if (
    heardVoice &&
    lastVoiceAt !== null &&
    now - lastVoiceAt >= config.silenceMs
  ) {
    return { state, decision: "complete" };
  }
  return { state, decision: "continue" };
}
