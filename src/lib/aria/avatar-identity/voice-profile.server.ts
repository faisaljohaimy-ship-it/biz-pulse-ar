// Voice profile — locks vocal persona metadata for every TTS surface.
import { getAriaIdentity } from "./identity.server";
import type { VoicePersonalityRule } from "./types";

export function getVoiceProfile(): VoicePersonalityRule {
  return getAriaIdentity().voice;
}

export function isVoiceCompliant(input: {
  readonly pitch_hz?: number;
  readonly rate_wpm?: number;
  readonly lang?: "ar" | "en";
}): { ok: boolean; issues: readonly string[] } {
  const v = getVoiceProfile();
  const issues: string[] = [];
  if (typeof input.pitch_hz === "number") {
    if (input.pitch_hz < v.pitch_hz_range.low || input.pitch_hz > v.pitch_hz_range.high) {
      issues.push(
        `pitch ${input.pitch_hz}Hz outside ${v.pitch_hz_range.low}-${v.pitch_hz_range.high}`,
      );
    }
  }
  if (typeof input.rate_wpm === "number" && input.lang) {
    const target = v.speaking_rate_wpm[input.lang];
    if (Math.abs(input.rate_wpm - target) > target * 0.25) {
      issues.push(`rate ${input.rate_wpm}wpm drifts from ${target}wpm target`);
    }
  }
  return { ok: issues.length === 0, issues };
}
