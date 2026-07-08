// Text-to-speech — forwards to Lovable AI Gateway SSE endpoint.
// Returns UNKNOWN when the provider is unavailable; never fabricates audio.
import { TtsRequestSchema } from "./contracts";
import {
  detectVoiceProvider,
  VOICE_ENDPOINT,
  VOICE_MODELS,
  DEFAULT_VOICES,
} from "./voice-provider.server";
import type { TtsRequest } from "./types";

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
  const key = process.env.LOVABLE_API_KEY!;
  const lang = parsed.data.lang === "unknown" ? "en" : parsed.data.lang;
  const voice = parsed.data.voice ?? DEFAULT_VOICES[lang];

  let res: Response;
  try {
    res = await fetch(VOICE_ENDPOINT.tts, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VOICE_MODELS.tts,
        input: parsed.data.text,
        voice,
        speed: parsed.data.speed ?? 1,
        stream_format: "sse",
        response_format: "pcm",
      }),
      signal: opts.signal,
    });
  } catch (err) {
    if (opts.signal?.aborted) return { ok: false, stream: null, reason: "aborted" };
    return {
      ok: false,
      stream: null,
      reason: err instanceof Error ? err.message : "network error",
    };
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    return { ok: false, stream: null, reason: `tts ${res.status}: ${detail.slice(0, 160)}` };
  }
  return { ok: true, stream: res.body, contentType: "text/event-stream" };
}
