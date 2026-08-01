/**
 * Ingest extracted text for one existing FINN document.
 *
 * There is deliberately no built-in policy/SOP corpus here: hard-coded or
 * Gemini-authored policy text is not an authoritative source. The caller must
 * first create an org-scoped document from an approved upload, then invoke
 * this hook with its extracted text. The hook is protected by the cron secret.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronHookSecret } from "@/lib/hook-auth.server";

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  });
}

function chunkText(input: string, target = 1_600, overlap = 200): string[] {
  const clean = input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let buffer = "";
  for (const paragraph of clean.split(/\n{2,}/)) {
    const part = paragraph.trim();
    if (!part) continue;
    if (buffer && `${buffer}\n\n${part}`.length > target) {
      chunks.push(buffer);
      const tail = buffer.slice(-overlap);
      buffer = `${tail}\n\n${part}`.slice(0, 2_000);
    } else {
      buffer = buffer ? `${buffer}\n\n${part}` : part.slice(0, 2_000);
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.slice(0, 400);
}

export const Route = createFileRoute("/api/public/hooks/finn-docs-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronHookSecret(request);
        if (denied) return denied;

        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!body || Object.keys(body).some((key) => !["document_id", "text"].includes(key))) {
          return json({ error: "invalid_body" }, 400);
        }
        const documentId = typeof body.document_id === "string" ? body.document_id.trim() : "";
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(documentId)) {
          return json({ error: "invalid_document_id" }, 400);
        }
        if (!text || text.length > 200_000) {
          return json({ error: "invalid_text", max_chars: 200_000 }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { EMBEDDING_DIMS, EMBEDDING_MODEL, embedText, toPgVector } =
          await import("@/lib/finn/embeddings.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- staged columns may lead generated types
        const db = supabaseAdmin as any;
        const { data: document, error: readError } = await db
          .from("finn_documents")
          .select("id,user_id,org_id,title")
          .eq("id", documentId)
          .maybeSingle();
        if (readError || !document?.org_id || !document?.user_id) {
          return json({ error: "document_not_found" }, 404);
        }

        const chunks = chunkText(text);
        if (!chunks.length) return json({ error: "no_extractable_text" }, 400);

        try {
          const rows = [];
          for (let index = 0; index < chunks.length; index += 1) {
            const content = chunks[index];
            const vector = await embedText(content, {
              purpose: "retrieval-document",
              title: String(document.title),
            });
            if (!vector) throw new Error(`embedding unavailable at chunk ${index}`);
            const arabicChars = (content.match(/[\u0600-\u06ff]/g) ?? []).length;
            const latinChars = (content.match(/[A-Za-z]/g) ?? []).length;
            rows.push({
              document_id: document.id,
              user_id: document.user_id,
              org_id: document.org_id,
              chunk_index: index,
              content,
              embedding: toPgVector(vector),
              model_version: `${EMBEDDING_MODEL}-${EMBEDDING_DIMS}-v1`,
              embedded_at: new Date().toISOString(),
              metadata: {
                lang: arabicChars > latinChars ? "ar" : latinChars > 0 ? "en" : "mixed",
                ar_chars: arabicChars,
                en_chars: latinChars,
                len: content.length,
              },
            });
          }

          for (let index = 0; index < rows.length; index += 50) {
            const { error } = await db
              .from("finn_document_chunks")
              .upsert(rows.slice(index, index + 50), {
                onConflict: "document_id,chunk_index",
              });
            if (error) throw new Error(error.message);
          }
          await db
            .from("finn_document_chunks")
            .delete()
            .eq("document_id", document.id)
            .eq("org_id", document.org_id)
            .gte("chunk_index", rows.length);

          const { error: updateError } = await db
            .from("finn_documents")
            .update({
              chunk_count: rows.length,
              summary: text.slice(0, 500).replace(/\s+/g, " "),
              status: "ready",
              error: null,
            })
            .eq("id", document.id)
            .eq("org_id", document.org_id);
          if (updateError) throw new Error(updateError.message);
          return json({ status: "ingested", document_id: document.id, chunks: rows.length });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await db
            .from("finn_documents")
            .update({ status: "failed", error: message.slice(0, 500) })
            .eq("id", document.id)
            .eq("org_id", document.org_id);
          return json({ error: "ingestion_failed" }, 502);
        }
      },
    },
  },
});
