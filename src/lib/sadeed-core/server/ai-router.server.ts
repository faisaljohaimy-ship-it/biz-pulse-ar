/**
 * SADEED server-side Gemini model policy: which Gemini model a turn uses.
 * Which ENGINE answers (Gemini, the opt-in adapter, or deterministic zero-cost)
 * is decided once in `src/lib/sadeed/llm/provider-plan.server.ts`.
 */
import { resolveGoogleGeminiModel } from "@/lib/ai-gateway.server";

export type SadeedIntent =
  "general" | "executive" | "long-context" | "writing" | "engineering" | "unknown";

export type Vendor = "google";

export interface ResolvedModel {
  vendor: Vendor;
  modelId: string;
}

export function parseIntent(header: string | null | undefined): SadeedIntent {
  const value = (header ?? "").toLowerCase().trim();
  switch (value) {
    case "general":
    case "executive":
    case "long-context":
    case "writing":
    case "engineering":
      return value;
    default:
      return "unknown";
  }
}

export interface AvailableProviders {
  google?: boolean;
}

/** Intent changes instructions and tools, never the model vendor. */
export function resolveModel(
  _intent: SadeedIntent,
  _providers: AvailableProviders = {},
): ResolvedModel {
  return { vendor: "google", modelId: resolveGoogleGeminiModel() };
}
