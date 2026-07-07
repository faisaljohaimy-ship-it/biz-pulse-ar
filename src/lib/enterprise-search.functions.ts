// Enterprise unified search across incidents, work orders, knowledge articles,
// aria documents, and user knowledge docs. Uses RLS-scoped ILIKE for broad
// coverage; kb articles keep their existing semantic search path.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SearchSource = "incident" | "work_order" | "kb_article" | "aria_document" | "knowledge_doc";

export type SearchHit = {
  id: string;
  source: SearchSource;
  title: string;
  snippet: string;
  meta: string | null;
  ref: string | null;
  at: string;
  href: string;
};

export type SearchResponse = {
  query: string;
  total: number;
  by_source: Record<SearchSource, number>;
  hits: SearchHit[];
  took_ms: number;
};

const schema = z.object({
  q: z.string().trim().min(2).max(200),
  sources: z.array(z.enum(["incident", "work_order", "kb_article", "aria_document", "knowledge_doc"])).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const emptyBySource: Record<SearchSource, number> = {
  incident: 0, work_order: 0, kb_article: 0, aria_document: 0, knowledge_doc: 0,
};

export const enterpriseSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }): Promise<SearchResponse> => {
    const started = Date.now();
    const supabase = context.supabase;
    const q = data.q;
    const safeQ = q.replace(/[,()]/g, " ");
    const like = `%${safeQ.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const wanted = new Set<SearchSource>(data.sources ?? ["incident", "work_order", "kb_article", "aria_document", "knowledge_doc"]);
    const perSourceLimit = Math.max(3, Math.ceil(data.limit / Math.max(1, wanted.size)));

    const tasks: PromiseLike<SearchHit[]>[] = [];

    if (wanted.has("incident")) {
      tasks.push(
        supabase
          .from("sec_incidents")
          .select("id,ref,title_ar,title_en,ai_summary,severity,status,reported_at")
          .or(`title_en.ilike.${like},title_ar.ilike.${like},ai_summary.ilike.${like},ref.ilike.${like}`)
          .order("reported_at", { ascending: false })
          .limit(perSourceLimit)
          .then(({ data: rows }) => (rows ?? []).map<SearchHit>((r) => ({
            id: r.id,
            source: "incident",
            title: r.title_en || r.title_ar || r.ref,
            snippet: r.ai_summary ?? "",
            meta: `${r.severity} · ${r.status}`,
            ref: r.ref,
            at: r.reported_at,
            href: `/incidents/${r.id}`,
          }))),
      );
    }

    if (wanted.has("work_order")) {
      tasks.push(
        supabase
          .from("sec_work_orders")
          .select("id,ref,title_ar,title_en,notes,status,priority,opened_at")
          .or(`title_en.ilike.${like},title_ar.ilike.${like},notes.ilike.${like},ref.ilike.${like}`)
          .order("opened_at", { ascending: false })
          .limit(perSourceLimit)
          .then(({ data: rows }) => (rows ?? []).map<SearchHit>((r) => ({
            id: r.id,
            source: "work_order",
            title: r.title_en || r.title_ar || r.ref,
            snippet: r.notes ?? "",
            meta: `${r.priority} · ${r.status}`,
            ref: r.ref,
            at: r.opened_at,
            href: `/work-orders/${r.id}`,
          }))),
      );
    }

    if (wanted.has("kb_article")) {
      tasks.push(
        supabase
          .from("sec_knowledge_articles")
          .select("id,doc_code,title_ar,title_en,summary_ar,summary_en,risk_level,priority,updated_at")
          .or(`title_en.ilike.${like},title_ar.ilike.${like},summary_en.ilike.${like},summary_ar.ilike.${like},doc_code.ilike.${like}`)
          .limit(perSourceLimit)
          .then(({ data: rows }) => (rows ?? []).map<SearchHit>((r) => ({
            id: r.id,
            source: "kb_article",
            title: r.title_en || r.title_ar || r.doc_code,
            snippet: r.summary_en || r.summary_ar || "",
            meta: `${r.risk_level ?? ""}${r.priority ? " · " + r.priority : ""}`.trim() || null,
            ref: r.doc_code,
            at: r.updated_at,
            href: `/knowledge?doc=${encodeURIComponent(r.doc_code)}`,
          }))),
      );
    }

    if (wanted.has("aria_document")) {
      tasks.push(
        supabase
          .from("aria_documents")
          .select("id,title,summary,status,mime_type,tags,updated_at")
          .or(`title.ilike.${like},summary.ilike.${like}`)
          .order("updated_at", { ascending: false })
          .limit(perSourceLimit)
          .then(({ data: rows }) => (rows ?? []).map<SearchHit>((r) => ({
            id: r.id,
            source: "aria_document",
            title: r.title,
            snippet: r.summary ?? "",
            meta: `${r.mime_type ?? "doc"} · ${r.status}`,
            ref: (r.tags ?? []).join(", ") || null,
            at: r.updated_at,
            href: `/aria-documents?doc=${r.id}`,
          }))),
      );
    }

    if (wanted.has("knowledge_doc")) {
      tasks.push(
        supabase
          .from("knowledge_docs")
          .select("id,title,content,tags,created_at")
          .or(`title.ilike.${like},content.ilike.${like}`)
          .order("created_at", { ascending: false })
          .limit(perSourceLimit)
          .then(({ data: rows }) => (rows ?? []).map<SearchHit>((r) => ({
            id: r.id,
            source: "knowledge_doc",
            title: r.title,
            snippet: (r.content ?? "").slice(0, 280),
            meta: (r.tags ?? []).slice(0, 3).join(", ") || null,
            ref: null,
            at: r.created_at,
            href: `/knowledge?item=${r.id}`,
          }))),
      );
    }

    const groups = await Promise.all(tasks);
    const flat = groups.flat();

    // Rank: prefer title matches, then recency
    const qLower = q.toLowerCase();
    flat.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(qLower) ? 0 : 1;
      const bTitle = b.title.toLowerCase().includes(qLower) ? 0 : 1;
      if (aTitle !== bTitle) return aTitle - bTitle;
      return b.at.localeCompare(a.at);
    });

    const by_source: Record<SearchSource, number> = { ...emptyBySource };
    for (const h of flat) by_source[h.source] += 1;

    return {
      query: q,
      total: flat.length,
      by_source,
      hits: flat.slice(0, data.limit),
      took_ms: Date.now() - started,
    };
  });

export type KnowledgeStats = {
  incidents: number;
  work_orders: number;
  kb_articles: number;
  aria_documents: number;
  knowledge_docs: number;
};

export const getKnowledgeStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<KnowledgeStats> => {
    const supabase = context.supabase;
    const [inc, wo, kb, ariaDocs, kd] = await Promise.all([
      supabase.from("sec_incidents").select("*", { count: "exact", head: true }),
      supabase.from("sec_work_orders").select("*", { count: "exact", head: true }),
      supabase.from("sec_knowledge_articles").select("*", { count: "exact", head: true }),
      supabase.from("aria_documents").select("*", { count: "exact", head: true }),
      supabase.from("knowledge_docs").select("*", { count: "exact", head: true }),
    ]);
    return {
      incidents: inc.count ?? 0,
      work_orders: wo.count ?? 0,
      kb_articles: kb.count ?? 0,
      aria_documents: ariaDocs.count ?? 0,
      knowledge_docs: kd.count ?? 0,
    };
  });
