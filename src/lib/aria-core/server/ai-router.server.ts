/**
 * ARIA Brain — SERVER-side AI Router.
 *
 * Maps client-declared intents to concrete models and owns fallback. Called
 * ONLY from `src/routes/api/chat.ts`. Never exposes model names to the client.
 *
 * Routing table (Phase 1):
 *   general       → openai/gpt-5-mini     (Lovable Gateway)   [fallback: gpt-5-nano]
 *   executive     → openai/gpt-5          (Lovable Gateway)   [fallback: gpt-5-mini]
 *   long-context  → anthropic/claude-3.5-sonnet (OpenRouter)  [fallback: openai/gpt-5]
 *   writing       → anthropic/claude-3.5-sonnet (OpenRouter)  [fallback: openai/gpt-5]
 *   engineering   → anthropic/claude-3.5-sonnet (OpenRouter)  [fallback: openai/gpt-5]
 *   unknown       → openai/gpt-5          (Lovable Gateway)   [fallback: gpt-5-mini]
 *
 * If OpenRouter (Claude) is unavailable, Claude intents transparently degrade
 * to OpenAI via Lovable Gateway.
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

const LOVABLE_GPT_5 = "openai/gpt-5";
const LOVABLE_GPT_5_MINI = "openai/gpt-5-mini";
const LOVABLE_GPT_5_NANO = "openai/gpt-5-nano";
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

export function resolveModel(
  intent: AriaIntent,
  providers: AvailableProviders,
): ResolvedModel {
  const needsClaude =
    intent === "long-context" || intent === "writing" || intent === "engineering";

  if (needsClaude && providers.openrouter) {
    return {
      vendor: "openrouter",
      modelId: OPENROUTER_CLAUDE,
      fallback: providers.lovable
        ? { vendor: "lovable", modelId: LOVABLE_GPT_5 }
        : undefined,
    };
  }

  if (needsClaude && providers.lovable) {
    // Claude unavailable — degrade to strongest OpenAI on Lovable Gateway.
    return {
      vendor: "lovable",
      modelId: LOVABLE_GPT_5,
      fallback: { vendor: "lovable", modelId: LOVABLE_GPT_5_MINI },
    };
  }

  if (intent === "general" && providers.lovable) {
    return {
      vendor: "lovable",
      modelId: LOVABLE_GPT_5_MINI,
      fallback: { vendor: "lovable", modelId: LOVABLE_GPT_5_NANO },
    };
  }

  if (intent === "executive" && providers.lovable) {
    return {
      vendor: "lovable",
      modelId: LOVABLE_GPT_5,
      fallback: { vendor: "lovable", modelId: LOVABLE_GPT_5_MINI },
    };
  }

  if (providers.lovable) {
    return {
      vendor: "lovable",
      modelId: LOVABLE_GPT_5,
      fallback: { vendor: "lovable", modelId: LOVABLE_GPT_5_MINI },
    };
  }

  // Last resort: only OpenRouter available.
  return {
    vendor: "openrouter",
    modelId: OPENROUTER_CLAUDE,
  };
}
