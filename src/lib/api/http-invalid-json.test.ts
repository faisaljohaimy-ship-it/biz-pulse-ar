// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { httpJson } from "./http.server";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("httpJson invalid successful upstream payload", () => {
  it.each(["", "not-json", '{"truncated":'])(
    "returns a structured upstream failure for malformed 200 JSON (%s)",
    async (payload) => {
      let calls = 0;
      globalThis.fetch = (async () => {
        calls++;
        return new Response(payload, {
          status: 200,
          headers: { "request-id": "test-upstream-id" },
        });
      }) as typeof fetch;

      await expect(
        httpJson("https://example.invalid/malformed", { retries: 0 }),
      ).rejects.toMatchObject({
        name: "ApiError",
        code: "upstream_failed",
        status: 502,
        requestId: "test-upstream-id",
        details: { upstreamStatus: 200 },
        message: "Invalid JSON from upstream response",
      });
      expect(calls).toBe(1);
    },
  );

  it("maps an empty successful 204 body to an upstream failure", async () => {
    globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;

    await expect(
      httpJson("https://example.invalid/no-content", { retries: 0 }),
    ).rejects.toMatchObject({
      code: "upstream_failed",
      status: 502,
      details: { upstreamStatus: 204 },
    });
  });

  it("applies the same envelope to an accepted non-2xx status", async () => {
    globalThis.fetch = (async () => new Response("broken", { status: 409 })) as typeof fetch;

    await expect(
      httpJson("https://example.invalid/accepted", { retries: 0, acceptStatuses: [409] }),
    ).rejects.toMatchObject({
      code: "upstream_failed",
      status: 502,
      details: { upstreamStatus: 409 },
    });
  });

  it("preserves correctly formatted successful JSON", async () => {
    globalThis.fetch = (async () =>
      new Response('{"ok":true,"count":3}', { status: 200 })) as typeof fetch;
    await expect(httpJson("https://example.invalid/valid", { retries: 0 })).resolves.toEqual({
      ok: true,
      count: 3,
    });
  });
});
