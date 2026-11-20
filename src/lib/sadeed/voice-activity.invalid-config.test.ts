import { describe, expect, it } from "vitest";
import {
  advanceSadeedVoiceActivity,
  createSadeedVoiceActivityState,
  SADEED_VOICE_ACTIVITY_DEFAULTS,
} from "./voice-activity";

describe("SADEED voice activity — invalid runtime thresholds", () => {
  it.each([
    ["zero RMS threshold", { rmsThreshold: 0 }],
    ["negative RMS threshold", { rmsThreshold: -1 }],
    ["NaN RMS threshold", { rmsThreshold: Number.NaN }],
    ["zero minimum speech time", { minimumVoiceMs: 0 }],
    ["negative minimum speech time", { minimumVoiceMs: -1 }],
    ["infinite minimum speech time", { minimumVoiceMs: Number.POSITIVE_INFINITY }],
    ["zero silence deadline", { silenceMs: 0 }],
    ["negative no-speech deadline", { noSpeechMs: -1 }],
    ["NaN capture deadline", { maximumCaptureMs: Number.NaN }],
    ["infinite capture deadline", { maximumCaptureMs: Number.POSITIVE_INFINITY }],
  ] as const)("fails closed for %s without mutating recorder state", (_label, override) => {
    const config = { ...SADEED_VOICE_ACTIVITY_DEFAULTS, ...override };
    const idle = createSadeedVoiceActivityState(0);
    // An invalid configuration must never treat one noise frame as speech.
    expect(advanceSadeedVoiceActivity({ state: idle, rms: 0.02, now: 100, config })).toEqual({
      state: idle,
      decision: "no-speech",
    });
    const speaking = { ...idle, heardVoice: true, candidateVoiceAt: 20, lastVoiceAt: 60 };
    expect(advanceSadeedVoiceActivity({ state: speaking, rms: 0.02, now: 100, config })).toEqual({
      state: speaking,
      decision: "complete",
    });
  });

  it("preserves sustained speech detection for valid defaults", () => {
    const initial = createSadeedVoiceActivityState(0);
    const first = advanceSadeedVoiceActivity({ state: initial, rms: 0.02, now: 100 });
    const qualified = advanceSadeedVoiceActivity({
      state: first.state,
      rms: 0.02,
      now: 190,
    });
    expect(first.decision).toBe("continue");
    expect(first.state.heardVoice).toBe(false);
    expect(qualified.decision).toBe("continue");
    expect(qualified.state.heardVoice).toBe(true);
  });
});
