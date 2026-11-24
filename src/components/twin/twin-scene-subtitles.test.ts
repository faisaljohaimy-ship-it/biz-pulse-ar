import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TWIN_NARRATION, TWIN_SCENE_SUBTITLES } from "./twin-narration";

function seconds(stamp: string) {
  const [hours, minutes, seconds] = stamp.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

describe("original digital-twin scene subtitles", () => {
  it.each(["ar", "en"] as const)(
    "shows the full %s script in its original scene windows",
    (lang) => {
      const track = TWIN_SCENE_SUBTITLES[lang];
      const [header, ...blocks] = readFileSync(`public${track.src}`, "utf8").trim().split("\n\n");
      expect(header).toBe("WEBVTT");
      expect(track.default).toBe(true);
      const cues = blocks.map((block) => {
        const [id, timing, ...lines] = block.split("\n");
        const [start, end] = timing.split(" --> ").map(seconds);
        return { scene: id.split("-")[0], start, end, text: lines.join(" ") };
      });
      const scenes = TWIN_NARRATION.scripts[lang];
      expect([...new Set(cues.map((cue) => cue.scene))]).toEqual(scenes.map((scene) => scene.id));
      for (const scene of scenes) {
        const sceneCues = cues.filter((cue) => cue.scene === scene.id);
        expect(sceneCues.map((cue) => cue.text).join(" ")).toBe(scene.text);
        let previousEnd: number = scene.start;
        for (const cue of sceneCues) {
          expect(cue.start).toBe(previousEnd);
          expect(cue.end).toBeGreaterThan(cue.start);
          previousEnd = cue.end;
        }
        expect(previousEnd).toBe(scene.end);
      }
    },
  );
});
