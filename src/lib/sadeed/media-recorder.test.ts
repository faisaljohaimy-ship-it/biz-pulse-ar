import { describe, expect, it } from "vitest";
import { chooseSadeedRecorderMime, recorderFileExtension } from "./media-recorder";

describe("SADEED media recorder compatibility", () => {
  it("selects the first supported browser format", () => {
    expect(chooseSadeedRecorderMime((mime) => mime === "audio/mp4")).toBe("audio/mp4");
  });

  it("allows the browser to choose when no candidate is supported", () => {
    expect(chooseSadeedRecorderMime(() => false)).toBeUndefined();
  });

  it.each([
    ["audio/webm;codecs=opus", "webm"],
    ["audio/mp4", "m4a"],
    ["audio/ogg;codecs=opus", "ogg"],
    ["audio/mpeg", "mp3"],
    ["audio/wav", "wav"],
  ])("maps %s to %s", (mime, extension) => {
    expect(recorderFileExtension(mime)).toBe(extension);
  });

  it.each([
    ["audio/mp4 ; codecs=mp4a.40.2", "m4a"],
    [" AUDIO/OGG ; CODECS=opus", "ogg"],
    [" audio/wav ", "wav"],
    [" Video/MP4 ; codecs=avc1", "m4a"],
  ])("preserves the correct extension for MIME whitespace/case in %s", (mime, extension) => {
    expect(recorderFileExtension(mime)).toBe(extension);
  });
});
