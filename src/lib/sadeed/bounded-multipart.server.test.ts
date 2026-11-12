import { describe, expect, it } from "vitest";
import { parseBoundedMultipart } from "./bounded-multipart.server";

const ENDPOINT = "https://sadeed.invalid/api/voice-stt";

function audioRequest(size: number): Request {
  const form = new FormData();
  form.set("audio", new File([new Uint8Array(size)], "clip.webm", { type: "audio/webm" }));
  return new Request(ENDPOINT, { method: "POST", body: form });
}

describe("bounded voice multipart parser", () => {
  it("parses a valid multipart recording under the wire limit", async () => {
    const result = await parseBoundedMultipart(audioRequest(350), 1_024);
    expect(result.tooLarge).toBe(false);
    const audio = result.form?.get("audio");
    expect(audio).toBeInstanceOf(File);
    expect((audio as File).size).toBe(350);
  });

  it("rejects actual streamed bytes beyond the cap even with a forged short Content-Length", async () => {
    const original = audioRequest(1_200);
    const headers = new Headers(original.headers);
    headers.set("Content-Length", "1");
    const spoofed = new Request(original, { headers });
    const result = await parseBoundedMultipart(spoofed, 1_024);
    expect(result).toEqual({ form: null, tooLarge: true });
  });

  it("rejects an oversized declared length before parsing an otherwise small body", async () => {
    const original = audioRequest(350);
    const headers = new Headers(original.headers);
    headers.set("Content-Length", "100000");
    const result = await parseBoundedMultipart(new Request(original, { headers }), 1_024);
    expect(result).toEqual({ form: null, tooLarge: true });
  });

  it("rejects malformed multipart without treating it as an oversized upload", async () => {
    const request = new Request(ENDPOINT, {
      method: "POST",
      body: new Blob(["invalid"], { type: "multipart/form-data; boundary=bad" }),
    });
    const result = await parseBoundedMultipart(request, 1_024);
    expect(result).toEqual({ form: null, tooLarge: false });
  });
});
