/**
 * Canonical Gemini embeddings client for SADEED. Server-only.
 *
 * Gemini Embedding 2 uses a different vector space from every previous model;
 * callers must re-embed the whole compared corpus before enabling retrieval.
 */
import { httpJson } from "@/lib/api/http.server";

export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-2";
export const GEMINI_EMBEDDING_MIN_DIMS = 128;
export const GEMINI_EMBEDDING_MAX_DIMS = 3072;

export type GeminiEmbeddingPurpose =
  "retrieval-query" | "retrieval-document" | "semantic-similarity";

export type GeminiEmbeddingOptions = {
  dimensions: number;
  purpose: GeminiEmbeddingPurpose;
  title?: string;
};

type GeminiEmbeddingResponse = {
  embedding?: { values?: number[] };
  usageMetadata?: { promptTokenCount?: number; totalTokenCount?: number };
};

type GeminiBatchEmbeddingResponse = {
  embeddings?: Array<{ values?: number[] }>;
  usageMetadata?: { promptTokenCount?: number; totalTokenCount?: number };
};

export function resolveGeminiEmbeddingModel(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env.GEMINI_EMBEDDING_MODEL?.trim() ?? "";
  return /^gemini-embedding-[a-z0-9][a-z0-9._-]{0,48}$/i.test(configured)
    ? configured
    : GEMINI_EMBEDDING_MODEL;
}

export function resolveGeminiApiKey(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return env.GEMINI_API_KEY?.trim() || env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || null;
}

function validateDimensions(dimensions: number): void {
  if (
    !Number.isInteger(dimensions) ||
    dimensions < GEMINI_EMBEDDING_MIN_DIMS ||
    dimensions > GEMINI_EMBEDDING_MAX_DIMS
  ) {
    throw new Error(`Invalid Gemini embedding dimensions: ${dimensions}`);
  }
}

/** Gemini Embedding 2 takes the task as text, not through task_type. */
export function prepareGeminiEmbeddingText(
  input: string,
  purpose: GeminiEmbeddingPurpose,
  title?: string,
): string {
  const text = input.trim().slice(0, 32_000);
  if (!text) return "";
  if (purpose === "semantic-similarity") {
    return `task: industrial security semantic similarity | text: ${text}`;
  }
  const task = "task: retrieve relevant industrial security evidence";
  if (purpose === "retrieval-query") return `${task} | query: ${text}`;
  const safeTitle = title?.trim().slice(0, 300);
  return `${task} | document${safeTitle ? ` title: ${safeTitle}` : ""}: ${text}`;
}

function endpoint(model: string, method: "embedContent" | "batchEmbedContents"): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`;
}

function requestHeaders(key: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": key,
    "x-goog-api-client": "sadeed-platform/1.0",
  };
}

export async function embedGeminiText(
  input: string,
  options: GeminiEmbeddingOptions,
): Promise<{ vector: number[]; usageTokens: number; model: string } | null> {
  validateDimensions(options.dimensions);
  const key = resolveGeminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY missing");
  const prepared = prepareGeminiEmbeddingText(input, options.purpose, options.title);
  if (!prepared) return null;
  const model = resolveGeminiEmbeddingModel();
  const json = await httpJson<GeminiEmbeddingResponse>(endpoint(model, "embedContent"), {
    method: "POST",
    headers: requestHeaders(key),
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text: prepared }] },
      output_dimensionality: options.dimensions,
    }),
    label: "sadeed/gemini-embedding",
    retries: 2,
    timeoutMs: 15_000,
  });
  const vector = json.embedding?.values;
  if (!Array.isArray(vector) || vector.length !== options.dimensions) {
    throw new Error(`Unexpected Gemini embedding length: ${vector?.length ?? 0}`);
  }
  return {
    vector,
    usageTokens: json.usageMetadata?.totalTokenCount ?? json.usageMetadata?.promptTokenCount ?? 0,
    model,
  };
}

export async function embedGeminiBatch(
  inputs: readonly string[],
  options: GeminiEmbeddingOptions,
): Promise<{ vectors: Array<number[] | null>; usageTokens: number; model: string }> {
  validateDimensions(options.dimensions);
  const key = resolveGeminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY missing");
  const model = resolveGeminiEmbeddingModel();
  const output: Array<number[] | null> = new Array(inputs.length).fill(null);
  const sendable = inputs.flatMap((input, index) => {
    const prepared = prepareGeminiEmbeddingText(input, options.purpose, options.title);
    return prepared ? [{ index, prepared }] : [];
  });
  if (!sendable.length) return { vectors: output, usageTokens: 0, model };

  let usageTokens = 0;
  for (let offset = 0; offset < sendable.length; offset += 100) {
    const batch = sendable.slice(offset, offset + 100);
    const json = await httpJson<GeminiBatchEmbeddingResponse>(
      endpoint(model, "batchEmbedContents"),
      {
        method: "POST",
        headers: requestHeaders(key),
        body: JSON.stringify({
          requests: batch.map(({ prepared }) => ({
            model: `models/${model}`,
            content: { parts: [{ text: prepared }] },
            output_dimensionality: options.dimensions,
          })),
        }),
        label: "sadeed/gemini-embedding-batch",
        retries: 2,
        timeoutMs: 30_000,
      },
    );
    usageTokens += json.usageMetadata?.totalTokenCount ?? json.usageMetadata?.promptTokenCount ?? 0;
    const embeddings = json.embeddings ?? [];
    batch.forEach(({ index }, position) => {
      const vector = embeddings[position]?.values;
      if (Array.isArray(vector) && vector.length === options.dimensions) output[index] = vector;
    });
  }
  return { vectors: output, usageTokens, model };
}
