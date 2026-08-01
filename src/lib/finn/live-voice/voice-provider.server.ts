// Voice capability registry. Intelligence/STT is Gemini-only; audible output
// uses the governed FINN ElevenLabs voice and never a reasoning model for TTS.
import type { VoiceProviderCapabilities } from "./types";

export function detectVoiceProvider(): VoiceProviderCapabilities {
  const gemini = Boolean(
    typeof process !== "undefined" &&
    (process.env?.GEMINI_API_KEY || process.env?.GOOGLE_GENERATIVE_AI_API_KEY),
  );
  const elevenLabs = Boolean(typeof process !== "undefined" && process.env?.ELEVENLABS_API_KEY);
  return {
    stt: gemini,
    tts: elevenLabs,
    reason:
      gemini && elevenLabs
        ? undefined
        : `Missing ${[!gemini ? "GEMINI_API_KEY" : "", !elevenLabs ? "ELEVENLABS_API_KEY" : ""]
            .filter(Boolean)
            .join(" and ")}`,
  };
}

export const VOICE_MODELS = {
  stt: "gemini-3.6-flash",
  tts: "eleven_multilingual_v2",
} as const;

export const VOICE_ENDPOINT = {
  stt: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
  tts: "https://api.elevenlabs.io/v1/text-to-speech",
} as const;

export const DEFAULT_VOICES: Readonly<Record<"ar" | "en", string>> = {
  ar: "izhopdR43PRI5gAmjXTj",
  en: "izhopdR43PRI5gAmjXTj",
};
