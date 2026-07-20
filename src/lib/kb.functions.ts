import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { requirePlatformAdmin } from "@/lib/authz.server";

/* --------------------------------- Types --------------------------------- */

export type KbCategory = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  sort_order: number;
  icon: string | null;
};

export type KbArticleSummary = {
  id: string;
  doc_code: string;
  category_code: string | null;
  title_ar: string;
  title_en: string;
  summary_ar: string | null;
  summary_en: string | null;
  risk_level: string | null;
  priority: string | null;
  version: string;
  updated_at: string;
};

export type KbArticleFull = KbArticleSummary & {
  description_ar: string | null;
  description_en: string | null;
  purpose_ar: string | null;
  purpose_en: string | null;
  scope_ar: string | null;
  scope_en: string | null;
  responsibilities_ar: string | null;
  responsibilities_en: string | null;
  procedure_ar: string | null;
  procedure_en: string | null;
  requirements_ar: string | null;
  requirements_en: string | null;
  escalation_level: string | null;
  related_forms: string[];
  related_policies: string[];
  related_workflows: string[];
  related_agents: string[];
  keywords_ar: string[];
  keywords_en: string[];
  body_ar: string | null;
  body_en: string | null;
  owner: string | null;
  review_date: string | null;
  status: string;
};

/* ------------------------------ Categories ------------------------------ */

export const kbListCategories = createServerFn({ method: "GET" })
  // Open showcase read; «بيانات لا تفرغ»: unreachable/empty repository ⇒
  // built-in bilingual reference set (live rows always win).
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildKbSimulation, resilient } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "kb-categories",
      async () => {
        const { data, error } = await context.supabase
          .from("sec_knowledge_categories")
          .select("id, code, name_ar, name_en, description_ar, description_en, sort_order, icon")
          .order("sort_order", { ascending: true });
        if (error) throw new Error(error.message);
        return (data ?? []) as KbCategory[];
      },
      (rows) => rows.length === 0,
      () => buildKbSimulation(Date.now()).categories as KbCategory[],
    );
  });

/* ------------------------------- Articles ------------------------------- */

const ListInput = z.object({
  category_code: z.string().optional(),
  search: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(200).default(60),
});

function simArticleSummaries(
  sim: { articles: Array<Record<string, unknown>> },
  filter: { category_code?: string; search?: string; limit: number },
): KbArticleSummary[] {
  const s = filter.search?.trim().toLowerCase();
  return sim.articles
    .filter((a) => !filter.category_code || a.category_code === filter.category_code)
    .filter((a) => {
      if (!s) return true;
      const hay = [
        a.title_ar,
        a.title_en,
        a.summary_ar,
        a.doc_code,
        ...((a.keywords_ar as string[]) ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    })
    .slice(0, filter.limit)
    .map((a) => ({
      id: a.id,
      doc_code: a.doc_code,
      category_code: a.category_code,
      title_ar: a.title_ar,
      title_en: a.title_en,
      summary_ar: a.summary_ar,
      summary_en: a.summary_en,
      risk_level: a.risk_level,
      priority: a.priority,
      version: a.version,
      updated_at: a.updated_at,
    })) as KbArticleSummary[];
}

export const kbListArticles = createServerFn({ method: "POST" })
  // Open showcase read; the reference simulation honours the same
  // category/search filters so the UI search works for guests too.
  .middleware([optionalSupabaseAuth])
  .inputValidator((data: unknown) => ListInput.parse(data))
  .handler(async ({ data, context }) => {
    const { buildKbSimulation, resilient } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "kb-articles",
      () => fetchKbArticles(context.supabase, data),
      // An empty result WITH a filter is a legitimate "no matches" answer;
      // only an unfiltered empty repository falls back to the simulation.
      (rows) => rows.length === 0 && !data.category_code && !data.search?.trim(),
      () => simArticleSummaries(buildKbSimulation(Date.now()), data),
    );
  });

async function fetchKbArticles(
  supabase: { from: (t: string) => any },
  data: z.infer<typeof ListInput>,
): Promise<KbArticleSummary[]> {
  let q = supabase
    .from("sec_knowledge_articles")
    .select(
      "id, doc_code, title_ar, title_en, summary_ar, summary_en, risk_level, priority, version, updated_at, category_id, sec_knowledge_categories!inner(code)",
    )
    .eq("status", "published")
    .order("doc_code", { ascending: true })
    .limit(data.limit);

  if (data.category_code) {
    q = q.eq("sec_knowledge_categories.code", data.category_code);
  }
  if (data.search?.trim()) {
    const s = data.search.trim().replace(/[,()]/g, " ");
    q = q.or(
      [
        `title_ar.ilike.%${s}%`,
        `title_en.ilike.%${s}%`,
        `summary_ar.ilike.%${s}%`,
        `summary_en.ilike.%${s}%`,
        `doc_code.ilike.%${s}%`,
      ].join(","),
    );
  }

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  return ((rows ?? []) as any[]).map((r) => ({
    id: r.id,
    doc_code: r.doc_code,
    category_code: r.sec_knowledge_categories?.code ?? null,
    title_ar: r.title_ar,
    title_en: r.title_en,
    summary_ar: r.summary_ar,
    summary_en: r.summary_en,
    risk_level: r.risk_level,
    priority: r.priority,
    version: r.version,
    updated_at: r.updated_at,
  })) as KbArticleSummary[];
}

export const kbGetArticle = createServerFn({ method: "GET" })
  // Open showcase read; sim articles open with full bodies for guests.
  .middleware([optionalSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ doc_code: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const { buildKbSimulation, resilient } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "kb-article",
      () => fetchKbArticle(context.supabase, data.doc_code),
      (row) => row === null,
      () =>
        (buildKbSimulation(Date.now()).articles.find((a) => a.doc_code === data.doc_code) ??
          null) as KbArticleFull | null,
    );
  });

