import { describe, it, expect } from "vitest";
import { resolveModel, parseIntent } from "./ai-router.server";

/**
 * Locks in the provider priority: Google(Gemini) → Lovable → OpenAI →
 * Anthropic → OpenRouter.
 *
 * ARIA PERMANENT-ON policy: LOVABLE_API_KEY is auto-provisioned and backed by
 * workspace credits, so it is the reliable default whenever third-party
 * billing (Anthropic) or third-party auth (OpenRouter) is failing. Only
 * native Google Gemini's free tier outranks it.
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

  it("Google primary keeps Lovable as fallback when available", () => {
    const r = resolveModel("general", {
      google: true,
      anthropic: true,
      openrouter: false,
      lovable: true,
    });
    expect(r.fallback?.vendor).toBe("lovable");
  });

  it("prefers Lovable over Anthropic/OpenRouter when Google is absent", () => {
    const r = resolveModel("general", { anthropic: true, openrouter: true, lovable: true });
    expect(r.vendor).toBe("lovable");
  });

  it("prefers Anthropic when Google and Lovable are absent", () => {
    const r = resolveModel("general", { anthropic: true, openrouter: true, lovable: false });
    expect(r.vendor).toBe("anthropic");
  });

  it("falls back to OpenRouter when it is the sole provider", () => {
    const r = resolveModel("general", { anthropic: false, openrouter: true, lovable: false });
    expect(r.vendor).toBe("openrouter");
  });

  it("Lovable primary keeps a Lovable gpt-5-mini fallback", () => {
    const r = resolveModel("general", { anthropic: false, openrouter: false, lovable: true });
    expect(r.vendor).toBe("lovable");
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
