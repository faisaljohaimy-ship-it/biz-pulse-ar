/**
 * Shared ARIA voice config.
 *
 * This module is the single source of truth for the ElevenLabs voice
 * identity used across the entire product: the ARIA chatbot (via the
 * canonical `/api/aria/tts` runtime), the public landing voice (via `/api/public/aria-tts`),
 * and the Executive Voice Tour. Anything that speaks as ARIA MUST
 * import from here — never hardcode a second voice ID.
 */

/** ARIA canonical voice — Layan (The Professional, ar-SA). LOCKED. */
export const ARIA_ELEVENLABS_VOICE_ID = "gVzwmdZzRgBrNjXaTmi5";

/** Voice settings shared by every ARIA TTS call. */
export const ARIA_ELEVENLABS_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.8,
  style: 0.45,
  use_speaker_boost: true,
  speed: 1.0,
} as const;

/** ElevenLabs model shared by public + authenticated paths. */
export const ARIA_ELEVENLABS_MODEL = "eleven_multilingual_v2";
