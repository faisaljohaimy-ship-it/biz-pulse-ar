// Cinematic opening sequence — deterministic beat plan (server-only).
import { SHOWCASE_CONTRACTS } from "./contracts";

export interface CinematicBeat {
  readonly at: number;
  readonly kind: "fade_in" | "logo" | "aria_reveal" | "tagline" | "handoff";
  readonly label_ar?: string;
  readonly label_en?: string;
}

export function buildCinematicIntro(): readonly CinematicBeat[] {
  const beats: CinematicBeat[] = [
    { at: 0, kind: "fade_in" },
    { at: 900, kind: "logo", label_ar: "نيكسوس", label_en: "NEXIOS" },
    { at: 2200, kind: "aria_reveal", label_ar: "أريا", label_en: "ARIA" },
    { at: 3600, kind: "tagline",
      label_ar: "ذكاء تنفيذي مباشر", label_en: "Live Executive Intelligence" },
    { at: 5200, kind: "handoff" },
  ];
  if (beats[beats.length - 1].at > SHOWCASE_CONTRACTS.INTRO_MAX_MS) {
    throw new Error("intro exceeds max duration");
  }
  return beats;
}
