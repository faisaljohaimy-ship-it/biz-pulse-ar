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

export type Vendor = "openai" | "google" | "lovable" | "openrouter" | "anthropic";

export interface ResolvedModel {
  vendor: Vendor;
  modelId: string;
  fallback?: { vendor: Vendor; modelId: string };
}

// OpenAI default — overridable via OPENAI_MODEL (resolved where the provider is
// built). "gpt-5.4-mini" is not a real model id, so we default to gpt-4o-mini.
const OPENAI_DEFAULT = "gpt-4o-mini";
const GOOGLE_GEMINI_FLASH = "gemini-2.5-flash";
const LOVABLE_GEMINI_FLASH = "google/gemini-3-flash-preview";
const LOVABLE_GPT_5_MINI = "openai/gpt-5-mini";
const OPENROUTER_CLAUDE = "anthropic/claude-3.5-sonnet";
const ANTHROPIC_SONNET = "claude-3-5-sonnet-latest";

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
  openai?: boolean;
  google?: boolean;
  lovable: boolean;
  openrouter: boolean;
  anthropic?: boolean;
}

export function resolveModel(_intent: AriaIntent, providers: AvailableProviders): ResolvedModel {
  // Priority: Google (native free tier) → Lovable Gateway (always provisioned)
  // → OpenAI → Anthropic → OpenRouter.
  //
  // ARIA PERMANENT-ON policy: LOVABLE_API_KEY is auto-provisioned for every
  // project and backed by workspace credits, so it is the reliable default
  // whenever third-party billing (Anthropic) or third-party auth (OpenRouter)
  // is failing. Only native Google Gemini's free tier outranks it.

  if (providers.google) {
    return {
      vendor: "google",
      modelId: GOOGLE_GEMINI_FLASH,
      fallback: providers.lovable
        ? { vendor: "lovable", modelId: LOVABLE_GEMINI_FLASH }
        : providers.openai
          ? { vendor: "openai", modelId: process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT }
          : providers.anthropic
            ? { vendor: "anthropic", modelId: ANTHROPIC_SONNET }
            : providers.openrouter
              ? { vendor: "openrouter", modelId: OPENROUTER_CLAUDE }
              : undefined,
    };
  }

  // Lovable Gateway — always-provisioned, workspace-credit backed. This is
  // the permanent-on default when native Google is not configured.
  if (providers.lovable) {
    return {
      vendor: "lovable",
      modelId: LOVABLE_GEMINI_FLASH,
      fallback: { vendor: "lovable", modelId: LOVABLE_GPT_5_MINI },
    };
  }

  if (providers.openai) {
    return {
      vendor: "openai",
      modelId: process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT,
      fallback: providers.anthropic
        ? { vendor: "anthropic", modelId: ANTHROPIC_SONNET }
        : providers.openrouter
          ? { vendor: "openrouter", modelId: OPENROUTER_CLAUDE }
          : undefined,
    };
  }

  if (providers.anthropic) {
    return {
      vendor: "anthropic",
      modelId: ANTHROPIC_SONNET,
      fallback: providers.openrouter
        ? { vendor: "openrouter", modelId: OPENROUTER_CLAUDE }
        : undefined,
    };
  }

  if (providers.openrouter) {
    return { vendor: "openrouter", modelId: OPENROUTER_CLAUDE };
  }

  // No provider configured — caller surfaces localized "unavailable" message.
  return { vendor: "lovable", modelId: LOVABLE_GEMINI_FLASH };
}
