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

    const playingCount = await page.evaluate(() => {
      const audios = Array.from(document.querySelectorAll("audio"));
      const videos = Array.from(document.querySelectorAll("video"));
      // A silent, muted video is fine (background loop). A playing audio is not.
      const playingAudio = audios.filter((a) => !a.paused).length;
      const playingUnmutedVideo = videos.filter((v) => !v.paused && !v.muted).length;
      return playingAudio + playingUnmutedVideo;
    });

    expect(playingCount, "no audio should be playing before a user gesture").toBe(0);
  });
});
