import { describe, expect, it } from "vitest";
import {
  advanceSadeedVoiceActivity,
  createSadeedVoiceActivityState,
  SADEED_VOICE_ACTIVITY_DEFAULTS,
} from "./voice-activity";

describe("SADEED voice activity — fresh onset after the silence deadline", () => {
  it("rejects a first audible frame exactly at the 7-second deadline", () => {
    const initial = createSadeedVoiceActivityState(0);
    const result = advanceSadeedVoiceActivity({ state: initial, now: 7_000, rms: 0.02 });
    expect(result.decision).toBe("no-speech");
    expect(result.state.heardVoice).toBe(false);
    expect(result.state.candidateVoiceAt).toBeNull();
  });

  it("does not revive a timed-out recording on the first delayed audio frame", () => {
    const initial = createSadeedVoiceActivityState(1_000);
    const result = advanceSadeedVoiceActivity({ state: initial, now: 8_100, rms: 0.02 });
    expect(result.decision).toBe("no-speech");
    expect(result.state.heardVoice).toBe(false);
  });

  it("rejects fresh post-deadline onset even with zero minimum voice duration", () => {
    const initial = createSadeedVoiceActivityState(0);
    const result = advanceSadeedVoiceActivity({
      state: initial,
      now: 7_050,
      rms: 0.02,
      config: { ...SADEED_VOICE_ACTIVITY_DEFAULTS, minimumVoiceMs: 0 },
    });
    expect(result.decision).toBe("no-speech");
    expect(result.state.heardVoice).toBe(false);
  });

  it("still lets an existing pre-deadline candidate qualify after the cutoff", () => {
    const initial = createSadeedVoiceActivityState(0);
    const onset = advanceSadeedVoiceActivity({ state: initial, now: 6_980, rms: 0.02 });
    const atDeadline = advanceSadeedVoiceActivity({ state: onset.state, now: 7_000, rms: 0.02 });
    const qualified = advanceSadeedVoiceActivity({
      state: atDeadline.state,
      now: 7_071,
      rms: 0.02,
    });
    expect(atDeadline.decision).toBe("continue");
    expect(qualified.decision).toBe("continue");
    expect(qualified.state.heardVoice).toBe(true);
  });
});