async function fetchKbArticle(
  supabase: { from: (t: string) => any },
  doc_code: string,
): Promise<KbArticleFull | null> {
  const { data: row, error } = await supabase
    .from("sec_knowledge_articles")
    .select(
      "id, doc_code, title_ar, title_en, summary_ar, summary_en, description_ar, description_en, purpose_ar, purpose_en, scope_ar, scope_en, responsibilities_ar, responsibilities_en, procedure_ar, procedure_en, requirements_ar, requirements_en, risk_level, priority, escalation_level, related_forms, related_policies, related_workflows, related_agents, keywords_ar, keywords_en, body_ar, body_en, version, owner, review_date, status, updated_at, sec_knowledge_categories(code)",
    )
    .eq("doc_code", doc_code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  const r = row;
  return {
    id: r.id,
    doc_code: r.doc_code,
    category_code: r.sec_knowledge_categories?.code ?? null,
    title_ar: r.title_ar,
    title_en: r.title_en,
    summary_ar: r.summary_ar,
    summary_en: r.summary_en,
    description_ar: r.description_ar,
    description_en: r.description_en,
    purpose_ar: r.purpose_ar,
    purpose_en: r.purpose_en,
    scope_ar: r.scope_ar,
    scope_en: r.scope_en,
    responsibilities_ar: r.responsibilities_ar,
    responsibilities_en: r.responsibilities_en,
    procedure_ar: r.procedure_ar,
    procedure_en: r.procedure_en,
    requirements_ar: r.requirements_ar,
    requirements_en: r.requirements_en,
    risk_level: r.risk_level,
    priority: r.priority,
    escalation_level: r.escalation_level,
    related_forms: r.related_forms ?? [],
    related_policies: r.related_policies ?? [],
    related_workflows: r.related_workflows ?? [],
    related_agents: r.related_agents ?? [],
    keywords_ar: r.keywords_ar ?? [],
    keywords_en: r.keywords_en ?? [],
    body_ar: r.body_ar,
    body_en: r.body_en,
    version: r.version,
    owner: r.owner,
    review_date: r.review_date,
    status: r.status,
    updated_at: r.updated_at,
  } as KbArticleFull;
}

/* --------------------------- Semantic search ---------------------------- */

const SemanticInput = z.object({
  query: z.string().min(2).max(500),
  category_code: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(8),
});

function simKeywordSearch(
  sim: { articles: Array<Record<string, unknown>> },
  query: string,
  limit: number,
) {
  const q = query.toLowerCase();
  return {
    mode: "keyword" as const,
    reason: "reference-simulation",
    hits: sim.articles
      .filter((a) =>
        [a.title_ar, a.title_en, a.summary_ar, ...((a.keywords_ar as string[]) ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, limit)
      .map((a) => ({
        id: a.id as string,
        doc_code: a.doc_code as string,
        title_ar: a.title_ar as string,
        title_en: a.title_en as string,
        summary_ar: a.summary_ar as string | null,
        summary_en: a.summary_en as string | null,
        category_code: a.category_code as string | null,
        risk_level: a.risk_level as string | null,
        priority: a.priority as string | null,
        similarity: null,
      })),
  };
}

export const kbSemanticSearch = createServerFn({ method: "POST" })
  // Open showcase read; unreachable database/embedding ⇒ keyword search
  // over the built-in reference articles so ARIA search never dies.
  .middleware([optionalSupabaseAuth])
  .inputValidator((data: unknown) => SemanticInput.parse(data))
  .handler(async ({ data, context }) => {
    const { buildKbSimulation, resilient } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "kb-semantic",
      () =>
        performSemanticSearch(
          context.supabase as { from: (t: string) => any; rpc: (fn: string, args: unknown) => any },
          data,
        ),
      () => false,
      () => simKeywordSearch(buildKbSimulation(Date.now()), data.query, data.limit),
      8_000,
    );
  });

async function performSemanticSearch(
  supabase: { from: (t: string) => any; rpc: (fn: string, args: unknown) => any },
  data: { query: string; category_code?: string; limit: number },
) {
  const { embedText } = await import("@/lib/kb-embed.server");
  let vec: number[];
  try {
    vec = await embedText(data.query);
  } catch (e) {
    // graceful fallback to keyword search if embedding gateway is down
    const s = data.query.replace(/[,()]/g, " ");
    const { data: rows, error } = await supabase
      .from("sec_knowledge_articles")
      .select(
        "id, doc_code, title_ar, title_en, summary_ar, summary_en, risk_level, priority, sec_knowledge_categories(code)",
      )
      .eq("status", "published")
      .or(
        [
          `title_ar.ilike.%${s}%`,
          `title_en.ilike.%${s}%`,
          `summary_ar.ilike.%${s}%`,
          `summary_en.ilike.%${s}%`,
        ].join(","),
      )
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return {
      mode: "keyword" as const,
      reason: (e as Error).message,
      hits: ((rows ?? []) as any[]).map((r) => ({
        id: r.id,
        doc_code: r.doc_code,
        title_ar: r.title_ar,
        title_en: r.title_en,
        summary_ar: r.summary_ar,
        summary_en: r.summary_en,
        category_code: r.sec_knowledge_categories?.code ?? null,
        risk_level: r.risk_level,
        priority: r.priority,
        similarity: null,
      })),
    };
  }

  const { data: rows, error } = await supabase.rpc("sec_kb_search", {
    _query: vec as unknown as string,
    _category_code: data.category_code ?? undefined,
    _limit: data.limit,
  });
  if (error) throw new Error(error.message);
  return {
    mode: "semantic" as const,
    reason: null,
    hits: ((rows ?? []) as any[]).map((r) => ({
      id: r.id,
      doc_code: r.doc_code,
      title_ar: r.title_ar,
      title_en: r.title_en,
      summary_ar: r.summary_ar,
      summary_en: r.summary_en,
      category_code: r.category_code,
      risk_level: r.risk_level,
      priority: r.priority,
      similarity: r.similarity != null ? Number(r.similarity) : null,
    })),
  };
}

/* ------------------------------ Admin: seed ----------------------------- */

async function assertAdmin(userId: string) {
  await requirePlatformAdmin(userId);
}

export const kbSeedFoundational = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ARTICLES } = await import("@/lib/kb-seed.data");

    const { data: cats, error: catErr } = await supabaseAdmin
      .from("sec_knowledge_categories")
      .select("id, code");
    if (catErr) throw new Error(catErr.message);
    const byCode = new Map<string, string>(
      cats?.map((c) => [c.code as string, c.id as string]) ?? [],
    );

    const rows = ARTICLES.map((a) => ({
      doc_code: a.doc_code,
      category_id: byCode.get(a.category_code) ?? null,
      title_ar: a.title_ar,
      title_en: a.title_en,
      summary_ar: a.summary_ar,
      summary_en: a.summary_en,
      purpose_ar: a.purpose_ar ?? null,
      purpose_en: a.purpose_en ?? null,
      scope_ar: a.scope_ar ?? null,
      scope_en: a.scope_en ?? null,
      responsibilities_ar: a.responsibilities_ar ?? null,
      responsibilities_en: a.responsibilities_en ?? null,
      procedure_ar: a.procedure_ar,
      procedure_en: a.procedure_en,
      requirements_ar: a.requirements_ar ?? null,
      requirements_en: a.requirements_en ?? null,
      risk_level: a.risk_level,
      priority: a.priority,
      escalation_level: a.escalation_level ?? null,
      related_forms: a.related_forms ?? [],
      related_policies: a.related_policies ?? [],
      related_workflows: a.related_workflows ?? [],
      related_agents: a.related_agents ?? [],
      keywords_ar: a.keywords_ar ?? [],
      keywords_en: a.keywords_en ?? [],
      version: a.version ?? "1.0",
      owner: a.owner ?? null,
      status: "published",
    }));

    const { error: upErr } = await supabaseAdmin
      .from("sec_knowledge_articles")
      .upsert(rows, { onConflict: "doc_code" });
    if (upErr) throw new Error(upErr.message);

    return { upserted: rows.length };
  });

