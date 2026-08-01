// Server-only safe starter corpus for the runtime pulse. Idempotent per org.
import { EMBEDDING_DIMS, EMBEDDING_MODEL, embedText, toPgVector } from "./embeddings.server";
import { FINN_SAFE_REFERENCE_CORPUS } from "./seed-corpus.data";

type AdminClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        limit: (size: number) => Promise<{ data: Array<{ id?: string; title?: string }> | null }>;
      };
    };
    insert: (rows: unknown[]) => Promise<{ error: { message: string } | null }>;
  };
};

export async function autoSeedFinnCorpusForOrg(
  supabaseAdmin: AdminClient,
  orgId: string,
): Promise<{ inserted: number; skipped: number }> {
  const { data: existing } = await supabaseAdmin
    .from("finn_knowledge")
    .select("title")
    .eq("org_id", orgId)
    .limit(500);
  const have = new Set((existing ?? []).map((row) => row.title ?? ""));
  const pending = FINN_SAFE_REFERENCE_CORPUS.filter((entry) => !have.has(entry.title));
  if (!pending.length) {
    return { inserted: 0, skipped: FINN_SAFE_REFERENCE_CORPUS.length };
  }

  let inserted = 0;
  const concurrency = 3;
  for (let index = 0; index < pending.length; index += concurrency) {
    const slice = pending.slice(index, index + concurrency);
    const rows = await Promise.all(
      slice.map(async (entry) => {
        const vector = await embedText(`${entry.title}\n\n${entry.content}`, {
          purpose: "retrieval-document",
          title: entry.title,
        });
        if (!vector) return null;
        return {
          title: entry.title,
          source: entry.source,
          tags: entry.tags,
          content: entry.content,
          embedding: toPgVector(vector),
          model_version: `${EMBEDDING_MODEL}-${EMBEDDING_DIMS}-v1`,
          embedded_at: new Date().toISOString(),
          org_id: orgId,
        };
      }),
    );
    const valid = rows.filter((row): row is NonNullable<typeof row> => row !== null);
    if (!valid.length) continue;
    const { error } = await supabaseAdmin.from("finn_knowledge").insert(valid);
    if (!error) inserted += valid.length;
  }
  return { inserted, skipped: FINN_SAFE_REFERENCE_CORPUS.length - inserted };
}
