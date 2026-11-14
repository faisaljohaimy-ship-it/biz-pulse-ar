import { describe, expect, it } from "vitest";
import { pcm16ToWav, playableGeminiAudio } from "./gemini-audio";

describe("Gemini PCM16 WAV frame boundaries", () => {
  it.each([
    [1, 1],
    [1, 3],
    [2, 2],
    [2, 6],
    [3, 4],
  ])("rejects %i-channel PCM16 with %i bytes (incomplete frame)", (channels, length) => {
    expect(() => pcm16ToWav(new Uint8Array(length), 24_000, channels)).toThrow(
      "PCM payload must contain complete audio frames.",
    );
  });

  it("preserves valid interleaved stereo frames and WAV sizes", () => {
    const pcm = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const wav = pcm16ToWav(pcm, 48_000, 2);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    expect(wav.byteLength).toBe(52);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(48_000);
    expect(view.getUint16(32, true)).toBe(4);
    expect(view.getUint32(40, true)).toBe(8);
    expect(wav.slice(44)).toEqual(pcm);
  });

  it("rejects malformed headerless Gemini PCM rather than returning an unplayable WAV", () => {
    expect(() =>
      playableGeminiAudio({
        data: "AAEC",
        mimeType: "audio/l16",
        sampleRate: 24_000,
        channels: 1,
      }),
    ).toThrow("PCM payload must contain complete audio frames.");
  });

  it("keeps an already-containerized WAV unchanged", () => {
    const wav = pcm16ToWav(new Uint8Array([0, 1]), 24_000, 1);
    const data = Buffer.from(wav).toString("base64");
    const playable = playableGeminiAudio({
      data,
      mimeType: "audio/wav",
      sampleRate: 24_000,
      channels: 1,
    });
    expect(playable.contentType).toBe("audio/wav");
    expect(playable.bytes).toEqual(wav);
  });
});
