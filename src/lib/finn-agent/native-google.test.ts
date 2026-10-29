import { afterEach, describe, expect, it, vi } from "vitest";
import {
  finnGoogleError,
  finnGoogleOptions,
  googleProviderEnabled,
  hasFinnOAuthError,
  verifiedGoogleAuthorizeUrl,
  withFinnDeadline,
} from "./native-google";

describe("FNN native Google entry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it("uses Google directly and a fixed same-origin return path", () => {
    expect(finnGoogleOptions("https://neexios.com/?redirect=https://example.org")).toEqual({
      provider: "google",
      options: {
        redirectTo: "https://neexios.com/fnn",
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    expect(finnGoogleOptions("https://www.neexios.com").options.redirectTo).toBe(
      "https://www.neexios.com/fnn",
    );
  });
  it("rejects remote insecure or credential-bearing origins", () => {
    expect(() => finnGoogleOptions("http://example.org")).toThrow();
    expect(() => finnGoogleOptions("https://user:pass@neexios.com")).toThrow();
    expect(finnGoogleOptions("http://localhost:5173").options.redirectTo).toBe(
      "http://localhost:5173/fnn",
    );
  });
  it("requires a strict enabled provider boolean", () => {
    expect(googleProviderEnabled({ external: { google: true } })).toBe(true);
    for (const value of [
      null,
      {},
      { external: { google: false } },
      { external: { google: "true" } },
    ])
      expect(googleProviderEnabled(value)).toBe(false);
  });
  it("accepts only the native Auth endpoint, provider and return URL", () => {
    const url =
      "https://test.supabase.co/auth/v1/authorize?provider=google&redirect_to=" +
      encodeURIComponent("https://neexios.com/fnn");
    expect(verifiedGoogleAuthorizeUrl(url, "https://neexios.com")).toBe(url);
    for (const bad of [
      null,
      "https://example.org",
      url.replace("test.supabase.co", "example.org"),
      url.replace("google", "github"),
      url.replace("fnn", "other"),
    ])
      expect(() => verifiedGoogleAuthorizeUrl(bad, "https://neexios.com")).toThrow();
  });
  it("does not reflect raw provider messages", () => {
    const text = finnGoogleError(new Error("token=private-value"), true);
    expect(text).not.toContain("private-value");
    expect(text).toMatch(/[\u0600-\u06ff]/);
  });
  it("recognizes OAuth errors without classifying tokens as errors", () => {
    expect(hasFinnOAuthError("https://neexios.com/fnn#error=access_denied")).toBe(true);
    expect(hasFinnOAuthError("https://neexios.com/fnn?error_code=bad")).toBe(true);
    expect(hasFinnOAuthError("https://neexios.com/fnn#access_token=fixture")).toBe(false);
  });
  it("cleans up successful deadlines", async () => {
    vi.useFakeTimers();
    await expect(withFinnDeadline(Promise.resolve("ok"))).resolves.toBe("ok");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("bounds hanging requests and cleans up timers", async () => {
    vi.useFakeTimers();
    const request = withFinnDeadline(new Promise(() => {}), 20);
    const rejected = expect(request).rejects.toThrow("fnn_timeout");
    await vi.advanceTimersByTimeAsync(20);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
});
