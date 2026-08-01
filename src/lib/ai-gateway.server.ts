import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * The only reasoning provider used by FINN and its council.
 *
 * Keep model selection server-owned. A client-supplied model identifier is
 * never forwarded unless it appears in this allow-list.
 */
export const GOOGLE_MODELS = [{ id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" }] as const;

export const DEFAULT_GOOGLE_MODEL = "gemini-3.6-flash";

export const createGoogleGeminiProvider = (apiKey: string) =>
  createGoogleGenerativeAI({
    apiKey,
    name: "finn-google-gemini",
    headers: { "x-goog-api-client": "enjaz-finn/1.0" },
  });

/** Resolve a server-configured production Gemini model. */
export function resolveGoogleGeminiModel(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env.GEMINI_MODEL?.trim() ?? "";
  return GOOGLE_MODELS.some(({ id }) => id === configured) ? configured : DEFAULT_GOOGLE_MODEL;
}

export function isGeminiModelId(modelId: string): boolean {
  return GOOGLE_MODELS.some(({ id }) => id === modelId);
}
