import { describe, it, expect } from "vitest";
import { resolveModel, parseIntent } from "./ai-router.server";

/**
 * Locks in the provider priority: Google(Gemini) → Anthropic → OpenRouter →
 * Lovable.
 *
 * The Lovable gateway is credit-gated (HTTP 402 when exhausted), so ARIA must
 * always prefer a platform-neutral provider when one is configured — on any
 * host — and only fall back to Lovable when it is the sole key. Native Google
 * Gemini is first because its free AI-Studio tier runs Gemini Flash at no cost.
 */
describe("resolveModel — provider priority", () => {
  it("prefers Google Gemini when its key is present, even alongside others", () => {
    const r = resolveModel("general", {
      google: true,
      anthropic: true,
      openrouter: true,
      lovable: true,
    });
    expect(r.vendor).toBe("google");
  });

  it("Google primary keeps Anthropic as fallback when available", () => {
    const r = resolveModel("general", {
      google: true,
      anthropic: true,
      openrouter: false,
      lovable: false,
    });
    expect(r.fallback?.vendor).toBe("anthropic");
  });

  it("prefers Anthropic when its key is present and Google is absent", () => {
    const r = resolveModel("general", { anthropic: true, openrouter: true, lovable: true });
    expect(r.vendor).toBe("anthropic");
  });

  it("prefers OpenRouter over the credit-gated Lovable gateway", () => {
    const r = resolveModel("general", { anthropic: false, openrouter: true, lovable: true });
    expect(r.vendor).toBe("openrouter");
  });

  it("falls back to Lovable only when it is the sole provider", () => {
    const r = resolveModel("general", { anthropic: false, openrouter: false, lovable: true });
    expect(r.vendor).toBe("lovable");
  });

  it("Anthropic primary keeps a neutral OpenRouter fallback when available", () => {
    const r = resolveModel("executive", { anthropic: true, openrouter: true, lovable: false });
    expect(r.fallback?.vendor).toBe("openrouter");
  });

  it("OpenRouter primary keeps Lovable as its last-resort fallback", () => {
    const r = resolveModel("general", { anthropic: false, openrouter: true, lovable: true });
    expect(r.fallback?.vendor).toBe("lovable");
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
