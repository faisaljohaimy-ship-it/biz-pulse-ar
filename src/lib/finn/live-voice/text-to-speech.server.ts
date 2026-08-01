// FINN live TTS — governed ElevenLabs voice; no model-compatible gateway.
import { TtsRequestSchema } from "./contracts";
import { detectVoiceProvider } from "./voice-provider.server";
import type { TtsRequest } from "./types";
import {
  ALLOWED_ELEVEN_VOICE_IDS,
  FINN_ELEVENLABS_MODEL,
  FINN_ELEVENLABS_VOICE_ID,
  FINN_ELEVENLABS_VOICE_SETTINGS,
} from "@/lib/finn/voice-config";

export interface TtsResponse {
  readonly ok: boolean;
  readonly stream: ReadableStream<Uint8Array> | null;
  readonly reason?: string;
  readonly contentType?: string;
}

export async function synthesizeSpeech(
  input: TtsRequest,
  opts: { signal?: AbortSignal } = {},
): Promise<TtsResponse> {
  const caps = detectVoiceProvider();
  if (!caps.tts) return { ok: false, stream: null, reason: caps.reason ?? "TTS unavailable" };
  const parsed = TtsRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, stream: null, reason: "invalid tts request" };
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return { ok: false, stream: null, reason: "TTS unavailable" };
  const requestedVoice = parsed.data.voice?.trim() ?? "";
  const voiceId = ALLOWED_ELEVEN_VOICE_IDS.has(requestedVoice)
    ? requestedVoice
    : FINN_ELEVENLABS_VOICE_ID;
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: parsed.data.text,
          model_id: FINN_ELEVENLABS_MODEL,
          voice_settings: {
            ...FINN_ELEVENLABS_VOICE_SETTINGS,
            speed: parsed.data.speed ?? FINN_ELEVENLABS_VOICE_SETTINGS.speed,
          },
        }),
        signal: opts.signal,
      },
    );
    if (!response.ok || !response.body) {
      return { ok: false, stream: null, reason: `tts ${response.status}` };
    }
    return { ok: true, stream: response.body, contentType: "audio/mpeg" };
  } catch (error) {
    if (opts.signal?.aborted) return { ok: false, stream: null, reason: "aborted" };
    return {
      ok: false,
      stream: null,
      reason: error instanceof Error ? error.message : "network error",
    };
  }
}
