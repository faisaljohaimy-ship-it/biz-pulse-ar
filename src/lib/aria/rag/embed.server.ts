// NEXIOS RAG — canonical 1536-dim embeddings client (WS-1 / WS-5).
// Server-only. Model locked to openai/text-embedding-3-small @ 1536 dims.
// Invariant I4: this is the ONLY embedding model allowed inside the RAG
// pipeline. Do not add Google text-embedding-004 or any other model here.

import { createHash } from "node:crypto";

export const RAG_EMBED_MODEL = "openai/text-embedding-3-small";
export const RAG_EMBED_DIMS = 1536;
export const RAG_MODEL_VERSION = "te3s-1536-v1";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/embeddings";
const MAX_INPUT_CHARS = 8000; // ~2k tokens, well under te3s 8192 cap
const MAX_BATCH = 96;         // stay under Gemini 100 cap for future portability

export type EmbedResult = {
  vector: number[];
  model_version: string;
};

export type EmbedBatchResult = {
  vectors: (number[] | null)[]; // aligned with input array; null on per-item failure
  model_version: string;
  usage: { prompt_tokens: number };
};

function requireKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("[rag/embed] LOVABLE_API_KEY missing");
  return key;
}

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
export async function embedOne(input: string): Promise<EmbedResult | null> {
  const text = clip(input);
  if (!text) return null;
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Lovable-API-Key": requireKey(),
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: RAG_EMBED_MODEL,
      input: text,
      dimensions: RAG_EMBED_DIMS,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[rag/embed] ${res.status} ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as { data?: { embedding: number[] }[] };
  const vec = json.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length !== RAG_EMBED_DIMS) return null;
  return { vector: vec, model_version: RAG_MODEL_VERSION };
}

/**
 * Batched embed — up to MAX_BATCH inputs per gateway call. Preserves input
 * order in the returned `vectors` array. Failed or empty inputs → null.
 * Retries once on 429/5xx with a 1.5s backoff; every other status is terminal.
 */
export async function embedBatch(inputs: string[]): Promise<EmbedBatchResult> {
  const out: (number[] | null)[] = new Array(inputs.length).fill(null);
  let totalTokens = 0;

  for (let i = 0; i < inputs.length; i += MAX_BATCH) {
    const slice = inputs.slice(i, i + MAX_BATCH);
    // Track which slice positions we actually sent (skip empties → null)
    const sendable: { pos: number; text: string }[] = [];
    slice.forEach((raw, k) => {
      const t = clip(raw);
      if (t) sendable.push({ pos: k, text: t });
    });
    if (!sendable.length) continue;

    const payload = {
      model: RAG_EMBED_MODEL,
      input: sendable.map((s) => s.text),
      dimensions: RAG_EMBED_DIMS,
    };

    let attempt = 0;
    let lastErr: unknown = null;
    while (attempt < 2) {
      try {
        const res = await fetch(GATEWAY, {
          method: "POST",
          headers: {
            "Lovable-API-Key": requireKey(),
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (res.status === 429 || res.status >= 500) {
          const body = await res.text().catch(() => "");
          throw new Error(`retryable ${res.status} ${body.slice(0, 200)}`);
        }
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw Object.assign(new Error(`[rag/embed] ${res.status} ${body.slice(0, 400)}`), {
            terminal: true,
          });
        }
        const json = (await res.json()) as {
          data?: { index: number; embedding: number[] }[];
          usage?: { prompt_tokens?: number };
        };
        totalTokens += json.usage?.prompt_tokens ?? 0;
        for (const row of json.data ?? []) {
          const dest = sendable[row.index];
          if (
            dest !== undefined &&
            Array.isArray(row.embedding) &&
            row.embedding.length === RAG_EMBED_DIMS
          ) {
            out[i + dest.pos] = row.embedding;
          }
        }
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if ((e as { terminal?: boolean }).terminal) break;
        attempt += 1;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
      }
    }
    if (lastErr) {
      console.error("[rag/embed] batch failed", lastErr);
      // leave those slots as null — caller can retry per-item next pass
    }
  }

  return {
    vectors: out,
    model_version: RAG_MODEL_VERSION,
    usage: { prompt_tokens: totalTokens },
  };
}
