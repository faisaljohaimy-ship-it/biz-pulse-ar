export type SadeedVoiceActivityDecision = "continue" | "complete" | "no-speech";

export type SadeedVoiceActivityState = {
  startedAt: number;
  candidateVoiceAt: number | null;
  lastVoiceAt: number | null;
  heardVoice: boolean;
};

export type SadeedVoiceActivityConfig = {
  rmsThreshold: number;
  minimumVoiceMs: number;
  silenceMs: number;
  noSpeechMs: number;
  maximumCaptureMs: number;
};

export const SADEED_VOICE_ACTIVITY_DEFAULTS: SadeedVoiceActivityConfig = {
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

export function createSadeedVoiceActivityState(startedAt: number): SadeedVoiceActivityState {
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
export function advanceSadeedVoiceActivity(input: {
  state: SadeedVoiceActivityState;
  rms: number;
  now: number;
  config?: SadeedVoiceActivityConfig;
}): {
  state: SadeedVoiceActivityState;
  decision: SadeedVoiceActivityDecision;
} {
  const config = input.config ?? SADEED_VOICE_ACTIVITY_DEFAULTS;
  const previous = input.state;
  const startedAt = previous.startedAt;
  const now = Math.max(startedAt, input.now);
  const noSpeechAt = startedAt + config.noSpeechMs;
  let heardVoice = previous.heardVoice;
  // Invalid clocks must not bypass deadlines or qualify untrusted audio frames.
  // Pre-deadline speech candidates still receive their voice qualification grace.
  if (
    !Number.isFinite(
      startedAt + input.now + (previous.candidateVoiceAt ?? 0) + (previous.lastVoiceAt ?? 0),
    ) ||
    (!heardVoice && now >= noSpeechAt && (previous.candidateVoiceAt ?? now) >= noSpeechAt)
  ) {
    return { state: previous, decision: heardVoice ? "complete" : "no-speech" };
  }

  let candidateVoiceAt = previous.candidateVoiceAt;
  let lastVoiceAt = previous.lastVoiceAt;

  if (Number.isFinite(input.rms) && Math.max(0, input.rms) >= config.rmsThreshold) {
    candidateVoiceAt ??= now;
    if (heardVoice || now - candidateVoiceAt >= config.minimumVoiceMs) {
      heardVoice = true;
      lastVoiceAt = now;
    }
  } else {
    candidateVoiceAt = null;
  }

  const state = {
    startedAt,
    candidateVoiceAt,
    lastVoiceAt,
    heardVoice,
  };

  // The absolute capture cap still takes precedence for established speech.
  let decision: SadeedVoiceActivityDecision = "continue";
  if (now - startedAt >= config.maximumCaptureMs) {
    decision = heardVoice ? "complete" : "no-speech";
  } else if (!heardVoice && now >= noSpeechAt && candidateVoiceAt === null) {
    decision = "no-speech";
  } else if (heardVoice && lastVoiceAt !== null && now - lastVoiceAt >= config.silenceMs) {
    decision = "complete";
  }
  return { state, decision };
}
