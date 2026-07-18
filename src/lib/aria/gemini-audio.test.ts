import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  extractGeminiAudio,
  extractGeminiText,
  normalizeGeminiTranscript,
  pcm16ToWav,
  playableGeminiAudio,
} from "./gemini-audio";

describe("Gemini audio helpers", () => {
  it("round-trips binary audio through base64", () => {
    const source = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
    expect([...base64ToBytes(bytesToBase64(source))]).toEqual([...source]);
  });

  it("rejects audio larger than the configured allocation limit", () => {
    expect(() => base64ToBytes(bytesToBase64(new Uint8Array(5)), 4)).toThrow(
      /safe response limit/,
    );
  });

  it("extracts raw Interactions API audio with metadata", () => {
    expect(
      extractGeminiAudio({
        steps: [
          {
            type: "model_output",
            content: [
              {
                type: "audio",
                data: "AQI=",
                mime_type: "audio/l16",
                sample_rate: 24_000,
                channels: 1,
              },
            ],
          },
        ],
      }),
    ).toEqual({
      data: "AQI=",
      mimeType: "audio/l16",
      sampleRate: 24_000,
      channels: 1,
    });
  });

  it("wraps raw Gemini PCM in a valid 24 kHz mono WAV", () => {
    const wav = pcm16ToWav(new Uint8Array([0, 0, 1, 0]));
    const view = new DataView(wav.buffer);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(wav.slice(8, 12))).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(24_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(4);
  });

  it("returns a browser-playable WAV for headerless Gemini PCM", () => {
    for (const mimeType of ["audio/l16", "audio/wav"]) {
      const result = playableGeminiAudio({
        data: bytesToBase64(new Uint8Array([0, 0, 1, 0])),
        mimeType,
        sampleRate: 24_000,
        channels: 1,
      });
      expect(result.contentType).toBe("audio/wav");
      expect(new TextDecoder().decode(result.bytes.slice(0, 4))).toBe("RIFF");
    }
  });

  it("extracts and normalizes transcription text", () => {
    expect(
      extractGeminiText({
        candidates: [{ content: { parts: [{ text: "مرحبا بآريا" }] } }],
      }),
    ).toBe("مرحبا بآريا");
    expect(normalizeGeminiTranscript("```text\nمرحبا\n```")).toBe("مرحبا");
    expect(normalizeGeminiTranscript("<NO_SPEECH>")).toBe("");
  });
});
