import { describe, expect, it } from "vitest";
import { recentExecutionHealth } from "./run-health";

describe("runtime execution health", () => {
  it.each(["failed", "error", "cancelled", "canceled", "timed_out", "timeout"])(
    "does not claim a recent %s run is healthy",
    (status) => {
      expect(recentExecutionHealth(2, status, 24 * 60)).toBe("warning");
    },
  );

  it("preserves healthy for recent successful or active runs", () => {
    expect(recentExecutionHealth(2, "succeeded", 24 * 60)).toBe("healthy");
    expect(recentExecutionHealth(2, "running", 24 * 60)).toBe("healthy");
  });

  it("preserves warning after the existing freshness interval", () => {
    expect(recentExecutionHealth(24 * 60, "succeeded", 24 * 60)).toBe("warning");
  });

  it("never treats unknown, invalid or future timestamps as healthy", () => {
    expect(recentExecutionHealth(null, "failed", 24 * 60)).toBe("unknown");
    expect(recentExecutionHealth(Number.NaN, "succeeded", 24 * 60)).toBe("unknown");
    expect(recentExecutionHealth(-1, "succeeded", 24 * 60)).toBe("unknown");
  });

  it("normalizes failure status casing and whitespace", () => {
    expect(recentExecutionHealth(0, " FAILED ", 24 * 60)).toBe("warning");
  });

  it.each([null, undefined, "", "   "])(
    "does not infer healthy from a missing execution status (%s)",
    (status) => {
      expect(recentExecutionHealth(2, status, 24 * 60)).toBe("unknown");
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    "does not infer healthy with an invalid freshness limit (%s)",
    (staleAfterMin) => {
      expect(recentExecutionHealth(2, "succeeded", staleAfterMin)).toBe("unknown");
    },
  );

  it("keeps an explicit failure as warning despite an invalid freshness limit", () => {
    expect(recentExecutionHealth(2, "failed", Number.NaN)).toBe("warning");
  });
});
