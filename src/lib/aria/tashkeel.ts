/**
 * Arabic tashkeel (diacritics) — single source of truth.
 *
 * NEXIOS doctrine: FINN's spoken output keeps full Arabic diacritics so the
 * TTS layer (ElevenLabs Layan) pronounces Modern Standard Arabic correctly,
 * while the on-screen text stays clean and undiacritized. The diacritized
 * form is authoritative; the display form is derived by stripping the marks.
 * Shared by the page-script narrations and the FINN chat renderer so both
 * strip identically. Base letters are never touched — only combining harakat,
 * the dagger alef, and tatweel are removed.
 */

/** Harakat (U+064B–U+0652) + dagger alef (U+0670) + tatweel (U+0640). */
export const TASHKEEL_RE = /[ً-ْٰـ]/g;

/** Remove tashkeel for clean UI display; letters are left intact. */
export function stripTashkeel(input: string): string {
  return input.replace(TASHKEEL_RE, "");
}
