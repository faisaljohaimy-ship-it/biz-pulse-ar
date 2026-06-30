// Knowledge Upload center — creates an aria_documents row, then invokes the
// public /api/public/hooks/aria-docs-ingest endpoint with the extracted text.
// Forensic chain: row (user RLS) → public hook (CRON_HOOK_SECRET, service role
// chunk/embed) → polling stats fn for citation-readiness.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const BUCKET = "aria-documents";

const EnqueueInput = z.object({
  title: z.string().trim().min(1).max(300),
  text: z.string().min(1).max(2_000_000),
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

    // 1. Create the document row under the user's RLS scope (status=pending).
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
        status: "pending",
        tags: data.tags ?? [],
      })
      .select("id")
      .single();
    if (insErr || !doc) throw new Error(insErr?.message ?? "create_failed");

    // 2. Invoke the public ingest hook with the CRON_HOOK_SECRET.
    const secret = process.env.CRON_HOOK_SECRET;
    if (!secret) throw new Error("cron_hook_secret_not_configured");

    const req = getRequest();
    const base = new URL(req.url);
    const hookUrl = `${base.origin}/api/public/hooks/aria-docs-ingest`;

    let hookStatus = 0;
    let hookBody: Record<string, unknown> | null = null;
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
      hookBody = await res.json().catch(() => null);
      if (!res.ok) {
        await supabase
          .from("aria_documents")
          .update({
            status: "failed",
            error: `hook_${res.status}: ${typeof hookBody === "object" ? JSON.stringify(hookBody) : String(hookBody)}`.slice(0, 500),
          })
          .eq("id", doc.id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("aria_documents")
        .update({ status: "failed", error: `hook_invoke_failed: ${msg}`.slice(0, 500) })
        .eq("id", doc.id);
      throw new Error(`hook_invoke_failed: ${msg}`);
    }

    return { document_id: doc.id, hook_status: hookStatus, hook_body: hookBody };
  });

// Bilingual chunk stats for the progress UI.
export const getKnowledgeChunkStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ document_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("aria_document_chunks")
      .select("id, embedding, metadata")
      .eq("document_id", data.document_id)
      .limit(1000);
    if (error) throw new Error(error.message);
    const chunks = rows ?? [];
    let ar = 0, en = 0, mixed = 0, embedded = 0;
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
  .inputValidator((i: unknown) =>
    z.object({ storage_path: z.string().min(1).max(500) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase
      .storage.from(BUCKET).createSignedUrl(data.storage_path, 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
