import { test, expect } from "@playwright/test";

/**
 * ARIA voice/audio must never autoplay on a fresh page load — browsers
 * block it and it's a governance requirement. Verify no <audio> element
 * enters a playing state before any user gesture.
 */
test.describe("ARIA — no audio autoplay", () => {
  test("no audio plays before user gesture", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Give any auto-mount code a chance to run.
    await page.waitForTimeout(2_500);

    const { playingCount, activeMedia } = await page.evaluate(() => {
      const audios = Array.from(document.querySelectorAll("audio"));
      const videos = Array.from(document.querySelectorAll("video"));
      // Preserve both original predicates. Attribute the unexpected media on
      // failure so a legitimate film is not confused with SADEED/ARIA TTS.
      const active = [
        ...audios.filter((a) => !a.paused),
        ...videos.filter((v) => !v.paused && !v.muted),
      ];
      return {
        playingCount: active.length,
        activeMedia: active.map((media) => ({
          tag: media.tagName.toLowerCase(),
          id: media.id || null,
          label: media.getAttribute("aria-label"),
          muted: media.muted,
          volume: media.volume,
          autoplay: media.autoplay,
          parentTag: media.parentElement?.tagName.toLowerCase() ?? null,
        })),
      };
    });

    expect(
      playingCount,
      `no audio should be playing before a user gesture; active media: ${JSON.stringify(activeMedia)}`,
    ).toBe(0);
  });
});
