// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { MAX_HTTP_JSON_BODY_BYTES, httpJson } from "./http.server";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("httpJson response body deadline", () => {
  it.each([200, 503])(
    "bounds a stalled upstream %s body and cancels the stream",
    async (status) => {
      let cancelled = false;
      globalThis.fetch = (async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
          { status },
        )) as typeof fetch;

      await expect(
        httpJson("https://example.invalid/slow-body", { retries: 0, timeoutMs: 20 }),
      ).rejects.toMatchObject({ code: "upstream_timeout" });
      expect(cancelled).toBe(true);
    },
  );

  it("rejects a declared oversized upstream body and cancels its stream", async () => {
    let cancelled = false;
    globalThis.fetch = (async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
        {
          status: 200,
          headers: { "content-length": String(MAX_HTTP_JSON_BODY_BYTES + 1) },
        },
      )) as typeof fetch;

    await expect(
      httpJson("https://example.invalid/oversized-header", { retries: 0 }),
    ).rejects.toMatchObject({ code: "upstream_failed", status: 502 });
    expect(cancelled).toBe(true);
  });

  it("bounds actual streamed bytes even without a Content-Length header", async () => {
    let cancelled = false;
    let pulls = 0;
    const chunk = new Uint8Array(1024 * 1024);
    globalThis.fetch = (async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            pulls += 1;
            controller.enqueue(chunk);
          },
          cancel() {
            cancelled = true;
          },
        }),
        { status: 200 },
      )) as typeof fetch;

    await expect(
      httpJson("https://example.invalid/oversized-stream", { retries: 0 }),
    ).rejects.toMatchObject({ code: "upstream_failed", status: 502 });
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThanOrEqual(MAX_HTTP_JSON_BODY_BYTES / chunk.byteLength + 2);
  });

  it("preserves successful JSON parsing", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: true, count: 2 }), { status: 200 })) as typeof fetch;

    await expect(httpJson("https://example.invalid/ok", { retries: 0 })).resolves.toEqual({
      ok: true,
      count: 2,
    });
  });

  it("preserves upstream error envelopes", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ reason: "busy" }), { status: 429 })) as typeof fetch;

    await expect(httpJson("https://example.invalid/busy", { retries: 0 })).rejects.toMatchObject({
      code: "rate_limited",
      status: 429,
      details: { body: { reason: "busy" } },
    });
  });

  it("aborts a stalled body promptly when its caller cancels", async () => {
    let cancelled = false;
    globalThis.fetch = (async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
        { status: 200 },
      )) as typeof fetch;

    const caller = new AbortController();
    const pending = httpJson("https://example.invalid/abandon-body", {
      retries: 0,
      timeoutMs: 1_000,
      signal: caller.signal,
    });
    setTimeout(() => caller.abort(), 10);
    await expect(pending).rejects.toMatchObject({ code: "upstream_timeout" });
    expect(cancelled).toBe(true);
  });
});
