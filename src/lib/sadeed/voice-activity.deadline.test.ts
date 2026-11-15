import { describe, expect, it } from "vitest";
import { advanceSadeedVoiceActivity, createSadeedVoiceActivityState } from "./voice-activity";

const sample = (
  state: ReturnType<typeof createSadeedVoiceActivityState>,
  now: number,
  rms: number,
) => advanceSadeedVoiceActivity({ state, now, rms });

describe("SADEED voice activity at the initial no-speech deadline", () => {
  it("does not cut off a voice onset that started just before the silence deadline", () => {
    const first = sample(createSadeedVoiceActivityState(0), 6_980, 0.02);
    expect(first.decision).toBe("continue");
    expect(first.state.heardVoice).toBe(false);

    const deadline = sample(first.state, 7_000, 0.02);
    expect(deadline.decision).toBe("continue");
    expect(deadline.state.heardVoice).toBe(false);

    const qualified = sample(deadline.state, 7_071, 0.02);
    expect(qualified.decision).toBe("continue");
    expect(qualified.state.heardVoice).toBe(true);

    const finished = sample(qualified.state, 7_721, 0);
    expect(finished.decision).toBe("complete");
  });

  it("does not extend initial silence for an unqualified single-frame spike", () => {
    const candidate = sample(createSadeedVoiceActivityState(0), 6_980, 0.02);
    const silence = sample(candidate.state, 7_000, 0);
    expect(silence.decision).toBe("no-speech");
    expect(silence.state.heardVoice).toBe(false);
  });

  it("keeps the absolute maximum capture deadline when onset is too late", () => {
    const candidate = sample(createSadeedVoiceActivityState(0), 17_980, 0.02);
    const expired = sample(candidate.state, 18_000, 0.02);
    expect(expired.decision).toBe("no-speech");
    expect(expired.state.heardVoice).toBe(false);
  });
});
