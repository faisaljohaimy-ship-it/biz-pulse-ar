/**
 * rag-ingest — Edge Function (Deno). Idempotent document ingestion.
 *
 * Flow: validate body (org-ish keys → 400) → sha256 the full content →
 * find the document by its natural identity (org via RLS + code, or
 * source+title) → unchanged hash = no-op → otherwise chunk (clause-
 * preserving), embed each chunk (Gemini Embedding 2 at 1536 dimensions),
 * replace chunks, upsert the document row.
 *
 * ISOLATION: runs under the CALLER's JWT — the RLS admin-write policy
 * (is_org_member(org_id,'admin')) is the write gate, and org_id is filled by
 * the column DEFAULT current_org_id() from that same JWT. No org in payload,
 * no service_role anywhere. Arabic normalization is index-side (generated
 * columns) — raw text is stored untouched for citation display.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  chunkArabicText,
  EMBED_DIM,
  EMBED_MODEL,
  parseIngestRequest,
  validateEmbeddingVector,
} from "../_shared/rag-core.ts";

const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents`;
/** Keep each call bounded and preserve deterministic order. */
const EMBED_BATCH = 64;

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function embedChunks(chunks: readonly string[]): Promise<number[][]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const out: number[][] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const res = await fetch(EMBED_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        requests: batch.map((text) => ({
          model: `models/${EMBED_MODEL}`,
          content: {
            parts: [
              {
                text: `task: retrieve relevant industrial security evidence | document: ${text}`,
              },
            ],
          },
          output_dimensionality: EMBED_DIM,
        })),
      }),
    });
    if (!res.ok) throw new Error(`embed batch ${res.status}`);
    const data = await res.json();
    const embeddings: Array<{ values: number[] }> = data?.embeddings ?? [];
    if (embeddings.length !== batch.length) throw new Error("embed batch size mismatch");
    for (const e of embeddings) out.push(validateEmbeddingVector(e.values));
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return json({ error: "authentication_required", message_ar: "المصادقة مطلوبة." }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body", message_ar: "جسم JSON صالح مطلوب." }, 400);
  }
  const parsed = parseIngestRequest(body);
  if (!parsed.ok) return json({ error: parsed.code, message_ar: parsed.messageAr }, parsed.status);
  const doc = parsed.value;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: auth } } },
  );

  const contentSha = await sha256Hex(doc.content);

  // Natural identity within the caller's org (RLS scopes the lookup): by code
  // when present, else by (source, title) — mirrors the unique partial indexes.
  let finder = supabase
    .from("rag_documents")
    .select("id, content_sha256")
    .eq("doc_type", doc.doc_type)
    .limit(1);
  finder = doc.code
    ? finder.eq("code", doc.code)
    : finder.eq("source", doc.source).eq("title", doc.title);
  const { data: existing, error: findErr } = await finder;
  if (findErr) {
    console.error("[rag-ingest] lookup failed:", findErr);
    return json({ error: "lookup_failed", message_ar: "تعذّر فحص الوثيقة." }, 500);
  }

  const found = existing?.[0] ?? null;
  if (found && found.content_sha256 === contentSha) {
    // Idempotent no-op: same content hash — nothing re-embedded, nothing written.
    return json({ status: "unchanged", document_id: found.id, chunks: 0 });
  }

  const chunks = chunkArabicText(doc.content);
  if (chunks.length === 0) return json({ error: "invalid_field", message_ar: "محتوى فارغ." }, 400);

  let embeddings: number[][];
  try {
    embeddings = await embedChunks(chunks);
  } catch (err) {
    console.error("[rag-ingest] embedding failed:", err);
    return json({ error: "embedding_failed", message_ar: "تعذّر توليد التضمينات." }, 502);
  }

  // Upsert the document row (org_id via column DEFAULT from the JWT).
  let documentId: string;
  if (found) {
    const { error: updErr } = await supabase
      .from("rag_documents")
      .update({
        title: doc.title,
        source: doc.source,
        lang: doc.lang,
        content_sha256: contentSha,
        is_simulation: doc.is_simulation,
      })
      .eq("id", found.id);
    if (updErr) {
      console.error("[rag-ingest] document update failed:", updErr);
      return json({ error: "write_failed", message_ar: "تعذّر تحديث الوثيقة." }, 500);
    }
    documentId = found.id;
    const { error: delErr } = await supabase
      .from("rag_chunks")
      .delete()
      .eq("document_id", documentId);
    if (delErr) {
      console.error("[rag-ingest] stale chunk delete failed:", delErr);
      return json({ error: "write_failed", message_ar: "تعذّر استبدال المقاطع." }, 500);
    }
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("rag_documents")
      .insert({
        doc_type: doc.doc_type,
        code: doc.code,
        title: doc.title,
        source: doc.source,
        lang: doc.lang,
        content_sha256: contentSha,
        is_simulation: doc.is_simulation,
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      console.error("[rag-ingest] document insert failed:", insErr);
      return json({ error: "write_failed", message_ar: "تعذّر إنشاء الوثيقة." }, 500);
    }
    documentId = inserted.id;
  }

  const { error: chunkErr } = await supabase.from("rag_chunks").insert(
    chunks.map((content, i) => ({
      document_id: documentId,
      chunk_index: i,
      content,
      embedding: JSON.stringify(embeddings[i]),
      embedding_model: EMBED_MODEL,
      embedding_dim: EMBED_DIM,
      is_simulation: doc.is_simulation,
    })),
  );
  if (chunkErr) {
    console.error("[rag-ingest] chunk insert failed:", chunkErr);
    return json({ error: "write_failed", message_ar: "تعذّر كتابة المقاطع." }, 500);
  }

  return json({
    status: found ? "updated" : "created",
    document_id: documentId,
    chunks: chunks.length,
    content_sha256: contentSha,
  });
});
