// Gemini 768-dim compatibility helper for the legacy SADEED vector columns.
import {
  embedGeminiText,
  resolveGeminiApiKey,
  resolveGeminiEmbeddingModel,
  type GeminiEmbeddingPurpose,
} from "./gemini-embeddings.server";

export const EMBEDDING_DIMS = 768;
export const EMBEDDING_MODEL = resolveGeminiEmbeddingModel();

export async function embedText(
  input: string,
  options: { purpose?: GeminiEmbeddingPurpose; title?: string } = {},
): Promise<number[] | null> {
  if (!resolveGeminiApiKey()) return null;
  try {
    const result = await embedGeminiText(input, {
      dimensions: EMBEDDING_DIMS,
      purpose: options.purpose ?? "retrieval-query",
      title: options.title,
    });
    return result?.vector ?? null;
  } catch (e) {
    console.error("[sadeed/embed] Gemini embedding failed", e);
    return null;
  }
}

/** pgvector literal: '[v1,v2,...]' */
export function toPgVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
