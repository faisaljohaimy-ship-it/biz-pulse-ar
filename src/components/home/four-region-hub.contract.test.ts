/**
 * Four-Region Executive Hub — contract guard.
 *
 * Locks the spec's non-negotiables so a future edit can't silently regress
 * them: live data (not a static poster), a visible simulation badge, the four
 * regions from regions.ts, the FINN persona from the single BRAND_ASSISTANT
 * config, and strict animation discipline (transform/opacity only, no
 * box-shadow/filter keyframes, reduced-motion honoured).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = (p: string) => readFileSync(p, "utf8");
const HUB = src("src/components/home/FourRegionHub.tsx");
const CARD = src("src/components/home/FinnPersonaCard.tsx");
const INDEX = src("src/routes/index.tsx");
const DOMAIN = src("src/lib/domain.ts");

describe("FourRegionHub — live executive hub", () => {
  it("is the home centerpiece and the static poster is gone", () => {
    expect(INDEX).toContain("<FourRegionHub />");
    expect(INDEX).not.toContain("<NexiosCommandCenter />");
  });

  it("reads LIVE data from the resilient command-center server fn", () => {
    expect(HUB).toContain("getCommandCenterState");
    expect(HUB).toContain("useQuery");
    // open showcase read: gated on auth-loading only, never enabled:!!user
    expect(HUB).toContain("enabled: !authLoading");
    expect(HUB).not.toMatch(/enabled:\s*!!\s*user|enabled:\s*Boolean\(user\)/);
  });

  it("shows the simulation badge and covers all four regions from regions.ts", () => {
    expect(HUB).toContain("محاكاة");
    expect(HUB).toContain("REGIONS.map");
    expect(HUB).toContain("REGION_ACCENT_HEX");
  });

  it("animates transform/opacity only — no box-shadow/filter keyframes", () => {
    const keyframeBlocks = HUB.match(/@keyframes[\s\S]*?\}\s*\}/g) ?? [];
    for (const block of [...keyframeBlocks, ...(CARD.match(/@keyframes[\s\S]*?\}\s*\}/g) ?? [])]) {
      expect(block).not.toMatch(/box-shadow|filter:|blur\(/);
    }
    expect(HUB).toContain("prefers-reduced-motion");
    expect(CARD).toContain("prefers-reduced-motion");
    // freezes off-screen with the parent's data-nx-frozen contract
    expect(HUB).toContain("data-nx-frozen");
  });
});

describe("FINN persona — single-source display identity", () => {
  it("draws name + portrait from BRAND_ASSISTANT and routes to /finn", () => {
    expect(DOMAIN).toContain("BRAND_ASSISTANT");
    expect(CARD).toContain("BRAND_ASSISTANT");
    expect(CARD).toContain('to="/finn"');
    // portrait is the compressed webp with explicit dimensions + lazy load
    expect(DOMAIN).toContain("/finn.webp");
    expect(CARD).toMatch(/width=\{?560/);
    expect(CARD).toContain('loading="lazy"');
  });

  it("never introduces browser TTS on the display card", () => {
    expect(CARD).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/);
  });
});
