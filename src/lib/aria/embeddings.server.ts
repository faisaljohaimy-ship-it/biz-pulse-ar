// Lovable AI Gateway embeddings helper. Server-only.
// Uses openai/text-embedding-3-small with dimensions:768 to match the
// project's existing vector(768) columns (aria_knowledge, aria_memory, aria_documents).
// NOTE: google/gemini-embedding-* rejects the `dimensions` field, so we use OpenAI here.

import { httpJson } from "@/lib/api/http.server";
import { isApiError } from "@/lib/api";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/embeddings";
const MODEL = "openai/text-embedding-3-small";

export async function embedText(input: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const trimmed = input.trim().slice(0, 8000);
  if (!trimmed) return null;
  try {
    const json = await httpJson<{ data?: { embedding: number[] }[] }>(GATEWAY, {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, input: trimmed, dimensions: 768 }),
      label: "aria/embed",
      retries: 1,
      timeoutMs: 12_000,
    });
    const vec = json.data?.[0]?.embedding;
    return Array.isArray(vec) && vec.length === 768 ? vec : null;
  } catch (e) {
    if (isApiError(e)) {
      console.error("[aria/embed]", e.code, e.message, e.details);
    } else {
      console.error("[aria/embed] fetch failed", e);
    }
    return null;
  }
}

/** pgvector literal: '[v1,v2,...]' */
export function toPgVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
