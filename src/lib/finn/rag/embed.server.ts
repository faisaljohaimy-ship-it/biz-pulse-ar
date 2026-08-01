// FINN RAG — canonical Gemini 1536-dim embeddings client (WS-1 / WS-5).
// All compared corpus rows must be re-embedded when this model version changes.

import { createHash } from "node:crypto";
import {
  embedGeminiBatch,
  embedGeminiText,
  resolveGeminiEmbeddingModel,
  type GeminiEmbeddingPurpose,
} from "../gemini-embeddings.server";

export const RAG_EMBED_MODEL = resolveGeminiEmbeddingModel();
export const RAG_EMBED_DIMS = 1536;
export const RAG_MODEL_VERSION = `${RAG_EMBED_MODEL}-1536-v1`;

const MAX_INPUT_CHARS = 32_000;

export type EmbedResult = {
  vector: number[];
  model_version: string;
};

export type EmbedBatchResult = {
  vectors: (number[] | null)[]; // aligned with input array; null on per-item failure
  model_version: string;
  usage: { prompt_tokens: number };
};

function clip(text: string): string {
  return (text ?? "").trim().slice(0, MAX_INPUT_CHARS);
}

/** SHA-256 content hash for dedup — UNIQUE (org_id, content_hash). */
export function contentHash(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/** pgvector literal: '[v1,v2,...]' — same format the DB accepts for vector(N). */
export function toPgVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/** Single-text embed. Throws on gateway errors (caller decides retry/log). */
export async function embedOne(
  input: string,
  purpose: GeminiEmbeddingPurpose = "retrieval-query",
): Promise<EmbedResult | null> {
  const text = clip(input);
  if (!text) return null;
  const result = await embedGeminiText(text, {
    dimensions: RAG_EMBED_DIMS,
    purpose,
  });
  return result ? { vector: result.vector, model_version: RAG_MODEL_VERSION } : null;
}

/**
 * Batched embed through Gemini's batch endpoint. Preserves input order;
 * empty inputs map to null, while transport/schema failures reject the batch
 * so an operator never mistakes a partial reindex for a completed one.
 */
export async function embedBatch(
  inputs: string[],
  purpose: GeminiEmbeddingPurpose = "retrieval-document",
): Promise<EmbedBatchResult> {
  const result = await embedGeminiBatch(inputs.map(clip), {
    dimensions: RAG_EMBED_DIMS,
    purpose,
  });
  return {
    vectors: result.vectors,
    model_version: RAG_MODEL_VERSION,
    usage: { prompt_tokens: result.usageTokens },
  };
}
