/**
 * ARIA Regulation RAG — Article 25.
 *
 * Retrieves the top-k most relevant chunks from `aria_document_chunks`
 * via existing `aria_match_documents` RPC and enriches with
 * `aria_documents` metadata (title, is_official, source_kind).
 *
 * Embedding: OpenAI `text-embedding-3-small` @ 768 dims (matches column).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAriaAction } from "./audit-log.server";

const InputSchema = z.object({
  query: z.string().min(3).max(2000),
  top_k: z.number().int().min(1).max(12).default(6),
  official_only: z.boolean().default(false),
});

export interface RegulationCitation {
  document_id: string;
  document_title: string;
  chunk_index: number;
  content: string;
  similarity: number;
  is_official: boolean;
  source_kind: string;
  tags: string[];
}

async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing on server");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
      dimensions: 768,
    }),
  });
  if (!res.ok) throw new Error(`Embedding failed ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data[0].embedding;
}

export const retrieveRegulationContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => InputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const started = Date.now();
    const { supabase, userId } = context;

    let embedding: number[];
    try {
      embedding = await embedQuery(data.query);
    } catch (err) {
      await logAriaAction({
        action: "aria.rag.embed.failed",
        userId,
        surface: "rag",
        articleRefs: ["Article 25"],
        status: "error",
        output: { error: (err as Error).message },
        latencyMs: Date.now() - started,
      });
      throw err;
    }

    const embeddingLiteral = `[${embedding.join(",")}]` as unknown as string;

    // Fetch more than requested so official_only filter still has candidates.
    const overFetch = data.official_only ? data.top_k * 3 : data.top_k;

    const { data: rows, error } = await supabase.rpc("aria_match_documents", {
      _user_id: userId,
      _query: embeddingLiteral as never,
      _limit: overFetch,
    });

    if (error) {
      await logAriaAction({
        action: "aria.rag.query.failed",
        userId,
        surface: "rag",
        articleRefs: ["Article 25"],
        status: "error",
        output: { error: error.message },
        latencyMs: Date.now() - started,
      });
      throw new Error(error.message);
    }

    const raw = (rows ?? []) as Array<{
      chunk_id: string;
      document_id: string;
      content: string;
      similarity: number;
      title: string;
    }>;

    const docIds = Array.from(new Set(raw.map((r) => r.document_id)));
    const meta: Record<string, { is_official: boolean; source_kind: string; title: string }> = {};
    if (docIds.length > 0) {
      const { data: docs } = await supabase
        .from("aria_documents")
        .select("id, title, is_official, source_kind")
        .in("id", docIds);
      for (const d of docs ?? []) {
        meta[d.id] = {
          is_official: d.is_official,
          source_kind: d.source_kind,
          title: d.title,
        };
      }
    }

    let citations: RegulationCitation[] = raw.map((r) => ({
      document_id: r.document_id,
      document_title: meta[r.document_id]?.title ?? r.title,
      chunk_index: 0,
      content: r.content,
      similarity: r.similarity,
      is_official: meta[r.document_id]?.is_official ?? false,
      source_kind: meta[r.document_id]?.source_kind ?? "upload",
      tags: [],
    }));

    if (data.official_only) citations = citations.filter((c) => c.is_official);
    citations = citations.slice(0, data.top_k);

    await logAriaAction({
      action: "aria.rag.query.ok",
      userId,
      surface: "rag",
      articleRefs: ["Article 25"],
      status: "ok",
      output: { hits: citations.length, official_only: data.official_only },
      latencyMs: Date.now() - started,
    });

    return { citations, query: data.query };
  });
