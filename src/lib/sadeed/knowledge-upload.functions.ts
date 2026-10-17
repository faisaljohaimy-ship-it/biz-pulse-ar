// Knowledge Upload center — creates an finn_documents row, then invokes the
// public /api/public/hooks/sadeed-docs-ingest endpoint with the extracted text.
// Forensic chain: row (user RLS) → public hook (CRON_HOOK_SECRET, service role
// chunk/embed) → polling stats fn for citation-readiness.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  KNOWLEDGE_MAX_TEXT_CHARS,
  knowledgeRevisionHash,
  pickDuplicateDocument,
} from "@/lib/sadeed/knowledge-ingest-core";
import { resolveSelfCallOrigin } from "@/lib/sadeed/self-call-origin.server";

const BUCKET = "aria-documents";

const EnqueueInput = z.object({
  title: z.string().trim().min(1).max(300),
  text: z.string().min(1).max(KNOWLEDGE_MAX_TEXT_CHARS),
  storage_path: z.string().max(500).optional(),
  mime_type: z.string().max(200).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  page_count: z.number().int().nonnegative().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export const enqueueKnowledgeIngest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => EnqueueInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const revisionHash = await knowledgeRevisionHash(data.text);

    // 1. Create the document row under the user's RLS scope (status=pending).
    //    Inserted *before* the duplicate check so the check can be scoped by
    //    this row's own org_id (assigned by the database), never by a guess.
    const { data: doc, error: insErr } = await supabase
      .from("finn_documents")
      .insert({
        user_id: userId,
        title: data.title,
        source: data.storage_path ? "upload" : "text",
        mime_type: data.mime_type ?? "text/plain",
        storage_path: data.storage_path ?? null,
        size_bytes: data.size_bytes ?? data.text.length,
        page_count: data.page_count ?? 0,
        status: "pending",
        revision_hash: revisionHash,
        tags: data.tags ?? [],
      })
      .select("id, org_id, created_at")
      .single();
    if (insErr || !doc) throw new Error(insErr?.message ?? "create_failed");

    // 2. De-duplicate: the same user re-uploading the same normalized text in
    //    the same org gets the existing ready (or still in-progress) document
    //    back instead of a second row and a second paid embedding run. Scoped
    //    by user_id AND org_id, so another org's document is never returned.
    //    Earliest wins (see pickDuplicateDocument), so two simultaneous
    //    identical uploads cannot both drop their rows. Known limitation: this
    //    is not atomic — two uploads whose inserts are not yet visible to each
    //    other can both proceed; closing that needs a unique index migration.
    const { data: existing, error: dupErr } = await supabase
      .from("finn_documents")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .eq("org_id", doc.org_id)
      .eq("revision_hash", revisionHash)
      .in("status", ["ready", "processing", "pending"])
      .neq("id", doc.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (dupErr) {
      await supabase
        .from("finn_documents")
        .update({
          status: "failed",
          error: `duplicate_check_failed: ${dupErr.message}`.slice(0, 500),
        })
        .eq("id", doc.id);
      throw new Error(dupErr.message);
    }
    const duplicate = pickDuplicateDocument(existing ?? [], Date.now(), doc);
    if (duplicate) {
      // Drop the row this call just created; if that is refused, leave it
      // terminal ("failed") with a clear reason rather than "pending".
      // RLS may refuse a delete silently (no error, zero rows), so the
      // returned row count — not the absence of an error — proves it.
      const { data: dropped, error: dropErr } = await supabase
        .from("finn_documents")
        .delete()
        .eq("id", doc.id)
        .select("id");
      if (dropErr || !dropped?.length) {
        await supabase
          .from("finn_documents")
          .update({
            status: "failed",
            error: `نسخة مكررة من مستند قائم بالنص نفسه (duplicate_of: ${duplicate.id})`,
          })
          .eq("id", doc.id);
      }
      return {
        document_id: duplicate.id,
        deduped: true as const,
        status: duplicate.status,
        hook_status: 0,
        hook_body: null as string | null,
      };
    }

    // 3. Invoke the public ingest hook with the CRON_HOOK_SECRET.
    const secret = process.env.CRON_HOOK_SECRET;
    if (!secret) throw new Error("cron_hook_secret_not_configured");

    // الأصل من البيئة حين تُضبط (PUBLIC_SITE_URL / SITE_URL) لا من الطلب وحده —
    // فالسرّ لا يُرسَل إلى مضيفٍ انحرف على الحافّة (SEC-1C-06).
    const req = getRequest();
    const hookUrl = `${resolveSelfCallOrigin(req.url)}/api/public/hooks/sadeed-docs-ingest`;

    let hookStatus = 0;
    let hookBody: string | null = null;
    try {
      const res = await fetch(hookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": secret,
        },
        body: JSON.stringify({ document_id: doc.id, text: data.text }),
      });
      hookStatus = res.status;
      hookBody = (await res.text().catch(() => "")) || null;
      if (!res.ok) {
        // The hook marks the row "failed" itself, with a clear reason, on
        // every path where it has the document; keep that reason and only
        // fill in the paths where it could not (auth, unknown document).
        await supabase
          .from("finn_documents")
          .update({
            status: "failed",
            error: `hook_${res.status}: ${hookBody ?? ""}`.slice(0, 500),
          })
          .eq("id", doc.id)
          .neq("status", "failed");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("finn_documents")
        .update({ status: "failed", error: `hook_invoke_failed: ${msg}`.slice(0, 500) })
        .eq("id", doc.id);
      throw new Error(`hook_invoke_failed: ${msg}`);
    }

    return {
      document_id: doc.id,
      deduped: false as const,
      status: hookStatus >= 200 && hookStatus < 300 ? "ready" : "failed",
      hook_status: hookStatus,
      hook_body: hookBody,
    };
  });

// Bilingual chunk stats for the progress UI.
export const getKnowledgeChunkStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ document_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("finn_document_chunks")
      .select("id, embedding, metadata")
      .eq("document_id", data.document_id)
      .limit(1000);
    if (error) throw new Error(error.message);
    const chunks = rows ?? [];
    let ar = 0,
      en = 0,
      mixed = 0,
      embedded = 0;
    for (const c of chunks) {
      const meta = (c.metadata ?? {}) as { lang?: string };
      if (meta.lang === "ar") ar++;
      else if (meta.lang === "en") en++;
      else mixed++;
      if (c.embedding) embedded++;
    }
    return {
      total: chunks.length,
      embedded,
      ar,
      en,
      mixed,
      citation_ready: chunks.length > 0 && embedded === chunks.length,
    };
  });

// Signed URL for downloading the original file from the bucket.
export const getKnowledgeFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ storage_path: z.string().min(1).max(500) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.storage_path, 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
