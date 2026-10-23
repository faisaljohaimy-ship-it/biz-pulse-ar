import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("src/styles/sadeed-cinematic-playback.css", "utf8");
const route = readFileSync("src/components/cinematic/SadeedCinematicExperience.tsx", "utf8");
const twin = readFileSync("src/routes/_authenticated/sec.twin.tsx", "utf8");

describe("cinematic playback contract", () => {
  it("embeds the shared player without weakening frame protections", () => {
    expect(twin).not.toContain("<iframe");
    expect(twin).toContain("<SadeedCinematicExperience embedded />");
    expect(twin).toContain("<Suspense");
    expect(route).toContain('const Container = embedded ? "section" : "main"');
  });

  it("pauses attached animations instead of removing them", () => {
    expect(css).toContain(":not(.is-playing) *");
    expect(css).toContain("animation-play-state: paused");
    expect(css).toContain("sd-cinema-camera 28s");
  });

  it("honors reduced motion and pauses while the document is hidden", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(route).toContain('document.addEventListener("visibilitychange", syncVisibility)');
    expect(route).toContain('document.removeEventListener("visibilitychange", syncVisibility)');
    expect(route).toContain('preference.removeEventListener("change", syncMotion)');
    expect(route).toContain("playing && !reducedMotion && pageVisible && !imageFailed");
  });

  it("provides a failed-media recovery action without claiming live video", () => {
    expect(route).toContain("onError={() => setImageFailed(true)}");
    expect(route).toContain("إعادة تحميل المشهد");
    expect(route).toContain("وليس ملف فيديو MP4 أو بثًا حيًا");
  });
});
