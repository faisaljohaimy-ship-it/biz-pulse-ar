import { describe, expect, it } from "vitest";
import { EXECUTIVE_PRESENTATION_MEDIA } from "./executive-presentation.media";

describe("executive presentation media contract", () => {
  it("uses self-hosted, production-safe media paths", () => {
    expect(EXECUTIVE_PRESENTATION_MEDIA.videoSrc).toMatch(/^\/media\/.+\.mp4$/);
    expect(EXECUTIVE_PRESENTATION_MEDIA.posterSrc).toMatch(/^\/media\/.+\.webp$/);
    expect(EXECUTIVE_PRESENTATION_MEDIA.chaptersSrc).toMatch(/^\/media\/.+\.vtt$/);
  });

  it("keeps all chapter cues ordered and inside the film", () => {
    const cues = [...EXECUTIVE_PRESENTATION_MEDIA.cueSeconds];
    expect(cues).toEqual([...cues].sort((a, b) => a - b));
    expect(new Set(cues).size).toBe(cues.length);
    expect(cues[0]).toBe(0);
    expect(cues.at(-1)).toBeLessThan(EXECUTIVE_PRESENTATION_MEDIA.durationSeconds);
  });
});
