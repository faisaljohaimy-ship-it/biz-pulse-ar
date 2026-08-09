/** Shared SADEED Gemini voice and reasoning defaults. */

/** Stable Gemini Flash model used for SADEED reasoning and audio understanding. */
export const SADEED_GEMINI_FLASH_MODEL = "gemini-3.6-flash";

/** Low-latency Gemini speech model. Google currently marks it Preview. */
export const SADEED_GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

/** SADEED's Gemini prebuilt voice — "Algieba" (Smooth): a warm, calm, deep male
 *  timbre. Chosen over the firmer "Charon" so SADEED sounds gentle and natural,
 *  never booming or robotic. Deployments may override. */
export const SADEED_GEMINI_TTS_VOICE = "Algieba";

export const SADEED_GEMINI_TTS_SAMPLE_RATE = 24_000;

/** Natural-language direction — a beautiful, calm Saudi male voice: soft,
 *  warm, deep without booming, unhurried and refined (not formal/robotic). */
export const SADEED_GEMINI_TTS_DIRECTION =
  "اقرأ بصوتِ رجلٍ سعوديٍّ هادئ ودافئ وجميل، ناعمِ النبرة، عميقٍ دون جهورية أو نبرة آلية، بإيقاعٍ متمهّلٍ مطمئن ولمسةٍ احترافية راقية. انطق النص التالي فقط كما هو، من دون إضافة مقدمة أو تعليق:";

// Compatibility exports retained because the full SADEED repository may
// still contain older public-voice imports outside this focused overlay.
// The authenticated SADEED chat no longer calls ElevenLabs.

/** Canonical SADEED voice — the audible voice spoken by `/api/sadeed/tts`
 *  (ElevenLabs, server-side). Owner-selected male voice. */
export const SADEED_ELEVENLABS_VOICE_ID = "izhopdR43PRI5gAmjXTj";

/** Calmer, smoother, DELIBERATE delivery: steady stability, low style, and a
 *  measured pace (speed 0.9, below the 1.0 default) so SADEED enunciates every
 *  word clearly and is never rushed — per the constitution's spoken-clarity
 *  clause («عدم السرعة في النطق»). Used by /api/sadeed/tts and
 *  /api/public/sadeed-tts. */
export const SADEED_ELEVENLABS_VOICE_SETTINGS = {
  stability: 0.62,
  similarity_boost: 0.85,
  style: 0.2,
  use_speaker_boost: true,
  speed: 0.9,
} as const;

/** @deprecated Legacy compatibility only. */
export const SADEED_ELEVENLABS_MODEL = "eleven_multilingual_v2";

/**
 * Specialist agent voices — ElevenLabs PREMADE (stock) voices, free within
 * the existing subscription. Keyed by the digital-humans registry
 * `voiceProfileId`. SADEED himself is deliberately ABSENT: his audible voice
 * is the single canonical SADEED voice (SADEED_ELEVENLABS_VOICE_ID) —
 * non-negotiable doctrine. The server TTS routes accept a `voiceId` ONLY
 * when it appears in this map's values; anything else falls back to SADEED's.
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

/** Server-side whitelist: the ONLY voice ids `/api/sadeed/tts` will honor. */
export const ALLOWED_ELEVEN_VOICE_IDS: ReadonlySet<string> = new Set(
  Object.values(AGENT_ELEVEN_VOICES),
);
