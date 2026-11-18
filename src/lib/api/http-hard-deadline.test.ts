// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpFetch, httpJson } from "./http.server";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

describe("httpFetch hard deadline for non-cooperative transports", () => {
  it("rejects by the deadline even if fetch ignores abort and cancels a late body", async () => {
    vi.useFakeTimers();
    let resolveNetwork!: (response: Response) => void;
    let calls = 0;
    globalThis.fetch = (() => {
      calls++;
      return new Promise<Response>((resolve) => {
        resolveNetwork = resolve;
      });
    }) as typeof fetch;

    let outcome = "pending";
    const pending = httpFetch("https://example.invalid/ignores-abort", {
      retries: 0,
      timeoutMs: 50,
    }).then(
      () => {
        outcome = "unexpected-success";
      },
      (error: unknown) => {
        outcome = (error as { code?: string }).code ?? "unstructured-error";
      },
    );

    await vi.advanceTimersByTimeAsync(60);
    const outcomeAtDeadline = outcome;

    let cancelled = false;
    resolveNetwork(
      new Response(
        new ReadableStream<Uint8Array>({
          cancel() {
            cancelled = true;
          },
        }),
        { status: 200 },
      ),
    );
    await vi.advanceTimersByTimeAsync(0);
    await pending;

    expect(calls).toBe(1);
    expect(outcomeAtDeadline).toBe("upstream_timeout");
    expect(cancelled).toBe(true);
  });
});

describe("httpFetch and httpJson invalid deadline normalization", () => {
  it.each([NaN, 0, -3, Infinity, 2 ** 31])(
    "does not abort healthy response headers at 1 ms for timeoutMs=%s",
    async (timeoutMs) => {
      vi.useFakeTimers();
      let resolveNetwork!: (response: Response) => void;
      globalThis.fetch = (() =>
        new Promise<Response>((resolve) => {
          resolveNetwork = resolve;
        })) as typeof fetch;

      const outcome = httpFetch("https://example.invalid/late-headers", {
        retries: 0,
        timeoutMs,
      }).then(
        (response) => response.status,
        (error: { code?: string }) => error.code,
      );
      await vi.advanceTimersByTimeAsync(25);
      resolveNetwork(new Response("ok", { status: 200 }));
      expect(await outcome).toBe(200);
    },
  );

  it.each([NaN, 0, -3, Infinity, 2 ** 31])(
    "does not cancel a healthy JSON body at 1 ms for timeoutMs=%s",
    async (timeoutMs) => {
      vi.useFakeTimers();
      let sendBody!: () => void;
      globalThis.fetch = (async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              sendBody = () => {
                controller.enqueue(new TextEncoder().encode('{"ok":true}'));
                controller.close();
              };
            },
          }),
          { status: 200 },
        )) as typeof fetch;

      const outcome = httpJson<{ ok: boolean }>("https://example.invalid/slow-json", {
        retries: 0,
        timeoutMs,
      }).then(
        (payload) => payload.ok,
        (error: { code?: string }) => error.code,
      );
      await vi.advanceTimersByTimeAsync(25);
      sendBody();
      expect(await outcome).toBe(true);
    },
  );
});
