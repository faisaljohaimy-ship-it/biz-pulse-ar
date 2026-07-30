// Speech-to-text — forwards multipart audio to Lovable AI Gateway.
// Returns UNKNOWN when the provider is unavailable; never fabricates text.
import { SttResultSchema } from "./contracts";
import { detectVoiceProvider, VOICE_ENDPOINT, VOICE_MODELS } from "./voice-provider.server";
import { detectLanguage } from "./language-detection.server";
import type { SttResult, VoiceLang } from "./types";

export interface SttInput {
  readonly audio: Blob | File;
  readonly langHint?: VoiceLang;
  readonly signal?: AbortSignal;
}

export interface SttResponse {
  readonly ok: boolean;
  readonly result: SttResult | null;
  readonly reason?: string;
}

export async function transcribeAudio(input: SttInput): Promise<SttResponse> {
  const caps = detectVoiceProvider();
  if (!caps.stt) return { ok: false, result: null, reason: caps.reason ?? "STT unavailable" };
  const key = process.env.LOVABLE_API_KEY!;
  const started = Date.now();
  const form = new FormData();
  form.append("model", VOICE_MODELS.stt);
  form.append("file", input.audio, "recording.wav");
  if (input.langHint && input.langHint !== "unknown") form.append("language", input.langHint);

  let res: Response;
  try {
    res = await fetch(VOICE_ENDPOINT.stt, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: input.signal,
    });
  } catch (err) {
    if (input.signal?.aborted) return { ok: false, result: null, reason: "aborted" };
    return {
      ok: false,
      result: null,
      reason: err instanceof Error ? err.message : "network error",
    };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, result: null, reason: `stt ${res.status}: ${detail.slice(0, 160)}` };
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return { ok: false, result: null, reason: "invalid stt response" };
  }
  const text = extractText(payload);
  if (!text) return { ok: false, result: null, reason: "empty transcript" };

  const detected = detectLanguage(text);
  const parsed = SttResultSchema.safeParse({
    text,
    lang: input.langHint && input.langHint !== "unknown" ? input.langHint : detected,
    confidence: 0.8,
    durationMs: Date.now() - started,
  });
  if (!parsed.success) return { ok: false, result: null, reason: "stt validation failed" };
  return { ok: true, result: parsed.data };
}

function extractText(payload: unknown): string {
  if (payload && typeof payload === "object" && "text" in payload) {
    const t = (payload as { text?: unknown }).text;
    return typeof t === "string" ? t.trim() : "";
  }
  return "";
}
