/**
 * ARIA Regulation RAG — Article 25.
 *
 * Retrieves the top-k most relevant chunks from `aria_document_chunks`
 * for a natural-language query, prioritizing official regulations
 * (`is_official = true`). Returns citations with document title and
 * chunk index so ARIA can surface them in answers.
 *
 * Embedding: OpenAI `text-embedding-3-small` with `dimensions: 768` to
 * match the existing `vector(768)` column shape.
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
  .inputValidator((raw) => InputSchema.parse(raw))
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
        input: { query_len: data.query.length },
        output: { error: (err as Error).message },
        latencyMs: Date.now() - started,
      });
      throw err;
    }

    const embeddingLiteral = `[${embedding.join(",")}]`;

    let query = supabase
      .from("aria_document_chunks")
      .select(
        "id, document_id, chunk_index, content, metadata, aria_documents!inner(title, is_official, source_kind)",
      )
      .order("embedding <=> " + embeddingLiteral as never, { ascending: true } as never)
      .limit(data.top_k);

    if (data.official_only) {
      query = query.eq("aria_documents.is_official", true);
    }

    const { data: rows, error } = await query;
    if (error) {
      // Fallback: PostgREST may not accept operator ordering; use RPC instead.
      const { data: rpcRows, error: rpcErr } = await supabase.rpc("match_regulation_chunks", {
        query_embedding: embeddingLiteral,
        match_count: data.top_k,
        official_only: data.official_only,
      });
      if (rpcErr) {
        await logAriaAction({
          action: "aria.rag.query.failed",
          userId,
          surface: "rag",
          articleRefs: ["Article 25"],
          status: "error",
          output: { error: rpcErr.message },
          latencyMs: Date.now() - started,
        });
        throw new Error(rpcErr.message);
      }
      const citations = (rpcRows ?? []) as RegulationCitation[];
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
    }

    const citations: RegulationCitation[] = (rows ?? []).map((r: {
      document_id: string;
      chunk_index: number;
      content: string;
      aria_documents: { title: string; is_official: boolean; source_kind: string } | null;
    }) => ({
      document_id: r.document_id,
      document_title: r.aria_documents?.title ?? "(untitled)",
      chunk_index: r.chunk_index,
      content: r.content,
      similarity: 0,
      is_official: r.aria_documents?.is_official ?? false,
      source_kind: r.aria_documents?.source_kind ?? "upload",
    }));

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
