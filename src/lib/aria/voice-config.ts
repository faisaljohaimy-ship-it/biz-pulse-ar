/** Shared ARIA Gemini voice and reasoning defaults. */

/** Stable Gemini Flash model used for ARIA reasoning and audio understanding. */
export const ARIA_GEMINI_FLASH_MODEL = "gemini-3.5-flash";

/** Low-latency Gemini speech model. Google currently marks it Preview. */
export const ARIA_GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

/** ARIA's Gemini prebuilt voice. Server deployments may override it. */
export const ARIA_GEMINI_TTS_VOICE = "Kore";

export const ARIA_GEMINI_TTS_SAMPLE_RATE = 24_000;

/** Natural-language direction preserves ARIA's Arabic speaking persona. */
export const ARIA_GEMINI_TTS_DIRECTION =
  "اقرئي بصوت مساعدَة عربية دافئ وواثق واحترافي، بلهجة سعودية طبيعية وسرعة محادثة هادئة. انطقي النص التالي فقط كما هو، من دون إضافة مقدمة أو تعليق:";

// Compatibility exports retained because the full NEXIOS repository may
// still contain older public-voice imports outside this focused overlay.
// The authenticated ARIA chat no longer calls ElevenLabs.

/** @deprecated Legacy compatibility only; `/api/aria/tts` uses Gemini. */
export const ARIA_ELEVENLABS_VOICE_ID = "gVzwmdZzRgBrNjXaTmi5";

/** @deprecated Legacy compatibility only. */
export const ARIA_ELEVENLABS_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.8,
  style: 0.45,
  use_speaker_boost: true,
  speed: 1.0,
} as const;

/** @deprecated Legacy compatibility only. */
export const ARIA_ELEVENLABS_MODEL = "eleven_multilingual_v2";

/**
 * Specialist agent voices — ElevenLabs PREMADE (stock) voices, free within
 * the existing subscription. Keyed by the digital-humans registry
 * `voiceProfileId`. ARIA herself is deliberately ABSENT: her audible voice
 * is exclusively Layan (ARIA_ELEVENLABS_VOICE_ID) — non-negotiable doctrine.
 * The server TTS routes accept a `voiceId` ONLY when it appears in this
 * map's values; anything else falls back to Layan.
 */
export const AGENT_ELEVEN_VOICES: Record<string, string> = {
  incident: "pNInz6obpgDQGcFmaJgB", // Adam — authoritative command voice
  risk: "ErXwobaYiN019PkySvjV", // Antoni — analytical
  compliance: "21m00Tcm4TlvDq8ikWAM", // Rachel — precise, formal
  cctv: "TxGEqnHWrfWFTfGW9XjX", // Josh — observant, calm
  patrol: "VR6AewLTigWG4xSOukaG", // Arnold — field commander
  emergency: "AZnzlk1XvdvUeBnXmlld", // Domi — urgent, clear
  visitor: "EXAVITQu4vr4xnSDxMaL", // Bella — welcoming
  knowledge: "MF3mGyEYCl7XYWbV9V6O", // Elli — librarian warmth
  reporting: "JBFqnCBsd6RMkjVDRZzb", // George — broadcast narrator
  twin: "IKne3meq5aSn9XLyUdCD", // Charlie — technical
};

/** Server-side whitelist: the ONLY voice ids `/api/aria/tts` will honor. */
export const ALLOWED_ELEVEN_VOICE_IDS: ReadonlySet<string> = new Set(
  Object.values(AGENT_ELEVEN_VOICES),
);
