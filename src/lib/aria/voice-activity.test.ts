import { describe, expect, it } from "vitest";
import {
  advanceAriaVoiceActivity,
  createAriaVoiceActivityState,
  type AriaVoiceActivityConfig,
} from "./voice-activity";

const CONFIG: AriaVoiceActivityConfig = {
  rmsThreshold: 0.02,
  minimumVoiceMs: 100,
  silenceMs: 1_000,
  noSpeechMs: 5_000,
  maximumCaptureMs: 10_000,
};

function advance(state: ReturnType<typeof createAriaVoiceActivityState>, rms: number, now: number) {
  return advanceAriaVoiceActivity({ state, rms, now, config: CONFIG });
}

describe("ARIA mobile voice activity detection", () => {
  it("ignores a short tap spike", () => {
    let state = createAriaVoiceActivityState(0);
    ({ state } = advance(state, 0.08, 20));
    const result = advance(state, 0.001, 80);
    expect(result.state.heardVoice).toBe(false);
    expect(result.decision).toBe("continue");
  });

  it("accepts sustained speech then completes after silence", () => {
    let state = createAriaVoiceActivityState(0);
    ({ state } = advance(state, 0.05, 100));
    ({ state } = advance(state, 0.05, 250));
    expect(state.heardVoice).toBe(true);
    ({ state } = advance(state, 0.04, 700));
    expect(advance(state, 0.001, 1_701).decision).toBe("complete");
  });

  it("stops an empty recording without sending it for transcription", () => {
    const state = createAriaVoiceActivityState(0);
    expect(advance(state, 0.001, 5_001).decision).toBe("no-speech");
  });

  it("caps long speech at the maximum capture duration", () => {
    let state = createAriaVoiceActivityState(0);
    ({ state } = advance(state, 0.05, 100));
    ({ state } = advance(state, 0.05, 250));
    expect(advance(state, 0.05, 10_001).decision).toBe("complete");
  });
});
