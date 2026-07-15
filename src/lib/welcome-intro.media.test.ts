import { describe, expect, it } from "vitest";
import { WELCOME_INTRO_MEDIA } from "./welcome-intro.media";

describe("cinematic welcome media contract", () => {
  it("uses self-hosted, production-safe media paths", () => {
    expect(WELCOME_INTRO_MEDIA.videoSrc).toMatch(/^\/media\/.+\.mp4$/);
    expect(WELCOME_INTRO_MEDIA.posterSrc).toMatch(/^\/media\/.+\.webp$/);
  });

  it("keeps the hard cap beyond the full film and exit fade", () => {
    const fullPlaybackMs = WELCOME_INTRO_MEDIA.durationSeconds * 1_000;
    expect(WELCOME_INTRO_MEDIA.hardCapMs).toBeGreaterThan(
      fullPlaybackMs + WELCOME_INTRO_MEDIA.fadeMs,
    );
    expect(WELCOME_INTRO_MEDIA.minimumDisplayMs).toBe(3_500);
  });
});
