import { describe, expect, it } from "vitest";
import { apiError, toApiErrorShape } from "./errors";

describe("toApiErrorShape opaque thrown values", () => {
  const fallback = { code: "internal_error", message: "Internal server error", status: 500 };

  it("preserves structured ApiError envelopes", () => {
    const error = apiError("forbidden", "Access denied");
    expect(toApiErrorShape(error)).toEqual(error.toJSON());
  });

  it("redacts raw Error, primitive and arbitrary-object details from public responses", () => {
    const privateDiagnostic = "DB unavailable: password=synthetic-test-value";
    for (const rejected of [
      new Error(privateDiagnostic),
      privateDiagnostic,
      { message: privateDiagnostic },
      500,
    ]) {
      const envelope = toApiErrorShape(rejected);
      expect(envelope).toEqual(fallback);
      expect(JSON.stringify(envelope)).not.toContain(privateDiagnostic);
    }
  });

  it("does not throw for a null-prototype rejection object", () => {
    expect(toApiErrorShape(Object.create(null))).toEqual(fallback);
  });

  it("does not throw when the rejection value has hostile string coercion", () => {
    const rejected = {
      [Symbol.toPrimitive]() {
        throw new Error("coercion failed");
      },
    };
    expect(toApiErrorShape(rejected)).toEqual(fallback);
  });

  it("does not throw when Error.message access itself throws", () => {
    const rejected = new Error("hidden");
    Object.defineProperty(rejected, "message", {
      get() {
        throw new Error("message failed");
      },
    });
    expect(toApiErrorShape(rejected)).toEqual(fallback);
  });
});
