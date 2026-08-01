/** FINN server-side model policy: native Google Gemini only. */
import { resolveGoogleGeminiModel } from "@/lib/ai-gateway.server";

export type FinnIntent =
  | "general"
  | "executive"
  | "long-context"
  | "writing"
  | "engineering"
  | "unknown";

export type Vendor = "google";

export interface ResolvedModel {
  vendor: Vendor;
  modelId: string;
}

export function parseIntent(header: string | null | undefined): FinnIntent {
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
  _intent: FinnIntent,
  _providers: AvailableProviders = {},
): ResolvedModel {
  return { vendor: "google", modelId: resolveGoogleGeminiModel() };
}
