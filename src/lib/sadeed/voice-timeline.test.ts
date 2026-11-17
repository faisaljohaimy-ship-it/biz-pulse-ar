import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceTimeline } from "./voice-timeline";

beforeEach(() => {
  VoiceTimeline.clear();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  VoiceTimeline.clear();
});

describe("voice timeline deltas", () => {
  it("measures elapsed time when the first event happens at performance time zero", () => {
    let tick = 0;
    vi.spyOn(performance, "now").mockImplementation(() => tick);

    VoiceTimeline.push("CHAT", "started");
    tick = 145;
    VoiceTimeline.push("STREAM", "first audio");

    expect(VoiceTimeline.dump().map(({ t, dt }) => ({ t, dt }))).toEqual([
      { t: 0, dt: 0 },
      { t: 145, dt: 145 },
    ]);
  });

  it("resets the delta baseline after clear", () => {
    let tick = 0;
    vi.spyOn(performance, "now").mockImplementation(() => tick);

    VoiceTimeline.push("CHAT", "started");
    tick = 100;
    VoiceTimeline.push("STREAM", "chunk");
    VoiceTimeline.clear();
    tick = 200;
    VoiceTimeline.push("CHAT", "new session");

    expect(VoiceTimeline.dump().map(({ t, dt }) => ({ t, dt }))).toEqual([{ t: 200, dt: 0 }]);
  });

  it("preserves deltas for a nonzero first timestamp", () => {
    let tick = 50;
    vi.spyOn(performance, "now").mockImplementation(() => tick);

    VoiceTimeline.push("VOICE", "voice ready");
    tick = 81;
    VoiceTimeline.push("AUDIO_PLAY", "playing");

    expect(VoiceTimeline.dump().map(({ t, dt }) => ({ t, dt }))).toEqual([
      { t: 50, dt: 0 },
      { t: 81, dt: 31 },
    ]);
  });
});
