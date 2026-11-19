import { describe, expect, it } from "vitest";
import { advanceSadeedVoiceActivity, createSadeedVoiceActivityState } from "./voice-activity";

describe("SADEED voice activity — non-finite audio clocks", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "fails closed for a malformed sample timestamp %s",
    (now) => {
      const idle = createSadeedVoiceActivityState(100);
      const idleResult = advanceSadeedVoiceActivity({ state: idle, now, rms: 0.02 });
      expect(idleResult).toEqual({ state: idle, decision: "no-speech" });

      const speaking = { ...idle, heardVoice: true, candidateVoiceAt: 100, lastVoiceAt: 150 };
      const speakingResult = advanceSadeedVoiceActivity({ state: speaking, now, rms: 0.02 });
      expect(speakingResult).toEqual({ state: speaking, decision: "complete" });
    },
  );

  it("does not enter an unbounded capture when the initial clock is invalid", () => {
    const invalid = createSadeedVoiceActivityState(Number.NaN);
    const result = advanceSadeedVoiceActivity({ state: invalid, now: 20_000, rms: 0.02 });
    expect(result.decision).toBe("no-speech");
    expect(result.state).toBe(invalid);
    expect(result.state.candidateVoiceAt).toBeNull();
  });

  it("preserves valid voice qualification, silence completion and no-speech deadlines", () => {
    const initial = createSadeedVoiceActivityState(0);
    const onset = advanceSadeedVoiceActivity({ state: initial, now: 90, rms: 0.02 });
    const qualified = advanceSadeedVoiceActivity({ state: onset.state, now: 180, rms: 0.02 });
    expect(onset.decision).toBe("continue");
    expect(qualified.state.heardVoice).toBe(true);
    expect(advanceSadeedVoiceActivity({ state: qualified.state, now: 900, rms: 0 }).decision).toBe(
      "complete",
    );
    expect(advanceSadeedVoiceActivity({ state: initial, now: 7_000, rms: 0 }).decision).toBe(
      "no-speech",
    );
  });
});
