// NEXIOS RAG — WS-1 backfill server function.
// Admin-only. Populates embedding_v2 (vector 1536) on aria_knowledge,
// aria_document_chunks, aria_memory in batches without touching the legacy
// embedding column. Idempotent: only rows WHERE embedding_v2 IS NULL are
// picked up, so a repeated call safely resumes.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { embedBatch, toPgVector, RAG_MODEL_VERSION } from "./embed.server";

type TargetTable = "aria_knowledge" | "aria_document_chunks" | "aria_memory";

const TEXT_COLUMN: Record<TargetTable, string> = {
  aria_knowledge: "content",
  aria_document_chunks: "content",
  aria_memory: "content",
};

const InputSchema = z.object({
  table: z.enum(["aria_knowledge", "aria_document_chunks", "aria_memory"]),
  batchSize: z.number().int().min(1).max(96).default(48),
});

export const ragBackfillEmbeddingsV2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    // Authorize: only tenant admin/owner may run backfills.
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) {
      throw new Response("Forbidden — admin role required", { status: 403 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = data.table as TargetTable;
    const textCol = TEXT_COLUMN[table];

    // Pull one batch of unmigrated rows for this tenant scope.
    // Dynamic column select — cast rows to a plain shape since generated
    // types don't know embedding_v2 yet (regenerated after migration approval).
    const { data: rowsRaw, error } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            is: (
              col: string,
              v: null,
            ) => {
              limit: (n: number) => Promise<{
                data: Array<Record<string, unknown>> | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      }
    )
      .from(table)
      .select(`id, ${textCol}`)
      .is("embedding_v2", null)
      .limit(data.batchSize);

    if (error) {
      throw new Response(`[rag/backfill] read failed: ${error.message}`, { status: 500 });
    }
    const rows = rowsRaw ?? [];
    if (rows.length === 0) {
      return { table, processed: 0, remaining: 0, done: true, model_version: RAG_MODEL_VERSION };
    }

    // Embed the batch.
    const inputs = rows.map((r) => String(r[textCol] ?? ""));
    const { vectors, usage } = await embedBatch(inputs);

    // Write vectors row-by-row (Supabase JS lacks a pgvector-typed bulk upsert).
    let written = 0;
    let failed = 0;
    const now = new Date().toISOString();
    for (let i = 0; i < rows.length; i += 1) {
      const vec = vectors[i];
      if (!vec) {
        failed += 1;
        continue;
      }
      const { error: upErr } = await (
        supabaseAdmin as unknown as {
          from: (t: string) => {
            update: (v: Record<string, unknown>) => {
              eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
            };
          };
        }
      )
        .from(table)
        .update({
          embedding_v2: toPgVector(vec),
          model_version: RAG_MODEL_VERSION,
          embedded_at: now,
        })
        .eq("id", String(rows[i].id));
      if (upErr) {
        failed += 1;
        console.error(`[rag/backfill] update ${table} failed`, upErr);
      } else {
        written += 1;
      }
    }

    // Count how many rows still need backfilling.
    const { count: remaining } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (
            cols: string,
            opts: { count: "exact"; head: true },
          ) => {
            is: (col: string, v: null) => Promise<{ count: number | null }>;
          };
        };
      }
    )
      .from(table)
      .select("id", { count: "exact", head: true })
      .is("embedding_v2", null);

    return {
      table,
      processed: rows.length,
      written,
      failed,
      remaining: remaining ?? 0,
      done: (remaining ?? 0) === 0,
      tokens_used: usage.prompt_tokens,
      model_version: RAG_MODEL_VERSION,
    };
  });
