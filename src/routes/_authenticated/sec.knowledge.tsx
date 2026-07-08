import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Search,
  Sparkles,
  ShieldCheck,
  Gavel,
  ListChecks,
  FileText,
  Siren,
  AlertTriangle,
  Activity,
  Flame,
  UserCheck,
  HardHat,
  ClipboardCheck,
  DoorOpen,
  KeyRound,
  Map as MapIcon,
  Camera,
  Package,
  Building2,
  Crown,
  Calendar,
  RefreshCw,
  RotateCcw,
  CheckCircle,
  BarChart3,
  FileInput,
  LayoutTemplate,
  CheckSquare,
  Loader2,
  RotateCw,
  Wand2,
  ChevronRight,
} from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { SecPageHeader } from "@/components/sec/sec-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  kbListCategories,
  kbListArticles,
  kbGetArticle,
  kbSemanticSearch,
  kbSeedFoundational,
  kbEmbedMissing,
  kbStats,
  type KbArticleSummary,
} from "@/lib/kb.functions";
import { getCurrentUserIsAdmin } from "@/lib/authz.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/sec/knowledge")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: KbPage,
});

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "shield-check": ShieldCheck,
  gavel: Gavel,
  "list-checks": ListChecks,
  "file-text": FileText,
  siren: Siren,
  search: Search,
  "alert-triangle": AlertTriangle,
  activity: Activity,
  flame: Flame,
  "user-check": UserCheck,
  "hard-hat": HardHat,
  "clipboard-check": ClipboardCheck,
  "door-open": DoorOpen,
  "key-round": KeyRound,
  map: MapIcon,
  camera: Camera,
  package: Package,
  "building-2": Building2,
  biohazard: Flame,
  crown: Crown,
  calendar: Calendar,
  kaaba: Building2,
  "refresh-cw": RefreshCw,
  "rotate-ccw": RotateCcw,
  "check-circle": CheckCircle,
  "bar-chart-3": BarChart3,
  "file-input": FileInput,
  "layout-template": LayoutTemplate,
  "check-square": CheckSquare,
};

const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
};

