/**
 * Server-only Gemini helpers for the 768-dim sec_knowledge compatibility index.
 */
import {
  EMBEDDING_DIMS,
  EMBEDDING_MODEL,
  embedText as embedSadeedText,
} from "./sadeed/embeddings.server";
import type { GeminiEmbeddingPurpose } from "./sadeed/gemini-embeddings.server";

export async function embedText(
  text: string,
  purpose: GeminiEmbeddingPurpose = "retrieval-query",
): Promise<number[]> {
  const vector = await embedSadeedText(text, { purpose });
  if (!vector) throw new Error("Gemini embedding unavailable");
  return vector;
}

export { EMBEDDING_MODEL, EMBEDDING_DIMS };
