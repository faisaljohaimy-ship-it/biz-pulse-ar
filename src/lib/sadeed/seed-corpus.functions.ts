// SADEED safe reference seeder. Admin-only and idempotent per organization.
// It intentionally contains no invented policies, SLAs or facility facts;
// authoritative tenant documents are uploaded and approved separately.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireOrgContext } from "@/lib/org/org-middleware";
import { hasPlatformRole } from "@/lib/authz.server";
import { EMBEDDING_DIMS, EMBEDDING_MODEL, embedText, toPgVector } from "./embeddings.server";
import { SADEED_SAFE_REFERENCE_CORPUS } from "./seed-corpus.data";

export const seedSadeedCorpus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireOrgContext])
  .handler(async ({ context }) => {
    const { supabase, userId, orgId } = context;
    if (!(await hasPlatformRole(userId, "admin"))) {
      throw new Error("Forbidden: admin role required");
    }

    const { data: existing } = await supabase
      .from("finn_knowledge")
      .select("title")
      .eq("org_id", orgId);
    const have = new Set((existing ?? []).map((row) => row.title));
    const pending = SADEED_SAFE_REFERENCE_CORPUS.filter((entry) => !have.has(entry.title));
    if (!pending.length) {
      return {
        inserted: 0,
        skipped: SADEED_SAFE_REFERENCE_CORPUS.length,
        total: SADEED_SAFE_REFERENCE_CORPUS.length,
        failures: [] as string[],
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let inserted = 0;
    const failures: string[] = [];
    const concurrency = 3;
    for (let index = 0; index < pending.length; index += concurrency) {
      const slice = pending.slice(index, index + concurrency);
      const rows = await Promise.all(
        slice.map(async (entry) => {
          try {
            const vector = await embedText(`${entry.title}\n\n${entry.content}`, {
              purpose: "retrieval-document",
              title: entry.title,
            });
            if (!vector) throw new Error("embedding unavailable");
            return {
              org_id: orgId,
              title: entry.title,
              source: entry.source,
              tags: entry.tags,
              content: entry.content,
              embedding: toPgVector(vector),
              model_version: `${EMBEDDING_MODEL}-${EMBEDDING_DIMS}-v1`,
              embedded_at: new Date().toISOString(),
            };
          } catch (error) {
            failures.push(
              `${entry.title}: ${error instanceof Error ? error.message : String(error)}`,
            );
            return null;
          }
        }),
      );
      const valid = rows.filter((row): row is NonNullable<typeof row> => row !== null);
      if (!valid.length) continue;
      const { error } = await supabaseAdmin.from("finn_knowledge").insert(valid);
      if (error) failures.push(`batch ${index}: ${error.message}`);
      else inserted += valid.length;
    }

    return {
      inserted,
      skipped: SADEED_SAFE_REFERENCE_CORPUS.length - inserted,
      total: SADEED_SAFE_REFERENCE_CORPUS.length,
      failures,
    };
  });
