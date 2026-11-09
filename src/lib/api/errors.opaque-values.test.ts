import { describe, expect, it } from "vitest";
import { apiError, toApiErrorShape } from "./errors";

describe("toApiErrorShape opaque thrown values", () => {
  const fallback = { code: "internal_error", message: "Unknown error", status: 500 };

  it("preserves structured ApiError envelopes", () => {
    const error = apiError("forbidden", "Access denied");
    expect(toApiErrorShape(error)).toEqual(error.toJSON());
  });

  it("preserves normal Error and primitive messages", () => {
    expect(toApiErrorShape(new Error("network failure"))).toEqual({
      code: "internal_error",
      message: "network failure",
      status: 500,
    });
    expect(toApiErrorShape("upstream rejected")).toEqual({
      code: "internal_error",
      message: "upstream rejected",
      status: 500,
    });
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
