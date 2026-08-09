import { afterEach, describe, expect, it, vi } from "vitest";
import { parseIntent, resolveModel } from "./ai-router.server";

describe("resolveModel — Gemini-only policy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("always selects native Google Gemini 3.6 Flash", () => {
    expect(resolveModel("general", { google: true })).toEqual({
      vendor: "google",
      modelId: "gemini-3.6-flash",
    });
  });

  it("ignores an unapproved model override", () => {
    vi.stubEnv("GEMINI_MODEL", "gpt-4o");
    expect(resolveModel("executive", { google: true }).modelId).toBe("gemini-3.6-flash");
  });
});

describe("parseIntent", () => {
  it("normalizes known intents and defaults unknown to 'unknown'", () => {
    expect(parseIntent("executive")).toBe("executive");
    expect(parseIntent("  Writing ")).toBe("writing");
    expect(parseIntent("nonsense")).toBe("unknown");
    expect(parseIntent(null)).toBe("unknown");
  });
});
