import { describe, expect, it } from "vitest";
import { FINN_ELEVENLABS_VOICE_ID, FINN_ELEVENLABS_VOICE_SETTINGS } from "./voice-config";

/**
 * Voice-config guard. FINN's audible voice is the single owner-selected male
 * voice, spoken with a deliberate, unhurried pace («عدم السرعة في النطق»).
 */
describe("FINN voice config", () => {
  it("keeps the canonical owner-selected FINN voice id", () => {
    expect(FINN_ELEVENLABS_VOICE_ID).toBe("izhopdR43PRI5gAmjXTj");
  });

  it("speaks at a measured pace — below the 1.0 default, never rushed", () => {
    expect(FINN_ELEVENLABS_VOICE_SETTINGS.speed).toBeLessThanOrEqual(0.92);
    // …but still natural, not sluggish (ElevenLabs floor is 0.7).
    expect(FINN_ELEVENLABS_VOICE_SETTINGS.speed).toBeGreaterThanOrEqual(0.8);
  });
});
