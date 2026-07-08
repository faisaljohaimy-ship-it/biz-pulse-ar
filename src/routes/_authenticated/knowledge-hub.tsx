import { RouteError, RouteNotFound } from "@/components/route-boundaries";
// Enterprise Knowledge Center — unified search + stats + shortcuts.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  BookOpen,
  FileText,
  Wrench,
  AlertTriangle,
  FileStack,
  Upload,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import {
  enterpriseSearch,
  getKnowledgeStats,
  type SearchSource,
  type SearchHit,
} from "@/lib/enterprise-search.functions";

export const Route = createFileRoute("/_authenticated/knowledge-hub")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: KnowledgeHubPage,
});

const SOURCE_META: Record<
  SearchSource,
  {
    icon: typeof BookOpen;
    label_en: string;
    label_ar: string;
    tone: "cyan" | "emerald" | "amber" | "rose" | "slate";
  }
> = {
  incident: { icon: AlertTriangle, label_en: "Incident", label_ar: "حادثة", tone: "rose" },
  work_order: { icon: Wrench, label_en: "Work Order", label_ar: "أمر عمل", tone: "amber" },
  kb_article: { icon: BookOpen, label_en: "KB Article", label_ar: "مقالة معرفة", tone: "cyan" },
  aria_document: {
    icon: FileStack,
    label_en: "ARIA Document",
    label_ar: "وثيقة ARIA",
    tone: "emerald",
  },
  knowledge_doc: { icon: FileText, label_en: "Note", label_ar: "ملاحظة", tone: "slate" },
};

function KnowledgeHubPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const runSearch = useServerFn(enterpriseSearch);
  const fetchStats = useServerFn(getKnowledgeStats);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeSources, setActiveSources] = useState<Set<SearchSource>>(
    new Set(["incident", "work_order", "kb_article", "aria_document", "knowledge_doc"]),
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const stats = useQuery({
    queryKey: ["knowledge-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 60_000,
  });

  const search = useMutation({
    mutationFn: (query: string) =>
      runSearch({ data: { q: query, sources: Array.from(activeSources), limit: 30 } }),
  });

  useEffect(() => {
    if (debouncedQ.length >= 2) search.mutate(debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, activeSources]);

  const toggleSource = (s: SearchSource) => {
    setActiveSources((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      if (next.size === 0) next.add(s);
      return next;
    });
  };

  const results = search.data;

  return (
    <NexusPage
      eyebrow="KNOWLEDGE CENTER"
      title={ar ? "مركز المعرفة المؤسسي" : "Enterprise Knowledge Center"}
      subtitle={
        ar
          ? "بحث موحد عبر الحوادث، أوامر العمل، قاعدة المعرفة، ومستندات ARIA."
          : "Unified search across incidents, work orders, KB, and ARIA documents."
      }
      actions={
        <Link
          to="/knowledge-upload"
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-400/20"
        >
          <Upload className="h-3.5 w-3.5" />
          {ar ? "رفع مستند" : "Upload document"}
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <NexusStat
          label={ar ? "حوادث" : "Incidents"}
          value={String(stats.data?.incidents ?? "—")}
          tone="rose"
        />
        <NexusStat
          label={ar ? "أوامر عمل" : "Work orders"}
          value={String(stats.data?.work_orders ?? "—")}
          tone="amber"
        />
        <NexusStat
          label={ar ? "مقالات KB" : "KB articles"}
          value={String(stats.data?.kb_articles ?? "—")}
          tone="cyan"
        />
        <NexusStat
          label={ar ? "مستندات ARIA" : "ARIA docs"}
          value={String(stats.data?.aria_documents ?? "—")}
          tone="emerald"
        />
        <NexusStat
          label={ar ? "ملاحظات" : "Notes"}
          value={String(stats.data?.knowledge_docs ?? "—")}
          tone="cyan"
        />
      </div>

      <NexusCard>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-cyan-300" />
          <div className="text-[11px] font-bold tracking-[0.25em] text-cyan-300/80">
            {ar ? "البحث المؤسسي" : "ENTERPRISE SEARCH"}
          </div>
        </div>

        <div className="mt-3 relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              ar ? "اكتب للبحث في كل نظام NEXIOS…" : "Type to search across all of NEXIOS…"
            }
            autoFocus
            className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-10 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
          />
          {search.isPending && (
            <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-300" />
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(SOURCE_META) as SearchSource[]).map((s) => {
            const meta = SOURCE_META[s];
            const active = activeSources.has(s);
            const count = results?.by_source[s] ?? 0;
            return (
              <button
                key={s}
                onClick={() => toggleSource(s)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  active
                    ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20"
                }`}
              >
                <meta.icon className="h-3 w-3" />
                {ar ? meta.label_ar : meta.label_en}
                {count > 0 && (
                  <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {debouncedQ.length < 2 ? (
          <div className="mt-8 py-10 text-center text-sm text-slate-500">
            {ar
              ? "ابدأ بكتابة بحثك للاستعلام عن كامل النظام"
              : "Start typing to query the entire platform"}
          </div>
        ) : search.isError ? (
          <div className="mt-6 rounded-md border border-rose-500/40 bg-rose-500/5 p-3 text-sm text-rose-200">
            {(search.error as Error)?.message}
          </div>
        ) : !results || results.hits.length === 0 ? (
          search.isPending ? null : (
            <div className="mt-8 py-10 text-center text-sm text-slate-500">
              {ar ? "لا توجد نتائج" : "No results"}
            </div>
          )
        ) : (
          <>
            <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
              {results.total} {ar ? "نتيجة" : "results"} · {results.took_ms}ms
            </div>
            <ul className="mt-2 divide-y divide-white/5">
              {results.hits.map((h) => (
                <SearchHitRow key={`${h.source}-${h.id}`} hit={h} ar={ar} />
              ))}
            </ul>
          </>
        )}
      </NexusCard>
    </NexusPage>
  );
}

function SearchHitRow({ hit, ar }: { hit: SearchHit; ar: boolean }) {
  const meta = SOURCE_META[hit.source];
  const Icon = meta.icon;
  return (
    <li>
      <a
        href={hit.href}
        className="group flex items-start gap-3 py-3 transition hover:bg-white/[0.02] rounded-md px-2"
      >
        <div className={`mt-0.5 rounded-md bg-${meta.tone}-400/10 p-2 text-${meta.tone}-300`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <NexusPill tone={meta.tone}>{ar ? meta.label_ar : meta.label_en}</NexusPill>
            {hit.ref && <span className="text-[10px] font-mono text-slate-500">{hit.ref}</span>}
            {hit.meta && <span className="text-[10px] text-slate-500">{hit.meta}</span>}
            <span className="ms-auto text-[10px] text-slate-500">
              {new Date(hit.at).toLocaleDateString(ar ? "ar" : "en", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-white">{hit.title}</div>
          {hit.snippet && (
            <div className="mt-0.5 line-clamp-2 text-[12px] text-slate-400">{hit.snippet}</div>
          )}
        </div>
        <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-600 group-hover:text-cyan-300" />
      </a>
    </li>
  );
}
