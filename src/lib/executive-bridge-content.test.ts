import { describe, expect, it } from "vitest";
import { EXECUTIVE_BRIDGE_SCENES, executiveBridgeNarration } from "./executive-bridge-content";

describe("executive bridge story", () => {
  it("ships exactly seven distinct executive chapters", () => {
    expect(EXECUTIVE_BRIDGE_SCENES).toHaveLength(7);
    expect(new Set(EXECUTIVE_BRIDGE_SCENES.map((scene) => scene.id)).size).toBe(7);
  });

  it("keeps every ARIA narration bilingual and inside the public TTS limit", () => {
    for (const scene of EXECUTIVE_BRIDGE_SCENES) {
      for (const language of ["ar", "en"] as const) {
        const narration = executiveBridgeNarration(scene, language);
        expect(narration.length).toBeGreaterThan(220);
        expect(narration.length).toBeLessThanOrEqual(1200);
      }
    }
  });

  it("labels every scene that renders simulated operating values", () => {
    const simulated = EXECUTIVE_BRIDGE_SCENES.filter(
      (scene) => "showSimRibbon" in scene && scene.showSimRibbon,
    );
    expect(simulated.map((scene) => scene.id)).toEqual([
      "command-pulse",
      "decision-engine",
      "regional-grid",
      "aria-council",
      "digital-twin",
    ]);
  });
});
