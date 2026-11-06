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

  it.each([200, 201])(
    "preserves successful %i JSON even when extra accepted statuses are set",
    async (status) => {
      globalThis.fetch = (async () => new Response('{"ok":true}', { status })) as typeof fetch;
      await expect(
        httpJson("https://example.invalid/success", { retries: 0, acceptStatuses: [409] }),
      ).resolves.toEqual({ ok: true });
    },
  );

  it.each([429, 503])(
    "does not retry an explicitly accepted %i response",
    async (status) => {
      let calls = 0;
      globalThis.fetch = (async () => {
        calls++;
        return new Response('{"accepted":true}', { status });
      }) as typeof fetch;
      await expect(
        httpJson("https://example.invalid/accepted", {
          retries: 2,
          retryBaseMs: 1,
          acceptStatuses: [status],
        }),
      ).resolves.toEqual({ accepted: true });
      expect(calls).toBe(1);
    },
  );

  it("does not allow custom retryOn to override explicitly accepted responses", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response('{"accepted":true}', { status: 429 });
    }) as typeof fetch;
    await expect(
      httpJson("https://example.invalid/custom", {
        retries: 2,
        acceptStatuses: [429],
        retryOn: () => true,
      }),
    ).resolves.toEqual({ accepted: true });
    expect(calls).toBe(1);
  });

  it("retains transient retries for statuses not explicitly accepted", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response('{"ok":true}', { status: calls === 1 ? 503 : 200 });
    }) as typeof fetch;
    await expect(
      httpJson("https://example.invalid/retry", {
        retries: 2,
        retryBaseMs: 1,
        acceptStatuses: [429],
      }),
    ).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("does not accept an unlisted non-2xx status", async () => {
    globalThis.fetch = (async () =>
      new Response('{"error":"missing"}', { status: 404 })) as typeof fetch;
    await expect(
      httpJson("https://example.invalid/missing", { retries: 0, acceptStatuses: [409] }),
    ).rejects.toMatchObject({
      name: "ApiError",
      code: "not_found",
      status: 404,
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
