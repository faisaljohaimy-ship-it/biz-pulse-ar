/**
 * Contract test for the Nusuk platform URL foundation (owner directive
 * 2026-07-19): the canonical deployment is built in — «أساس وليس فجوة» —
 * so every icon/sidebar/showcase surface opens externally even with no
 * environment configuration. VITE_HAJJ_EMBED_URL only overrides it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { HAJJ_PLATFORM, hajjPlatformUrl } from "./platforms";

const CANONICAL = "https://id-preview--cce9f994-0d49-4dfc-b825-6e9374183af6.lovable.app/";

describe("hajjPlatformUrl — canonical foundation with env override", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the canonical deployment when no env override is set", () => {
    vi.stubEnv("VITE_HAJJ_EMBED_URL", "");
    expect(hajjPlatformUrl()).toBe(CANONICAL);
    expect(HAJJ_PLATFORM.url).toBe(CANONICAL);
  });

  it("lets VITE_HAJJ_EMBED_URL override the canonical deployment", () => {
    vi.stubEnv("VITE_HAJJ_EMBED_URL", "https://hajj.neexios.com/");
    expect(hajjPlatformUrl()).toBe("https://hajj.neexios.com/");
  });

  it("rejects a non-https override and still serves the canonical URL", () => {
    vi.stubEnv("VITE_HAJJ_EMBED_URL", "http://insecure.example.com/");
    expect(hajjPlatformUrl()).toBe(CANONICAL);
  });

  it("rejects a malformed override and still serves the canonical URL", () => {
    vi.stubEnv("VITE_HAJJ_EMBED_URL", "not a url");
    expect(hajjPlatformUrl()).toBe(CANONICAL);
  });
});
