import { APICallError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import { shouldUseBackup } from "./backup-provider.server";
import { classifyProviderFailure, providerErrorMessage } from "./provider-error";
import { isVendorSafe } from "./vendor-mask";

const highDemand =
  "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.";
const apiError = (statusCode: number, message = highDemand) =>
  new APICallError({
    message,
    statusCode,
    url: "https://provider.invalid/generate",
    requestBodyValues: {},
    responseBody: "private response body",
    responseHeaders: { "private-header": "private value" },
  });

describe("provider failure classification", () => {
  it.each([429, 500, 502, 503, 504])(
    "preserves structured SDK status %s without message digits",
    (statusCode) => {
      const error = apiError(statusCode);
      expect(classifyProviderFailure(error)).toEqual({
        status: statusCode,
        kind: statusCode === 429 ? "rate_limit" : "transient",
        backupEligible: true,
      });
      expect(shouldUseBackup(error)).toBe(true);
    },
  );
  it("recognizes the exact high-demand message, plain status and wrapped SDK lastError", () => {
    expect(classifyProviderFailure(new Error(highDemand)).kind).toBe("transient");
    expect(shouldUseBackup({ status: 503, message: highDemand })).toBe(true);
    const wrapped = new RetryError({
      message: "Retry failed",
      reason: "maxRetriesExceeded",
      errors: [apiError(503)],
    });
    expect(classifyProviderFailure(wrapped)).toEqual({
      status: 503,
      kind: "transient",
      backupEligible: true,
    });
  });
  it.each([400, 401, 402, 403])(
    "keeps denial %s terminal despite conflicting transient text",
    (statusCode) => {
      for (const error of [
        apiError(statusCode, `${highDemand} 503 quota unavailable`),
        { status: statusCode, message: highDemand },
        new Error(`${statusCode} quota unavailable high demand`),
      ]) {
        expect(shouldUseBackup(error)).toBe(false);
        expect(classifyProviderFailure(error).status).toBe(statusCode);
      }
      expect(shouldUseBackup({ statusCode: 503, cause: apiError(statusCode) })).toBe(false);
    },
  );
  it("does not route cancellation or timeout to a backup because of wrapped overload text", () => {
    const aborted = Object.assign(new Error(highDemand), {
      name: "AbortError",
      cause: apiError(503),
    });
    expect(classifyProviderFailure(aborted).kind).toBe("cancelled");
    expect(shouldUseBackup(aborted)).toBe(false);
    expect(
      shouldUseBackup({
        message: "wrapper",
        cause: new DOMException("request aborted", "AbortError"),
        statusCode: 503,
      }),
    ).toBe(false);
    expect(shouldUseBackup(new DOMException("took too long", "TimeoutError"))).toBe(false);
  });
  it("keeps model-not-found fallback, but not arbitrary 404 or unrelated explicit errors", () => {
    expect(shouldUseBackup(apiError(404, "Model retired not found"))).toBe(true);
    expect(shouldUseBackup(apiError(404, "Endpoint not found"))).toBe(false);
    expect(shouldUseBackup({ statusCode: 422, message: highDemand })).toBe(false);
    expect(shouldUseBackup(new Error("Model unsupported not supported"))).toBe(true);
  });
  it("handles cycles and inaccessible properties without throwing or reading response bodies", () => {
    const cycle: { cause?: unknown } = {};
    cycle.cause = cycle;
    expect(classifyProviderFailure(cycle).kind).toBe("unknown");
    const error = Object.defineProperty({}, "statusCode", {
      get: () => {
        throw Error("inaccessible");
      },
    });
    expect(classifyProviderFailure(error).kind).toBe("unknown");
    expect(classifyProviderFailure({ responseBody: highDemand }).backupEligible).toBe(false);
  });
  it("maps all failure classes to fixed vendor-safe Arabic without upstream details", () => {
    const errors: unknown[] = [400, 401, 402, 403, 404, 429, 500, 503, 422].map((code) =>
      apiError(code),
    );
    errors.push(
      new Error("timeout private details"),
      new DOMException("private details", "AbortError"),
      new Error("private details"),
    );
    for (const error of errors) {
      const message = providerErrorMessage(error, "request-test");
      expect(message).toMatch(/[؀-ۿ]/);
      expect(isVendorSafe(message)).toBe(true);
      expect(message).not.toMatch(
        /private|provider\.invalid|high demand|API_KEY|authenticat|unauthor/i,
      );
    }
    const uncertain = providerErrorMessage(apiError(503), "request-test", {
      toolExecutionStarted: true,
    });
    expect(uncertain).toContain("راجع سجل التنفيذ قبل تكرار الطلب");
    expect(uncertain).not.toContain("أعد المحاولة");
    expect(isVendorSafe(uncertain)).toBe(true);
    expect(providerErrorMessage(apiError(503), "request-test")).toContain("مشغول مؤقتًا");
    expect(providerErrorMessage(apiError(503), "request-test")).toContain("request-test");
    expect(providerErrorMessage(apiError(403, "503 overloaded"), "request-test")).toContain(
      "غير متاح لهذه الجلسة",
    );
  });
});
