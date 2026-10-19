import { createOpenAI } from "@ai-sdk/openai";

// Fixed, server-owned configuration: clients cannot select arbitrary models,
// destinations, output budgets or retries.
export const SADEED_OPENAI_MODEL = "gpt-4.1-mini";
export const SADEED_OPENAI_MAX_OUTPUT_TOKENS = 1200;
export const SADEED_OPENAI_DEADLINE_MS = 25_000;

export function openAiRequested(headers: Headers): boolean {
  return headers.get("X-SADEED-Provider") === "openai";
}

export function createSadeedOpenAiModel() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return createOpenAI({ apiKey }).responses(SADEED_OPENAI_MODEL);
}

/** Strip SDK response bodies/credentials before any server logging. */
export function safeOpenAiError(error: unknown): string {
  const status = error && typeof error === "object" && "statusCode" in error
    ? Number(error.statusCode) : undefined;
  if (status && Number.isFinite(status)) return `OpenAI request failed (${status})`;
  if (error instanceof Error && /abort|timeout/i.test(error.name)) return "OpenAI timeout";
  return "OpenAI request failed";
}