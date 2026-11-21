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
});

describe("voice timeline production privacy", () => {
  it("does not retain or log message text, arbitrary payloads, or stacks in production", () => {
    vi.stubEnv("DEV", false);
    VoiceTimeline.push(
      "CHAT",
      "confidential user transcript",
      { authorization: "synthetic-private-token", transcript: "confidential user transcript" },
      { stack: true },
    );

    expect(VoiceTimeline.dump()).toEqual([
      { t: expect.any(Number), dt: 0, tag: "CHAT", msg: "CHAT" },
    ]);
    const exposedTimeline = (window as Window & { __ariaTimeline?: unknown }).__ariaTimeline;
    expect(JSON.stringify(exposedTimeline)).not.toContain("confidential user transcript");
    expect(JSON.stringify(exposedTimeline)).not.toContain("synthetic-private-token");
    expect(console.log).not.toHaveBeenCalled();
  });

  it("keeps opt-in development diagnostics and timing deltas intact", () => {
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
