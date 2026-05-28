import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Kept for backwards compatibility (not used after OpenRouter migration).
export const createLovableAiGatewayProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

export const createOpenRouterProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://lovable.dev",
      "X-Title": "Nexus AI OS",
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
