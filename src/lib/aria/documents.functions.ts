// ARIA Document Intelligence — ingest uploaded files, chunk + embed, semantic search.
// Server-only. All operations are scoped to the authenticated user via RLS.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { embedText, toPgVector } from "./embeddings.server";

const BUCKET = "aria-documents";

// ----- helpers ----------------------------------------------------------------

function chunkText(input: string, target = 900, overlap = 120): string[] {
  const clean = input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  if (!clean) return [];
  // Split on paragraph boundaries first
  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > target && buf) {
      chunks.push(buf.trim());
      // Overlap: keep tail of previous chunk for context continuity
      buf = buf.slice(Math.max(0, buf.length - overlap)) + "\n\n" + p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  // Split overly long single chunks (e.g. tables) on sentence boundaries
  const out: string[] = [];
  for (const c of chunks) {
    if (c.length <= target * 1.5) {
      out.push(c);
      continue;
    }
    const sentences = c.split(/(?<=[.!?؟])\s+/);
    let sb = "";
    for (const s of sentences) {
      if ((sb + " " + s).length > target && sb) {
        out.push(sb.trim());
        sb = s;
      } else sb = sb ? `${sb} ${s}` : s;
    }
    if (sb.trim()) out.push(sb.trim());
  }
  return out.slice(0, 400); // safety cap
}

// ----- list / get -------------------------------------------------------------

export const listAriaDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("aria_documents")
      .select(
        "id,title,source,mime_type,status,page_count,chunk_count,summary,tags,size_bytes,created_at,error",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteAriaDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("aria_documents")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (doc?.storage_path) {
      await context.supabase.storage.from(BUCKET).remove([doc.storage_path]);
    }
    const { error } = await context.supabase.from("aria_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- ingest (text payload — server already parsed it) -----------------------
// The client uploads the raw file to storage, then sends extracted text here.
// Extraction lives in the client (using pdfjs/mammoth/xlsx) so server stays light.

const IngestInput = z.object({
  title: z.string().min(1).max(300),
  text: z.string().min(1).max(2_000_000),
  storage_path: z.string().optional(),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  page_count: z.number().int().nonnegative().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export const ingestAriaDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => IngestInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Create document row
    const { data: doc, error: insErr } = await supabase
      .from("aria_documents")
      .insert({
        user_id: userId,
        title: data.title,
        source: data.storage_path ? "upload" : "text",
        mime_type: data.mime_type ?? "text/plain",
        storage_path: data.storage_path ?? null,
        size_bytes: data.size_bytes ?? data.text.length,
        page_count: data.page_count ?? 0,
        status: "processing",
        tags: data.tags ?? [],
      })
      .select("id")
      .single();
    if (insErr || !doc) throw new Error(insErr?.message ?? "create failed");

    try {
      // 2. Chunk + embed
      const chunks = chunkText(data.text);
      if (chunks.length === 0) throw new Error("No extractable text");

      const rows: {
        document_id: string;
        user_id: string;
        chunk_index: number;
        content: string;
        embedding: string | null;
      }[] = [];
      // Sequential to stay friendly to gateway rate limits; can be parallelized in batches.
      for (let i = 0; i < chunks.length; i++) {
        const vec = await embedText(chunks[i]);
        rows.push({
          document_id: doc.id,
          user_id: userId,
          chunk_index: i,
          content: chunks[i],
          embedding: vec ? toPgVector(vec) : null,
        });
      }

      // 3. Insert chunks in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const slice = rows.slice(i, i + 50);
        const { error: chErr } = await supabase.from("aria_document_chunks").insert(slice);
        if (chErr) throw new Error(chErr.message);
      }

      // 4. Cheap summary = first 500 chars
      const summary = data.text.slice(0, 500).replace(/\s+/g, " ").trim();

      await supabase
        .from("aria_documents")
        .update({
          status: "ready",
          chunk_count: rows.length,
          summary,
        })
        .eq("id", doc.id);

      return { ok: true, document_id: doc.id, chunks: rows.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("aria_documents")
        .update({ status: "failed", error: msg })
        .eq("id", doc.id);
      throw e;
    }
  });

// ----- semantic search --------------------------------------------------------

const SearchInput = z.object({
  query: z.string().min(2).max(2000),
  limit: z.number().int().min(1).max(20).optional(),
});

export const searchAriaDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SearchInput.parse(i))
  .handler(async ({ data, context }) => {
    const vec = await embedText(data.query);
    if (!vec)
      return {
        matches: [] as Array<{
          chunk_id: string;
          document_id: string;
          title: string;
          content: string;
          similarity: number;
        }>,
      };
    const { data: rows, error } = await context.supabase.rpc("aria_match_documents", {
      _user_id: context.userId,
      _query: toPgVector(vec) as unknown as string,
      _limit: data.limit ?? 8,
    });
    if (error) throw new Error(error.message);
    return {
      matches: (rows ?? []) as Array<{
        chunk_id: string;
        document_id: string;
        title: string;
        content: string;
        similarity: number;
      }>,
    };
  });

// ----- signed URL for the source file ----------------------------------------

export const getAriaDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("aria_documents")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc?.storage_path) return { url: null };
    const { data: signed, error: sErr } = await context.supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60 * 10);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl };
  });
