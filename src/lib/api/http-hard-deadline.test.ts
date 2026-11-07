// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { httpFetch } from "./http.server";

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