/* -------------------------- Admin: embed missing ------------------------ */

export const kbEmbedMissing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ batch: z.number().int().min(1).max(50).default(15) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { embedText, EMBEDDING_MODEL } = await import("@/lib/kb-embed.server");

    const { data: pending, error } = await supabaseAdmin
      .from("sec_knowledge_articles")
      .select(
        "id, doc_code, title_ar, title_en, summary_ar, summary_en, procedure_ar, procedure_en, keywords_ar, keywords_en",
      )
      .is("embedding", null)
      .eq("status", "published")
      .limit(data.batch);
    if (error) throw new Error(error.message);

    let updated = 0;
    const failures: Array<{ doc_code: string; reason: string }> = [];

    for (const row of pending ?? []) {
      const r = row;
      const text = [
        r.title_ar,
        r.title_en,
        r.summary_ar,
        r.summary_en,
        r.procedure_ar,
        r.procedure_en,
        (r.keywords_ar ?? []).join(" "),
        (r.keywords_en ?? []).join(" "),
      ]
        .filter(Boolean)
        .join("\n\n");
      try {
        const vec = await embedText(text);
        const { error: upErr } = await supabaseAdmin
          .from("sec_knowledge_articles")
          .update({
            embedding: vec as unknown as string,
            embedding_model: EMBEDDING_MODEL,
          })
          .eq("id", r.id);
        if (upErr) throw new Error(upErr.message);
        updated++;
      } catch (e) {
        failures.push({ doc_code: r.doc_code, reason: (e as Error).message });
      }
    }

    const { count: remaining } = await supabaseAdmin
      .from("sec_knowledge_articles")
      .select("id", { count: "exact", head: true })
      .is("embedding", null)
      .eq("status", "published");

    return { updated, failures, remaining: remaining ?? 0 };
  });

/* ----------------------------- KB stats ----------------------------- */

export const kbStats = createServerFn({ method: "GET" })
  // Open showcase read; empty/unreachable ⇒ reference repository stats.
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildKbSimulation, resilient } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "kb-stats",
      async () => {
        const [{ count: total }, { count: embedded }] = await Promise.all([
          context.supabase
            .from("sec_knowledge_articles")
            .select("id", { count: "exact", head: true })
            .eq("status", "published"),
          context.supabase
            .from("sec_knowledge_articles")
            .select("id", { count: "exact", head: true })
            .eq("status", "published")
            .not("embedding", "is", null),
        ]);
        return { total: total ?? 0, embedded: embedded ?? 0 };
      },
      (r) => r.total === 0,
      () => {
        const n = buildKbSimulation(Date.now()).articles.length;
        return { total: n, embedded: n - 1 };
      },
    );
  });
