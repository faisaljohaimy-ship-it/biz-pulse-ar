/**
 * ARIA Brain — SERVER-side AI Router.
 *
 * Called ONLY from `src/routes/api/chat.ts`. Never exposes model names to
 * the client.
 *
 * Production routing prefers native Gemini Flash when a Google key is
 * configured, with other providers retained only when the deployment opts
 * out of the Gemini-only policy.
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

const OPENAI_DEFAULT = "gpt-5.6";
const GOOGLE_GEMINI_FLASH = "gemini-3.5-flash";
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
  // ARIA's canonical route is native Gemini Flash. ARIA_FORCE_GEMINI_FLASH
  // is enforced by the API caller by excluding all non-Google providers.

  if (providers.google) {
    return {
      vendor: "google",
      modelId: process.env.GEMINI_MODEL?.trim() || GOOGLE_GEMINI_FLASH,
      fallback: providers.openai
        ? {
            vendor: "openai",
            modelId: process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT,
          }
        : providers.lovable
          ? { vendor: "lovable", modelId: LOVABLE_GEMINI_FLASH }
          : providers.anthropic
            ? { vendor: "anthropic", modelId: ANTHROPIC_SONNET }
            : providers.openrouter
              ? { vendor: "openrouter", modelId: OPENROUTER_CLAUDE }
              : undefined,
    };
  }

  if (providers.openai) {
    return {
      vendor: "openai",
      modelId: process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT,
      fallback: providers.lovable
        ? { vendor: "lovable", modelId: LOVABLE_GEMINI_FLASH }
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
