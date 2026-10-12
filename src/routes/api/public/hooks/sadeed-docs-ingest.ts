/**
 * Ingest extracted text for one existing SADEED document.
 *
 * There is deliberately no built-in policy/SOP corpus here: hard-coded or
 * Gemini-authored policy text is not an authoritative source. The caller must
 * first create an org-scoped document from an approved upload, then invoke
 * this hook with its extracted text. The hook is protected by the cron secret.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyCronHookSecret } from "@/lib/hook-auth.server";
import {
  EMBED_CONCURRENCY,
  KNOWLEDGE_MAX_TEXT_CHARS,
  chunkText,
  knowledgeRevisionHash,
  knowledgeTooLargeMessage,
  mapWithConcurrency,
} from "@/lib/sadeed/knowledge-ingest-core";

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/public/hooks/sadeed-docs-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = verifyCronHookSecret(request);
        if (denied) return denied;

        const raw = (await request.json().catch(() => null)) as unknown;
        const body =
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : null;
        if (!body) return json({ error: "invalid_body" }, 400);
        const documentId = typeof body.document_id === "string" ? body.document_id.trim() : "";
        if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(documentId)) {
          return json({ error: "invalid_document_id" }, 400);
        }
        // From here the document id is well-formed: every rejection below is
        // recorded on the row as "failed" (once the row is found) instead of
        // leaving it "pending" with no reason.
        const text = typeof body.text === "string" ? body.text.trim() : "";
        const rejection = Object.keys(body).some((key) => !["document_id", "text"].includes(key))
          ? {
              code: "invalid_body",
              message: "طلب الاستيعاب يحمل حقولًا غير متوقعة فرُفض.",
              extra: {},
            }
          : !text
            ? {
                code: "invalid_text",
                message: "لا يوجد في المستند نص قابل للاستيعاب.",
                extra: { max_chars: KNOWLEDGE_MAX_TEXT_CHARS },
              }
            : text.length > KNOWLEDGE_MAX_TEXT_CHARS
              ? {
                  code: "invalid_text",
                  message: knowledgeTooLargeMessage(text.length),
                  extra: { max_chars: KNOWLEDGE_MAX_TEXT_CHARS },
                }
              : null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { EMBEDDING_DIMS, EMBEDDING_MODEL, embedText, toPgVector } =
          await import("@/lib/sadeed/embeddings.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- staged columns may lead generated types
        const db = supabaseAdmin as any;
        const { data: document, error: readError } = await db
          .from("finn_documents")
          .select("id,user_id,org_id,title,is_official")
          .eq("id", documentId)
          .maybeSingle();
        if (readError || !document?.org_id || !document?.user_id) {
          return json({ error: "document_not_found" }, 404);
        }

        const rejectDocument = async (
          code: string,
          message: string,
          extra: Record<string, unknown> = {},
        ): Promise<Response> => {
          await db
            .from("finn_documents")
            .update({ status: "failed", error: `${message} (${code})`.slice(0, 500) })
            .eq("id", document.id)
            .eq("org_id", document.org_id);
          return json({ error: code, ...extra }, 400);
        };

        if (rejection) return rejectDocument(rejection.code, rejection.message, rejection.extra);

        const chunks = chunkText(text);
        if (!chunks.length) {
          return rejectDocument(
            "no_extractable_text",
            "لم يُستخرج من المستند نص قابل للتقسيم والاستيعاب.",
          );
        }

        try {
          // Truthful status: the row says "processing" from the moment work
          // starts, not "pending" until it is already finished.
          const { error: processingError } = await db
            .from("finn_documents")
            .update({
              status: "processing",
              error: null,
              // بصمة المتن الرسمي أثرُ إسنادٍ (المادة ٢٥) لا تُكتب من هنا؛
              // تُكتب لمرفوعات المستخدم وحدها لتُكشف بها المكرّرات.
              ...(document.is_official ? {} : { revision_hash: await knowledgeRevisionHash(text) }),
            })
            .eq("id", document.id)
            .eq("org_id", document.org_id);
          if (processingError) throw new Error(processingError.message);

          const embeddedAt = new Date().toISOString();
          // Bounded fan-out; results keep chunk_index order, and any failed
          // chunk rejects the whole batch — never a partial "ready".
          const rows = await mapWithConcurrency(
            chunks,
            EMBED_CONCURRENCY,
            async (content, index) => {
              const vector = await embedText(content, {
                purpose: "retrieval-document",
                title: String(document.title),
              });
              if (!vector) throw new Error(`embedding unavailable at chunk ${index}`);
              const arabicChars = (content.match(/[\u0600-\u06ff]/g) ?? []).length;
              const latinChars = (content.match(/[A-Za-z]/g) ?? []).length;
              return {
                document_id: document.id,
                user_id: document.user_id,
                org_id: document.org_id,
                chunk_index: index,
                content,
                embedding: toPgVector(vector),
                model_version: `${EMBEDDING_MODEL}-${EMBEDDING_DIMS}-v1`,
                embedded_at: embeddedAt,
                metadata: {
                  lang: arabicChars > latinChars ? "ar" : latinChars > 0 ? "en" : "mixed",
                  ar_chars: arabicChars,
                  en_chars: latinChars,
                  len: content.length,
                },
              };
            },
          );

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
