// Lovable AI Gateway embeddings helper. Server-only.
// Uses google/gemini-embedding-001 (768 dims) — must match aria_memory.embedding vector(768).

const GATEWAY = "https://ai.gateway.lovable.dev/v1/embeddings";
const MODEL = "google/gemini-embedding-001";

export async function embedText(input: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const trimmed = input.trim().slice(0, 8000);
  if (!trimmed) return null;
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, input: trimmed, dimensions: 768 }),
    });
    if (!res.ok) {
      console.error("[aria/embed] gateway error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = (await res.json()) as { data?: { embedding: number[] }[] };
    const vec = json.data?.[0]?.embedding;
    return Array.isArray(vec) && vec.length === 768 ? vec : null;
  } catch (e) {
    console.error("[aria/embed] fetch failed", e);
    return null;
  }
}

/** pgvector literal: '[v1,v2,...]' */
export function toPgVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
