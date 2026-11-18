import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceTimeline } from "./voice-timeline";

beforeEach(() => {
  VoiceTimeline.clear();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
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
  it("retains only safe event metadata in production, not voice text, payloads, or stacks", () => {
    vi.stubEnv("DEV", false);
    VoiceTimeline.push("CHAT", "confidential user transcript", {
      authorization: "example-sensitive-token",
      transcript: "confidential user transcript",
    }, { stack: true });

    expect(VoiceTimeline.dump()).toEqual([
      { t: expect.any(Number), dt: 0, tag: "CHAT", msg: "CHAT" },
    ]);
    const exposedTimeline = (window as Window & { __ariaTimeline?: unknown }).__ariaTimeline;
    expect(JSON.stringify(exposedTimeline)).not.toContain("confidential");
    expect(JSON.stringify(exposedTimeline)).not.toContain("example-sensitive-token");
    expect(console.log).not.toHaveBeenCalled();
  });

  it("preserves opt-in development diagnostics without affecting timeline deltas", () => {
    vi.stubEnv("DEV", true);
    VoiceTimeline.push("STREAM", "local diagnostic", { bytes: 12 }, { stack: true });
    expect(VoiceTimeline.dump()[0]).toMatchObject({
      tag: "STREAM",
      msg: "local diagnostic",
      data: { bytes: 12 },
    });
    expect(VoiceTimeline.dump()[0].stack).toEqual(expect.any(String));
    expect(console.log).toHaveBeenCalledOnce();
  });

});
