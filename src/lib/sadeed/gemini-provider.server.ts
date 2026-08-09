import { createGoogleGeminiProvider, resolveGoogleGeminiModel } from "@/lib/ai-gateway.server";

export interface SadeedGeminiRuntime {
  provider: ReturnType<typeof createGoogleGeminiProvider>;
  modelId: string;
  vendor: "google-gemini";
}

function resolveGoogleKey(): string | null {
  return (
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || null
  );
}

/**
 * SADEED has one deliberate runtime path: Google's native Gemini API.
 * The array shape is retained for callers that perform bounded retry, but it
 * never crosses into another intelligence vendor or compatibility gateway.
 */
export function resolveSadeedGeminiRuntimes(): SadeedGeminiRuntime[] {
  const apiKey = resolveGoogleKey();
  if (!apiKey) return [];
  return [
    {
      provider: createGoogleGeminiProvider(apiKey),
      modelId: resolveGoogleGeminiModel(),
      vendor: "google-gemini",
    },
  ];
}

export function resolveSadeedGeminiRuntime(): SadeedGeminiRuntime {
  const runtime = resolveSadeedGeminiRuntimes()[0];
  if (runtime) return runtime;
  throw new Error(
    "GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is required — SADEED is Gemini-only",
  );
}
