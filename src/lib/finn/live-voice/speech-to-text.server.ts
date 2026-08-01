// FINN live speech-to-text — native Google Gemini only.
import { SttResultSchema } from "./contracts";
import { transcribeWithGemini } from "@/lib/finn/gemini-transcription.server";
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
  const started = Date.now();
  try {
    const result = await transcribeWithGemini(input.audio, {
      signal: input.signal,
      languageHint: input.langHint,
    });
    const detected = detectLanguage(result.text);
    const parsed = SttResultSchema.safeParse({
      text: result.text,
      lang: input.langHint && input.langHint !== "unknown" ? input.langHint : detected,
      // Gemini's text response does not expose calibrated STT confidence.
      confidence: 0.8,
      durationMs: Date.now() - started,
    });
    if (!parsed.success) return { ok: false, result: null, reason: "stt validation failed" };
    return { ok: true, result: parsed.data };
  } catch (error) {
    if (input.signal?.aborted) return { ok: false, result: null, reason: "aborted" };
    return {
      ok: false,
      result: null,
      reason: error instanceof Error ? error.message : "Gemini transcription failed",
    };
  }
}
