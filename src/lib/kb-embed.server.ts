/**
 * Server-only helpers for embedding text via Lovable AI Gateway.
 * Uses openai/text-embedding-3-small (1536 dims) to match the
 * sec_knowledge_articles HNSW index limit (max 2000 dims).
 */

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/embeddings";
const MODEL = "openai/text-embedding-3-small";
const DIMS = 1536;

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const cleaned = text.trim().slice(0, 30_000);
  if (!cleaned) throw new Error("Empty embedding input");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input: cleaned }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Embedding failed ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  const vec = json.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length !== DIMS) {
    throw new Error(`Unexpected embedding length: ${vec?.length}`);
  }
  return vec;
}

export const EMBEDDING_MODEL = MODEL;
export const EMBEDDING_DIMS = DIMS;
