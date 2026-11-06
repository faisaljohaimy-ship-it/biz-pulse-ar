// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { httpFetch } from "./http.server";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("httpFetch retry response cleanup", () => {
  it.each([503, 429])("cancels a discarded streaming %s body before retry", async (status) => {
    let cancelled = false;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) {
        return new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
          { status, headers: status === 429 ? { "retry-after": "0" } : undefined },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    const response = await httpFetch("https://example.invalid/retry-stream", {
      retries: 1,
      retryBaseMs: 0,
      timeoutMs: 1_000,
    });
    expect(response.status).toBe(200);
    expect(calls).toBe(2);
    expect(cancelled).toBe(true);
  });

  it("leaves a terminal response readable when retries are disabled", async () => {
    let cancelled = false;
    globalThis.fetch = (async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("service unavailable"));
            controller.close();
          },
          cancel() {
            cancelled = true;
          },
        }),
        { status: 503 },
      )) as typeof fetch;

    const response = await httpFetch("https://example.invalid/no-retry", { retries: 0 });
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("service unavailable");
    expect(cancelled).toBe(false);
  });

  it("preserves a response whose Retry-After exceeds the request budget", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response(JSON.stringify({ reason: "slow down" }), {
        status: 429,
        headers: { "retry-after": "60" },
      });
    }) as typeof fetch;

    const response = await httpFetch("https://example.invalid/long-backoff", {
      retries: 1,
      timeoutMs: 50,
    });
    expect(calls).toBe(1);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ reason: "slow down" });
  });
});
