// Voice provider registry — detects capabilities from server env.
// Never fakes: absence of LOVABLE_API_KEY yields disabled capabilities.
import type { VoiceProviderCapabilities } from "./types";

export function detectVoiceProvider(): VoiceProviderCapabilities {
  const key = typeof process !== "undefined" ? process.env?.LOVABLE_API_KEY : undefined;
  if (!key) {
    return {
      stt: false,
      tts: false,
      reason: "LOVABLE_API_KEY not configured; voice features disabled",
    };
  }
  return { stt: true, tts: true };
}

export const VOICE_MODELS = {
  stt: "openai/gpt-4o-mini-transcribe",
  tts: "openai/gpt-4o-mini-tts",
} as const;

export const VOICE_ENDPOINT = {
  stt: "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
  tts: "https://ai.gateway.lovable.dev/v1/audio/speech",
} as const;

export const DEFAULT_VOICES: Readonly<Record<"ar" | "en", string>> = {
  ar: "alloy",
  en: "alloy",
};
