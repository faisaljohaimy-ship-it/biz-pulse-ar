import {
  bytesToBase64,
  extractGeminiText,
  normalizeGeminiTranscript,
} from "@/lib/sadeed/gemini-audio";
import { resolveGoogleGeminiModel } from "@/lib/ai-gateway.server";

export const MAX_GEMINI_AUDIO_BYTES = 12 * 1024 * 1024;
export const GEMINI_AUDIO_TYPES = new Set([
  "audio/m4a",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
  "video/mp4",
]);

export type GeminiTranscription = {
  text: string;
  model: string;
  provider: "google-gemini";
};

export async function transcribeWithGemini(
  audio: Blob,
  options: { signal?: AbortSignal; languageHint?: "ar" | "en" | "unknown" } = {},
): Promise<GeminiTranscription> {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)?.trim();
  if (!apiKey) throw new Error("Gemini transcription is not configured");
  if (!audio.size || audio.size > MAX_GEMINI_AUDIO_BYTES) {
    throw new Error("Audio size is outside the safe transcription limit");
  }
  const mediaType = (audio.type || "audio/webm").split(";", 1)[0]!.toLowerCase();
  if (!GEMINI_AUDIO_TYPES.has(mediaType)) throw new Error("Unsupported audio type");

  const model = resolveGoogleGeminiModel({
    ...process.env,
    GEMINI_MODEL: process.env.GEMINI_TRANSCRIBE_MODEL || process.env.GEMINI_MODEL,
  });
  const languageLine =
    options.languageHint === "ar"
      ? "اللغة المتوقعة عربية."
      : options.languageHint === "en"
        ? "The expected language is English."
        : "Detect Arabic or English from the recording.";
  const inlineAudio = bytesToBase64(new Uint8Array(await audio.arrayBuffer()));
  const timeoutSignal = AbortSignal.timeout(45_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are SADEED's transcription engine for industrial-security conversations. Transcribe faithfully. Return only the spoken text, with no explanation, Markdown, action, or invented content. If speech is unintelligible return <NO_SPEECH>.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: languageLine },
              { inlineData: { mimeType: mediaType, data: inlineAudio } },
            ],
          },
        ],
        // Gemini 3.6 deprecates temperature/top-p/top-k controls.
        generationConfig: { maxOutputTokens: 2_048 },
      }),
      signal,
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Gemini transcription failed (${response.status})`);
  const text = normalizeGeminiTranscript(extractGeminiText(payload));
  if (!text) throw new Error("No speech was detected");
  return { text: text.slice(0, 10_000), model, provider: "google-gemini" };
}
