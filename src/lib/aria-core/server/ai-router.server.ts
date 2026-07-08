/**
 * ARIA Brain — SERVER-side AI Router.
 *
 * Called ONLY from `src/routes/api/chat.ts`. Never exposes model names to
 * the client.
 *
 * Current routing (stabilized): every intent → google/gemini-3-flash-preview
 * on the Lovable AI Gateway. Reason: openai/gpt-5 upstream returns HTTP 400
 * with the current tool+system payload size, which was silently killing every
 * chat reply. Gemini 3 Flash handles the same payload, supports tool calling,
 * and is fast/cheap. Fallback stays on gpt-5-mini if we ever need it.
 */

export type AriaIntent =
  | "general"
  | "executive"
  | "long-context"
  | "writing"
  | "engineering"
  | "unknown";

export type Vendor = "lovable" | "openrouter";

export interface ResolvedModel {
  vendor: Vendor;
  modelId: string;
  fallback?: { vendor: Vendor; modelId: string };
}

const LOVABLE_GEMINI_FLASH = "google/gemini-3-flash-preview";
const LOVABLE_GPT_5_MINI = "openai/gpt-5-mini";
const OPENROUTER_CLAUDE = "anthropic/claude-3.5-sonnet";

export function parseIntent(header: string | null | undefined): AriaIntent {
  const v = (header ?? "").toLowerCase().trim();
  switch (v) {
    case "general":
    case "executive":
    case "long-context":
    case "writing":
    case "engineering":
      return v;
    default:
      return "unknown";
  }
}

export interface AvailableProviders {
  lovable: boolean;
  openrouter: boolean;
}

export function resolveModel(_intent: AriaIntent, providers: AvailableProviders): ResolvedModel {
  if (providers.lovable) {
    return {
      vendor: "lovable",
      modelId: LOVABLE_GEMINI_FLASH,
      fallback: { vendor: "lovable", modelId: LOVABLE_GPT_5_MINI },
    };
  }
  // Last resort: only OpenRouter available.
  return {
    vendor: "openrouter",
    modelId: OPENROUTER_CLAUDE,
  };
}
