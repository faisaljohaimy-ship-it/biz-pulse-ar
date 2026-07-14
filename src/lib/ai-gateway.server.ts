import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

function resolvePublicSiteUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VITE_PUBLIC_URL ||
    "https://neexios.com"
  );
}

// Canonical ARIA provider: Lovable AI Gateway is the permanent default for
// in-app AI so third-party billing/auth outages cannot take ARIA offline.
export const createLovableAiGatewayProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

export const LOVABLE_MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
  { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini" },
  { id: "openai/gpt-5", label: "GPT-5" },
] as const;

// Default to Gemini 3 Flash — gpt-5 upstream returns 400 with current tool/system payload size.
// Keep gpt-5 selectable, but not the default until upstream accepts the shape.
export const DEFAULT_LOVABLE_MODEL = "google/gemini-3-flash-preview";

export const createOpenRouterProvider = (apiKey: string, siteUrl = resolvePublicSiteUrl()) =>
  createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": siteUrl,
      "X-Title": "NEXUS AI OS — ARIA",
    },
  });

export const OPENROUTER_MODELS = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
] as const;

export const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash";

// Native Anthropic — via Anthropic's OpenAI-compatible endpoint, so it reuses
// the same createOpenAICompatible pipeline (no extra package). Key is passed as
// a Bearer token. This is the PRIMARY provider when ANTHROPIC_API_KEY is set.
export const createAnthropicProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

export const ANTHROPIC_MODELS = [
  { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
  { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
] as const;

export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-latest";

// Native Google Gemini — via Google's OpenAI-compatible endpoint, so it reuses
// the same createOpenAICompatible pipeline (no extra package). The key is a
// FREE Google AI Studio key (aistudio.google.com/apikey) with a generous free
// tier for Gemini Flash — so ARIA runs on Gemini Flash WITHOUT the credit-gated
// Lovable gateway. Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) to use.
export const createGoogleGeminiProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "google",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

export const GOOGLE_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
] as const;

export const DEFAULT_GOOGLE_MODEL = "gemini-2.5-flash";

// Native OpenAI — via OpenAI's own API, reusing the same createOpenAICompatible
// pipeline (OpenAI's /v1/chat/completions is the reference implementation). Set
// OPENAI_API_KEY to make ARIA answer directly on OpenAI. This is the PRIMARY
// provider when the key is present.
export const createOpenAiProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

export const OPENAI_MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o mini" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { id: "gpt-4.1", label: "GPT-4.1" },
] as const;

// Real, widely-available default. NOTE: "gpt-5.4-mini" is not a released OpenAI
// model id; override with the OPENAI_MODEL env var to use whatever the account
// has access to.
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

/** Resolve the configured OpenAI model id (env override → default). */
export function resolveOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}