function KbPage() {
  const { user } = useAuth();
  const getIsAdmin = useServerFn(getCurrentUserIsAdmin);
  const adminQ = useQuery({
    queryKey: ["kb", "isAdmin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const result = await getIsAdmin();
      return !!result.isAdmin;
    },
  });
  const isAdmin = !!adminQ.data;
  const qc = useQueryClient();
  const listCats = useServerFn(kbListCategories);
  const listArts = useServerFn(kbListArticles);
  const getArt = useServerFn(kbGetArticle);
  const semantic = useServerFn(kbSemanticSearch);
  const seedFn = useServerFn(kbSeedFoundational);
  const embedFn = useServerFn(kbEmbedMissing);
  const statsFn = useServerFn(kbStats);

  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [semQuery, setSemQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | undefined>();

  const categoriesQ = useQuery({ queryKey: ["kb", "cats"], queryFn: () => listCats() });
  const statsQ = useQuery({
    queryKey: ["kb", "stats"],
    queryFn: () => statsFn(),
    refetchInterval: 45_000,
  });
  const articlesQ = useQuery({
    queryKey: ["kb", "list", category ?? "all", search],
    queryFn: () =>
      listArts({ data: { category_code: category, search: search || undefined, limit: 100 } }),
  });
  const detailQ = useQuery({
    queryKey: ["kb", "detail", selectedCode],
    queryFn: () => getArt({ data: { doc_code: selectedCode! } }),
    enabled: !!selectedCode,
  });
  const semQ = useQuery({
    queryKey: ["kb", "semantic", semQuery],
    queryFn: () => semantic({ data: { query: semQuery, limit: 8 } }),
    enabled: semQuery.trim().length >= 3,
  });

  const seedM = useMutation({
    mutationFn: () => seedFn(),
    onSuccess: (r) => {
      toast.success(`تم زرع ${r.upserted} مقالة تأسيسية`);
      qc.invalidateQueries({ queryKey: ["kb"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const embedM = useMutation({
    mutationFn: () => embedFn({ data: { batch: 20 } }),
    onSuccess: (r) => {
      const msg =
        `معالجة ${r.updated} — متبقي ${r.remaining}` +
        (r.failures.length ? ` — أخطاء ${r.failures.length}` : "");
      if (r.failures.length) toast.warning(msg);
      else toast.success(msg);
      qc.invalidateQueries({ queryKey: ["kb"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categories = categoriesQ.data ?? [];
  const articles = articlesQ.data ?? [];
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of articles) {
      const k = a.category_code ?? "—";
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [articles]);

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="مستودع المعرفة الصناعي"
        subtitle="Industrial Security Knowledge Repository — سياسات، إجراءات، نماذج، قوائم تحقق ثنائية اللغة"
      >
        {isAdmin && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => seedM.mutate()}
              disabled={seedM.isPending}
            >
              {seedM.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
              زرع تأسيسي
            </Button>
            <Button size="sm" onClick={() => embedM.mutate()} disabled={embedM.isPending}>
              {embedM.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              توليد embeddings
            </Button>
          </>
        )}
      </SecPageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="إجمالي المقالات" value={statsQ.data?.total ?? "—"} />
        <StatTile label="مفهرسة للبحث الدلالي" value={statsQ.data?.embedded ?? "—"} />
        <StatTile
          label="التغطية"
          value={
            statsQ.data && statsQ.data.total > 0
              ? `${Math.round((statsQ.data.embedded / statsQ.data.total) * 100)}%`
              : "—"
          }
        />
      </div>

      {/* Semantic search */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-cyan-500" />
          البحث الدلالي عبر ARIA (يفهم اللغة الطبيعية ar/en)
        </label>
        <Input
          dir="auto"
          value={semQuery}
          onChange={(e) => setSemQuery(e.target.value)}
          placeholder="مثال: ماذا أفعل عند تسرب الغاز؟ — How to issue a hot-work permit?"
        />
        {semQuery.trim().length >= 3 && (
          <div className="mt-3 space-y-2">
            {semQ.isFetching && <div className="text-xs text-muted-foreground">جاري البحث…</div>}
            {semQ.data && (
              <>
                <div className="text-[11px] text-muted-foreground">
                  {semQ.data.mode === "semantic" ? "🧠 بحث دلالي" : "🔤 بحث نصي احتياطي"}
                  {semQ.data.reason && <span className="ms-2">({semQ.data.reason})</span>}
                </div>
                {semQ.data.hits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedCode(h.doc_code)}
                    className="block w-full rounded-lg border border-border bg-card/60 p-3 text-start transition hover:border-cyan-500/40 hover:bg-cyan-500/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">{h.title_ar}</div>
                      {h.similarity != null && (
                        <span className="text-[10px] text-cyan-500">
                          {(h.similarity * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {h.summary_ar}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-mono">{h.doc_code}</span>
                      {h.category_code && <span>• {h.category_code}</span>}
                      {h.risk_level && (
                        <span
                          className={cn("rounded-full border px-1.5", RISK_COLORS[h.risk_level])}
                        >
                          {h.risk_level}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {semQ.data.hits.length === 0 && (
                  <div className="text-xs text-muted-foreground">لا توجد نتائج.</div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_minmax(0,420px)]">
        {/* Categories */}
        <aside className="space-y-1 rounded-xl border border-border bg-card/40 p-2">
          <button
            onClick={() => setCategory(undefined)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
              !category ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> جميع التصنيفات
            </span>
            <span className="text-xs opacity-70">{articles.length}</span>
          </button>
          {categories.map((c) => {
            const Icon = ICON_MAP[c.icon ?? ""] ?? BookOpen;
            const active = category === c.code;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.code)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.name_ar}</span>
                </span>
                {counts[c.code] != null && counts[c.code] > 0 && (
                  <span className="text-[10px] opacity-60">{counts[c.code]}</span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Articles list */}
        <section className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="auto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث نصي بالعنوان / الكلمات المفتاحية / رمز الوثيقة…"
              className="ps-9"
            />
          </div>
          {articlesQ.isFetching && <div className="text-xs text-muted-foreground">…تحميل</div>}
          <div className="space-y-2">
            {articles.map((a) => (
              <ArticleCard
                key={a.id}
                a={a}
                selected={selectedCode === a.doc_code}
                onSelect={() => setSelectedCode(a.doc_code)}
              />
            ))}
            {!articlesQ.isFetching && articles.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
                {isAdmin ? (
                  <>
                    لا توجد مقالات. اضغط <strong>«زرع تأسيسي»</strong> أعلاه لتعبئة المستودع.
                  </>
                ) : (
                  <>لم يتم إعداد المستودع بعد. تواصل مع المدير.</>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Detail */}
        <aside className="rounded-xl border border-border bg-card/40 p-4">
          {!selectedCode && (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <BookOpen className="mb-2 h-8 w-8 opacity-40" />
              اختر مقالة لعرض التفاصيل.
            </div>
          )}
          {selectedCode && detailQ.isFetching && (
            <div className="text-xs text-muted-foreground">…تحميل</div>
          )}
          {selectedCode && detailQ.data && <ArticleDetail a={detailQ.data} />}
        </aside>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function ArticleCard({
  a,
  selected,
  onSelect,
}: {
  a: KbArticleSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "block w-full rounded-xl border bg-card/60 p-3 text-start transition hover:border-primary/40 hover:bg-card",
        selected ? "border-primary shadow-sm" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-sm font-semibold">{a.title_ar}</div>
          <div className="text-[11px] text-muted-foreground">{a.title_en}</div>
        </div>
        <ChevronRight className="mt-1 h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{a.summary_ar}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono">
          {a.doc_code}
        </span>
        {a.category_code && (
          <span className="rounded bg-muted px-1.5 py-0.5">{a.category_code}</span>
        )}
        {a.risk_level && (
          <span className={cn("rounded-full border px-1.5 py-0.5", RISK_COLORS[a.risk_level])}>
            {a.risk_level}
          </span>
        )}
        {a.priority && <span className="rounded bg-muted px-1.5 py-0.5">{a.priority}</span>}
        <span className="ms-auto text-muted-foreground">v{a.version}</span>
      </div>
    </button>
  );
}

function ArticleDetail({ a }: { a: NonNullable<Awaited<ReturnType<typeof kbGetArticle>>> }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {a.doc_code} • v{a.version}
        </div>
        <h2 className="mt-1 text-lg font-bold">{a.title_ar}</h2>
        <div className="text-xs text-muted-foreground">{a.title_en}</div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {a.category_code && <Badge variant="outline">{a.category_code}</Badge>}
        {a.risk_level && (
          <span className={cn("rounded-full border px-2 py-0.5", RISK_COLORS[a.risk_level])}>
            {a.risk_level}
          </span>
        )}
        {a.priority && <Badge variant="secondary">{a.priority}</Badge>}
        {a.escalation_level && <Badge variant="outline">↑ {a.escalation_level}</Badge>}
      </div>

      {a.summary_ar && (
        <Field label="ملخص" value={a.summary_ar} valueEn={a.summary_en ?? undefined} />
      )}
      {a.purpose_ar && (
        <Field label="الهدف" value={a.purpose_ar} valueEn={a.purpose_en ?? undefined} />
      )}
      {a.scope_ar && <Field label="النطاق" value={a.scope_ar} valueEn={a.scope_en ?? undefined} />}
      {a.responsibilities_ar && (
        <Field
          label="المسؤوليات"
          value={a.responsibilities_ar}
          valueEn={a.responsibilities_en ?? undefined}
        />
      )}
      {a.procedure_ar && (
        <Field label="الإجراء" value={a.procedure_ar} valueEn={a.procedure_en ?? undefined} mono />
      )}
      {a.requirements_ar && (
        <Field
          label="الاشتراطات"
          value={a.requirements_ar}
          valueEn={a.requirements_en ?? undefined}
        />
      )}

      {(a.keywords_ar.length > 0 || a.keywords_en.length > 0) && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            كلمات مفتاحية
          </div>
          <div className="flex flex-wrap gap-1">
            {[...a.keywords_ar, ...a.keywords_en].map((k) => (
              <span key={k} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {(a.related_workflows.length > 0 ||
        a.related_agents.length > 0 ||
        a.related_forms.length > 0) && (
        <div className="rounded-lg border border-border bg-background/60 p-2 text-[11px]">
          {a.related_workflows.length > 0 && (
            <div>
              🔁 <strong>Workflows:</strong> {a.related_workflows.join(" • ")}
            </div>
          )}
          {a.related_agents.length > 0 && (
            <div>
              🤖 <strong>Agents:</strong>{" "}
              {a.related_agents
                .map((ag) => (
                  <Link key={ag} to="/agents" className="font-mono text-primary hover:underline">
                    {ag}
                  </Link>
                ))
                .reduce((p: any, c, i) => (i === 0 ? [c] : [...p, " • ", c]), [])}
            </div>
          )}
          {a.related_forms.length > 0 && (
            <div>
              📋 <strong>Forms:</strong> {a.related_forms.join(" • ")}
            </div>
          )}
        </div>
      )}

      {a.owner && <div className="text-[11px] text-muted-foreground">المالك: {a.owner}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  valueEn,
  mono,
}: {
  label: string;
  value: string;
  valueEn?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("whitespace-pre-wrap text-xs leading-relaxed", mono && "font-mono")}>
        {value}
      </div>
      {valueEn && valueEn !== value && (
        <div
          dir="ltr"
          className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground"
        >
          {valueEn}
        </div>
      )}
    </div>
  );
}
