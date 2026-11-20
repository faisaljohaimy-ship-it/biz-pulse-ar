// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { ApiError, toApiErrorShape } from "./errors";
import { httpFetch, httpJson } from "./http.server";

const originalFetch = globalThis.fetch;
const privateMarker = "synthetic-private-backend-token-for-regression";
const sensitiveUrl = `https://service-user:${privateMarker}@example.invalid/data?api_key=${privateMarker}#${privateMarker}`;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("outbound HTTP failure envelopes do not expose untrusted diagnostics", () => {
  it.each([401, 403, 429, 503])(
    "does not copy the upstream %i response body or URL credentials into a serialised API error",
    async (status) => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ error: privateMarker, nested: { token: privateMarker } }), {
          status,
          headers: { "request-id": "safe-reference-id" },
        })) as typeof fetch;

      const failure = await httpJson(sensitiveUrl, { retries: 0 }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(ApiError);
      const envelope = toApiErrorShape(failure);
      expect(envelope.status).toBe(status);
      expect(envelope.requestId).toBe("safe-reference-id");
      expect(envelope.details).toEqual({ upstreamStatus: status });
      expect(JSON.stringify(envelope)).not.toContain(privateMarker);
      expect(JSON.stringify(envelope)).not.toContain("api_key");
    },
  );

  it("does not serialise transport rejection messages or URL credentials after retries are exhausted", async () => {
    globalThis.fetch = (async () => {
      throw new Error(`network diagnostic: ${privateMarker}`);
    }) as typeof fetch;

    const failure = await httpFetch(sensitiveUrl, { retries: 0 }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).code).toBe("upstream_failed");
    expect((failure as ApiError).details).toEqual({ attempts: 1 });
    expect(JSON.stringify(toApiErrorShape(failure))).not.toContain(privateMarker);
  });

  it("does not expose URL credentials on caller-abort or timeout envelopes", async () => {
    const aborted = new AbortController();
    aborted.abort();
    const callerFailure = await httpFetch(sensitiveUrl, {
      signal: aborted.signal,
      retries: 0,
    }).catch((error: unknown) => error);
    expect(callerFailure).toBeInstanceOf(ApiError);
    expect((callerFailure as ApiError).code).toBe("upstream_timeout");
    expect(JSON.stringify(toApiErrorShape(callerFailure))).not.toContain(privateMarker);

    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
          { once: true },
        );
      });
    };
    const deadlineFailure = await httpFetch(sensitiveUrl, {
      retries: 0,
      timeoutMs: 20,
    }).catch((error: unknown) => error);
    expect(deadlineFailure).toBeInstanceOf(ApiError);
    expect((deadlineFailure as ApiError).code).toBe("upstream_timeout");
    expect(JSON.stringify(toApiErrorShape(deadlineFailure))).not.toContain(privateMarker);
  });

  it("retains a developer-provided safe label and status diagnostics", async () => {
    globalThis.fetch = async () => new Response("maintenance", { status: 503 });
    const failure = await httpJson(sensitiveUrl, {
      retries: 0,
      label: "approved-service",
    }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).message).toContain("approved-service");
    expect((failure as ApiError).details).toEqual({ upstreamStatus: 503 });
  });
});
