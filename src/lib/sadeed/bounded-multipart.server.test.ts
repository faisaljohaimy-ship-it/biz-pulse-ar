import { describe, expect, it, vi } from "vitest";
import { MULTIPART_READ_TIMEOUT_MS, parseBoundedMultipart } from "./bounded-multipart.server";

const ENDPOINT = "https://sadeed.invalid/api/voice-stt";

/**
 * Build transport bytes directly instead of passing a jsdom File into Node's
 * fetch/FormData implementation. Cross-realm Files silently serialize as text
 * in CI, which previously made the forged-length test exercise a 9-byte body.
 */
function audioRequest(size: number): Request {
  const boundary = "----sadeed-bounded-test";
  const encoder = new TextEncoder();
  const prefix = encoder.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="clip.webm"\r\nContent-Type: audio/webm\r\n\r\n`,
  );
  const suffix = encoder.encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(prefix.length + size + suffix.length);
  body.set(prefix);
  body.set(suffix, prefix.length + size);
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body,
  });
}

describe("bounded voice multipart parser", () => {
  it("parses a valid multipart recording under the wire limit", async () => {
    const result = await parseBoundedMultipart(audioRequest(350), 1_024);
    expect(result.tooLarge).toBe(false);
    const audio = result.form?.get("audio");
    expect(audio?.constructor.name).toBe("File");
    expect((audio as File).size).toBe(350);
    expect((audio as File).name).toBe("clip.webm");
    expect((audio as File).type).toBe("audio/webm");
  });

  it("rejects actual streamed bytes beyond the cap even with a forged short Content-Length", async () => {
    const original = audioRequest(1_200);
    const headers = new Headers(original.headers);
    headers.set("Content-Length", "1");
    const spoofed = new Request(original, { headers });
    const result = await parseBoundedMultipart(spoofed, 1_024);
    expect(result).toEqual({ form: null, tooLarge: true });
  });

  it("rejects excess transport bytes even without a Content-Length header", async () => {
    const result = await parseBoundedMultipart(audioRequest(1_200), 1_024);
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
      headers: { "Content-Type": "multipart/form-data; boundary=bad" },
      body: new TextEncoder().encode("invalid"),
    });
    const result = await parseBoundedMultipart(request, 1_024);
    expect(result).toEqual({ form: null, tooLarge: false });
  });

  it.each([
    ["actual overflow", 1_025, undefined],
    ["oversized declared length", 1, "99999"],
  ] as const)(
    "responds promptly when cancellation never settles (%s)",
    async (_case, size, declared) => {
      let cancelled = false;
      const source = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(size));
        },
        cancel() {
          cancelled = true;
          // An untrusted upload source may never resolve cancellation.
          return new Promise<void>(() => {});
        },
      });
      const headers = new Headers({ "Content-Type": "multipart/form-data; boundary=stall" });
      if (declared) headers.set("Content-Length", declared);
      const request = new Request(ENDPOINT, {
        method: "POST",
        headers,
        body: source,
        duplex: "half",
      } as RequestInit & { duplex: "half" });

      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const outcome = await Promise.race([
          parseBoundedMultipart(request, 1_024),
          new Promise<"cancel_hung">((resolve) => {
            timer = setTimeout(() => resolve("cancel_hung"), 1_000);
          }),
        ]);
        expect(outcome).toEqual({ form: null, tooLarge: true });
        expect(cancelled).toBe(true);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  );

  it.each([
    ["no first byte", false],
    ["one byte then stalled", true],
  ] as const)(
    "returns a bounded timeout when upload stalls (%s)",
    async (_label, enqueueFirst) => {
    vi.useFakeTimers();
    let cancelled = false;
    try {
      const source = new ReadableStream<Uint8Array>({
        start(controller) {
          if (enqueueFirst) controller.enqueue(new Uint8Array([1]));
          // Deliberately never close; both absent bytes and a trickle must expire.
        },
        cancel() {
          cancelled = true;
          // A malicious source may keep cancellation pending indefinitely.
          return new Promise<void>(() => {});
        },
      });
      const request = new Request(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=stall" },
        body: source,
        duplex: "half",
      } as RequestInit & { duplex: "half" });
      const result = parseBoundedMultipart(request, 1_024);
      await vi.advanceTimersByTimeAsync(MULTIPART_READ_TIMEOUT_MS);
      expect(await result).toEqual({ form: null, tooLarge: false, timedOut: true });
      expect(cancelled).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    },
  );
});
