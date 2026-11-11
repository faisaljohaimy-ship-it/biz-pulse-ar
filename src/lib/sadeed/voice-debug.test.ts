import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SadeedVoiceDebug, type VoiceEvent } from "./voice-debug";

describe("Sadeed voice diagnostic console privacy", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_VOICE_DEBUG", "false");
    window.localStorage.removeItem("aria-voice-debug");
    SadeedVoiceDebug.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    window.localStorage.removeItem("aria-voice-debug");
    SadeedVoiceDebug.clear();
  });

  it("does not print engine details when diagnostics are off, but still updates current and listeners", () => {
    const logger = vi.spyOn(console, "log").mockImplementation(() => {});
    const seen: Array<VoiceEvent | null> = [];
    const unsubscribe = SadeedVoiceDebug.subscribe((event) => seen.push(event));
    SadeedVoiceDebug.emit({
      source: "browser",
      reason: "voice-provider-error-detail",
      voiceId: "example-voice",
      failed: true,
      status: 503,
    });

    expect(logger).not.toHaveBeenCalled();
    expect(SadeedVoiceDebug.current()).toMatchObject({
      source: "browser",
      reason: "voice-provider-error-detail",
      failed: true,
      status: 503,
    });
    expect(seen.at(-1)).toMatchObject({ source: "browser", failed: true });
    unsubscribe();
  });

  it("prints the existing diagnostic message only when the opt-in flag is enabled", () => {
    const logger = vi.spyOn(console, "log").mockImplementation(() => {});
    window.localStorage.setItem("aria-voice-debug", "1");
    SadeedVoiceDebug.emit({ source: "gemini", reason: "diagnostic", voiceId: "sample-voice" });

    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger).toHaveBeenCalledWith(
      expect.stringContaining("[aria-voice] source=gemini id=sample"),
    );
  });

  it("does not log when localStorage access is blocked, while event delivery continues", () => {
    const logger = vi.spyOn(console, "log").mockImplementation(() => {});
    const getter = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    SadeedVoiceDebug.emit({ source: "greeting", reason: "private" });

    expect(logger).not.toHaveBeenCalled();
    expect(SadeedVoiceDebug.current()?.source).toBe("greeting");
    getter.mockRestore();
  });
});
