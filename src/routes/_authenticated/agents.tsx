import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  listAgentRuns,
  getAgentOpsOverview,
  setAgentEnabled,
  cancelAgentRun,
  retryAgentRun,
  type AgentOpsRecord,
} from "@/lib/exec.functions";
import { supabase } from "@/integrations/supabase/client";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LiveStatus } from "@/components/state/LiveStatus";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bot,
  Play,
  Sparkles,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ShieldAlert,
  BarChart3,
  Megaphone,
  Headphones,
  FileText,
  Workflow,
  Network,
  Eye,
  Gauge,
  RotateCw,
  Ban,
  Search,
  TimerReset,
  Power,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agents")({
  component: AgentsOps,
  errorComponent: function AgentsErrorComponent({ error, reset }) {
    const router = useRouter();
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-destructive">{error?.message ?? "Error"}</p>
        <Button
          variant="outline"
          onClick={() => {
            reset();
            router.invalidate();
          }}
        >
          Retry
        </Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

type RunRow = {
  id: string;
  agent_id: string;
  status: string;
  summary: string | null;
  steps: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
  triggered_by: string | null;
  goal_override: string | null;
};

const CATEGORY_ICON: Record<string, typeof Bot> = {
  executive: Sparkles,
  reporting: FileText,
  intelligence: BarChart3,
  monitoring: Activity,
  response: ShieldAlert,
  audit: ShieldAlert,
  orchestration: Workflow,
  notification: Megaphone,
  rag: Headphones,
  twin: Network,
};
function iconFor(category?: string) {
  return CATEGORY_ICON[category ?? ""] ?? Bot;
}

const STATE_STYLE: Record<
  AgentOpsRecord["state"],
  { label: string; labelAr: string; cls: string; dot: string }
> = {
  running: {
    label: "Running",
    labelAr: "قيد التشغيل",
    cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
    dot: "bg-cyan-400 animate-pulse",
  },
  queued: {
    label: "Queued",
    labelAr: "في الطابور",
    cls: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    dot: "bg-blue-400",
  },
  failed: {
    label: "Failed",
    labelAr: "فشل آخر تشغيل",
    cls: "border-red-500/40 bg-red-500/10 text-red-300",
    dot: "bg-red-400",
  },
  idle: {
    label: "Idle",
    labelAr: "خامل",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  ready: {
    label: "Ready",
    labelAr: "جاهز",
    cls: "border-slate-500/40 bg-slate-500/10 text-slate-200",
    dot: "bg-slate-300",
  },
  disabled: {
    label: "Disabled",
    labelAr: "معطّل",
    cls: "border-zinc-600/40 bg-zinc-600/10 text-zinc-400",
    dot: "bg-zinc-500",
  },
};

function StateBadge({ state, locale }: { state: AgentOpsRecord["state"]; locale: string }) {
  const s = STATE_STYLE[state];
  return (
    <Badge variant="outline" className={`gap-1.5 ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {locale === "ar" ? s.labelAr : s.label}
    </Badge>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: typeof CheckCircle2 }> = {
    succeeded: {
      cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      Icon: CheckCircle2,
    },
    running: {
      cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse",
      Icon: Loader2,
    },
    queued: {
      cls: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      Icon: Clock,
    },
    failed: {
      cls: "bg-red-500/20 text-red-300 border-red-500/30",
      Icon: XCircle,
    },
    cancelled: {
      cls: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
      Icon: Ban,
    },
  };
  const cfg = map[status] ?? {
    cls: "bg-slate-500/20 border-slate-500/30",
    Icon: Clock,
  };
  const Icon = cfg.Icon;
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {status}
    </Badge>
  );
}

function formatDuration(startedAt: string, finishedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const ms = Math.max(0, end - start);
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}m ${rs}s`;
}

function formatMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function formatRelative(iso: string | null, locale: string): string {
  if (!iso) return locale === "ar" ? "لم يُشغّل بعد" : "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return locale === "ar" ? `قبل ${s} ث` : `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return locale === "ar" ? `قبل ${m} د` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return locale === "ar" ? `قبل ${h} س` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return locale === "ar" ? `قبل ${d} يوم` : `${d}d ago`;
}

function AgentsOps() {
  const { locale } = useI18n();
  const qc = useQueryClient();
  const callOverview = useServerFn(getAgentOpsOverview);
  const callListRuns = useServerFn(listAgentRuns);
  // Run Agent routes through the public hook below; no direct server-fn call.
  const callToggle = useServerFn(setAgentEnabled);
  const callCancel = useServerFn(cancelAgentRun);
  const callRetry = useServerFn(retryAgentRun);

  const [selected, setSelected] = useState<AgentOpsRecord | null>(null);
  const [goalOverride, setGoalOverride] = useState("");
  const [runDetail, setRunDetail] = useState<RunRow | null>(null);
  const [stateFilter, setStateFilter] = useState<AgentOpsRecord["state"] | "all">("all");
  const [search, setSearch] = useState("");

  // Realtime: refresh on agent_runs changes (best-effort)
  useEffect(() => {
    const topic = `agents-ops:${Math.random().toString(36).slice(2, 10)}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ch: any = null;
    try {
      ch = supabase.channel(topic);
      ch.on("postgres_changes", { event: "*", schema: "public", table: "agent_runs" }, () => {
        void qc.invalidateQueries({ queryKey: ["agents", "ops"] });
        void qc.invalidateQueries({ queryKey: ["agents", "runs"] });
      });
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_definitions" },
        () => void qc.invalidateQueries({ queryKey: ["agents", "ops"] }),
      );
      ch.subscribe();
    } catch (err) {
      console.warn("[agents] realtime unavailable", err);
    }
    return () => {
      if (ch) {
        try {
          void supabase.removeChannel(ch);
        } catch {
          /* noop */
        }
      }
    };
  }, [qc]);

  const opsQ = useQuery({
    queryKey: ["agents", "ops"],
    queryFn: async () => await callOverview(),
    refetchInterval: 45_000,
  });

  const runsQ = useQuery({
    queryKey: ["agents", "runs"],
    queryFn: async () => (await callListRuns()) as RunRow[],
    refetchInterval: 30_000,
  });

  const runM = useMutation({
    // Per CTO order: Run Agent button MUST route through the public hook,
    // which invokes the production wrapper (agent-runtime.server.ts) with the
    // service-role admin client. Never call the agent directly.
    mutationFn: async (p: { agentId: string; goalOverride?: string }) => {
      const resp = await authenticatedFetch("/api/public/hooks/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: p.agentId,
          goalOverride: p.goalOverride?.trim() || undefined,
        }),
      });
      const json = (await resp.json()) as {
        ok?: boolean;
        result?: { status: string; error?: string };
        error?: string;
      };
      if (!resp.ok || json.ok === false) throw new Error(json.error ?? `HTTP ${resp.status}`);
      return json.result ?? { status: "succeeded" };
    },
    onSuccess: (res) => {
      const r = res as { status: string; error?: string };
      if (r.status === "succeeded")
        toast.success(locale === "ar" ? "اكتمل التشغيل" : "Run succeeded");
      else toast.error(r.error ?? (locale === "ar" ? "فشل التشغيل" : "Run failed"));
      setSelected(null);
      setGoalOverride("");
      void qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const toggleM = useMutation({
    mutationFn: async (p: { agentId: string; enabled: boolean }) => callToggle({ data: p }),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.enabled
          ? locale === "ar"
            ? "تم تفعيل الوكيل"
            : "Agent enabled"
          : locale === "ar"
            ? "تم إيقاف الوكيل"
            : "Agent disabled",
      );
      void qc.invalidateQueries({ queryKey: ["agents", "ops"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const cancelM = useMutation({
    mutationFn: async (runId: string) => callCancel({ data: { runId } }),
    onSuccess: () => {
      toast.success(locale === "ar" ? "تم إلغاء التشغيل" : "Run cancelled");
      void qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const retryM = useMutation({
    mutationFn: async (runId: string) => callRetry({ data: { runId } }),
    onSuccess: () => {
      toast.success(locale === "ar" ? "إعادة المحاولة بدأت" : "Retry started");
      void qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const ops = opsQ.data;
  const agents = ops?.agents ?? [];
  const system = ops?.system;
  const runs = runsQ.data ?? [];
  const agentById = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents]);

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter(
      (a) =>
        (stateFilter === "all" || a.state === stateFilter) &&
        (!q ||
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.goal.toLowerCase().includes(q)),
    );
  }, [agents, stateFilter, search]);

  return (
    <Section>
      <PageHeader
        icon={Bot}
        title={locale === "ar" ? "منصة عمليات الوكلاء" : "Agent Operations Platform"}
        subtitle={
          locale === "ar"
            ? "تشغيل، مراقبة، تدقيق، وتحكم — بيانات حية فقط من قاعدة البيانات."
            : "Lifecycle, monitoring, audit & control — live production data only."
        }
        badge="Runtime"
        actions={
          <Button asChild variant="outline">
            <Link to="/exec">{locale === "ar" ? "وحدة التنفيذ" : "Execution Console"}</Link>
          </Button>
        }
      />

      {/* Live operations dashboard */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <SysCard
          icon={Bot}
          label={locale === "ar" ? "إجمالي" : "Total"}
          value={system?.agents_total ?? 0}
        />
        <SysCard
          icon={Activity}
          label={locale === "ar" ? "قيد التشغيل" : "Running"}
          value={system?.agents_running ?? 0}
          accent="cyan"
        />
        <SysCard
          icon={Clock}
          label={locale === "ar" ? "الطابور" : "Queue"}
          value={system?.queue_length ?? 0}
          accent="blue"
        />
        <SysCard
          icon={CheckCircle2}
          label={locale === "ar" ? "خامل" : "Idle"}
          value={system?.agents_idle ?? 0}
          accent="emerald"
        />
        <SysCard
          icon={Power}
          label={locale === "ar" ? "جاهز" : "Ready"}
          value={system?.agents_ready ?? 0}
        />
        <SysCard
          icon={XCircle}
          label={locale === "ar" ? "فشل" : "Failed"}
          value={system?.agents_failed ?? 0}
          accent="red"
        />
        <SysCard
          icon={BarChart3}
          label={locale === "ar" ? `تشغيلات اليوم` : "Today"}
          value={system?.runs_today ?? 0}
        />
        <SysCard
          icon={Gauge}
          label={locale === "ar" ? "متوسط المدة" : "Avg runtime"}
          value={formatMs(system?.avg_duration_ms ?? null)}
        />
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">{locale === "ar" ? "الوكلاء" : "Agents"}</TabsTrigger>
          <TabsTrigger value="runs">{locale === "ar" ? "سجل التشغيل" : "Run history"}</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute start-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === "ar" ? "ابحث عن وكيل…" : "Search agents…"}
                className="w-64 ps-8"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(["all", "running", "queued", "ready", "idle", "failed", "disabled"] as const).map(
                (s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={stateFilter === s ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setStateFilter(s)}
                  >
                    {s === "all"
                      ? locale === "ar"
                        ? "الكل"
                        : "All"
                      : locale === "ar"
                        ? STATE_STYLE[s].labelAr
                        : STATE_STYLE[s].label}
                  </Button>
                ),
              )}
            </div>
            <div className="ms-auto text-[11px] text-muted-foreground">
              {locale === "ar"
                ? `نافذة المؤشرات: آخر ${system?.window_days ?? 30} يوم`
                : `Metrics window: last ${system?.window_days ?? 30}d`}
            </div>
          </div>

          {opsQ.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-56 animate-pulse bg-card/40" />
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <Card className="p-6 flex items-center justify-center">
              <LiveStatus
                variant="discovering"
                hint={
                  locale === "ar"
                    ? "لا توجد مطابقة — وسّع التصفية"
                    : "No matches — broaden the filter"
                }
                size="sm"
              />
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAgents.map((a) => {
                const meta = a.metadata as {
                  department?: string;
                  category?: string;
                  version?: string;
                  capabilities?: string[];
                } | null;
                const Icon = iconFor(meta?.category);
                return (
                  <Card
                    key={a.id}
                    className="group flex h-full flex-col gap-3 border-primary/15 bg-card/60 p-4 backdrop-blur transition hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold leading-tight">{a.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {meta?.department ?? "—"} · v{meta?.version ?? "1.0.0"}
                          </div>
                        </div>
                      </div>
                      <StateBadge state={a.state} locale={locale} />
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {a.goal}
                    </p>

                    {/* Real metrics */}
                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/40 bg-muted/20 p-2 text-center">
                      <Stat
                        label={locale === "ar" ? "نجاح" : "Success"}
                        value={`${a.success_rate}%`}
                        hint={`${a.succeeded}/${a.succeeded + a.failed + a.cancelled}`}
                      />
                      <Stat
                        label={locale === "ar" ? "تشغيلات" : "Runs"}
                        value={String(a.total_runs)}
                        hint={
                          a.running > 0 ? `${a.running} ${locale === "ar" ? "نشط" : "active"}` : ""
                        }
                      />
                      <Stat
                        label={locale === "ar" ? "متوسط" : "Avg"}
                        value={formatMs(a.avg_duration_ms)}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <TimerReset className="h-3 w-3" />
                        {locale === "ar" ? "آخر تشغيل: " : "Last run: "}
                        {formatRelative(a.last_run_at, locale)}
                      </span>
                      <code className="rounded bg-muted/50 px-1.5 py-0.5">{a.model}</code>
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={!a.enabled || runM.isPending}
                        onClick={() => {
                          setSelected(a);
                          setGoalOverride("");
                        }}
                      >
                        <Play className="me-1 h-3 w-3" />
                        {locale === "ar" ? "تشغيل" : "Start"}
                      </Button>
                      <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
                        <Switch
                          checked={a.enabled}
                          disabled={toggleM.isPending}
                          onCheckedChange={(v) => toggleM.mutate({ agentId: a.id, enabled: v })}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {a.enabled
                            ? locale === "ar"
                              ? "فعّال"
                              : "On"
                            : locale === "ar"
                              ? "متوقف"
                              : "Off"}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="runs">
          <Card className="border-primary/15 bg-card/40 backdrop-blur">
            <ScrollArea className="h-[560px]">
              <div className="divide-y divide-border/40">
                {runsQ.isLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
                ) : runs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {locale === "ar" ? "لا توجد تشغيلات بعد." : "No agent runs yet."}
                  </div>
                ) : (
                  runs.map((r) => {
                    const agent = agentById[r.agent_id];
                    const meta = (agent?.metadata ?? {}) as {
                      category?: string;
                    };
                    const Icon = iconFor(meta.category);
                    const isLive = r.status === "running" || r.status === "queued";
                    return (
                      <div
                        key={r.id}
                        className="flex items-start gap-3 p-3 transition hover:bg-primary/5"
                      >
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setRunDetail(r)}
                          className="min-w-0 flex-1 text-start"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">
                              {agent?.name ?? r.agent_id}
                            </span>
                            <RunStatusBadge status={r.status} />
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(r.started_at).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              · {formatDuration(r.started_at, r.finished_at)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              · {r.steps} steps
                            </span>
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {r.error ? (
                              <span className="text-red-300">{r.error}</span>
                            ) : (
                              (r.summary ?? "—")
                            )}
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground/70">
                            id: <code>{r.id.slice(0, 8)}</code>
                          </div>
                        </button>
                        <div className="flex flex-col gap-1">
                          {isLive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              disabled={cancelM.isPending}
                              onClick={() => cancelM.mutate(r.id)}
                            >
                              <Ban className="me-1 h-3 w-3" />
                              {locale === "ar" ? "إلغاء" : "Cancel"}
                            </Button>
                          ) : r.status === "failed" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              disabled={retryM.isPending}
                              onClick={() => retryM.mutate(r.id)}
                            >
                              <RotateCw className="me-1 h-3 w-3" />
                              {locale === "ar" ? "إعادة" : "Retry"}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px]"
                            onClick={() => setRunDetail(r)}
                          >
                            <Eye className="me-1 h-3 w-3" />
                            {locale === "ar" ? "تفاصيل" : "Logs"}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Start dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> {selected?.name}
            </DialogTitle>
            <DialogDescription>{selected?.goal}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {locale === "ar" ? "هدف مخصص (اختياري)" : "Goal override (optional)"}
              </label>
              <Textarea
                value={goalOverride}
                onChange={(e) => setGoalOverride(e.target.value)}
                placeholder={
                  locale === "ar"
                    ? "اكتب الهدف الذي تريد تنفيذه الآن…"
                    : "Describe the specific goal for this run…"
                }
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="rounded-lg border border-primary/15 bg-primary/5 p-3 text-[11px] text-muted-foreground">
              <div className="mb-1 font-semibold text-foreground">
                {locale === "ar" ? "الأدوات المتاحة" : "Allowed tools"}
              </div>
              <div className="flex flex-wrap gap-1">
                {(selected?.tool_allowlist ?? []).map((tid) => (
                  <code key={tid} className="rounded bg-muted/50 px-1.5 py-0.5">
                    {tid}
                  </code>
                ))}
                {!selected?.tool_allowlist?.length && <span>—</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              {locale === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              disabled={runM.isPending || !selected}
              onClick={() =>
                selected &&
                runM.mutate({
                  agentId: selected.id,
                  goalOverride: goalOverride.trim(),
                })
              }
            >
              {runM.isPending ? (
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
              ) : (
                <Play className="me-1 h-4 w-4" />
              )}
              {locale === "ar" ? "بدء التشغيل" : "Start run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run detail */}
      <Dialog open={!!runDetail} onOpenChange={(o) => !o && setRunDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {runDetail && <RunStatusBadge status={runDetail.status} />}
              <span>
                {runDetail ? (agentById[runDetail.agent_id]?.name ?? runDetail.agent_id) : ""}
              </span>
            </DialogTitle>
            <DialogDescription className="font-mono text-[10px]">{runDetail?.id}</DialogDescription>
          </DialogHeader>
          {runDetail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Meta
                  label={locale === "ar" ? "بدأ" : "Started"}
                  value={new Date(runDetail.started_at).toLocaleString()}
                />
                <Meta
                  label={locale === "ar" ? "انتهى" : "Finished"}
                  value={
                    runDetail.finished_at ? new Date(runDetail.finished_at).toLocaleString() : "—"
                  }
                />
                <Meta
                  label={locale === "ar" ? "المدة" : "Duration"}
                  value={formatDuration(runDetail.started_at, runDetail.finished_at)}
                />
                <Meta label={locale === "ar" ? "خطوات" : "Steps"} value={String(runDetail.steps)} />
              </div>
              {runDetail.goal_override && (
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {locale === "ar" ? "الهدف" : "Goal"}
                  </div>
                  <div className="rounded bg-muted/40 p-2">{runDetail.goal_override}</div>
                </div>
              )}
              {runDetail.summary && (
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {locale === "ar" ? "الملخص" : "Summary"}
                  </div>
                  <ScrollArea className="max-h-64 rounded bg-muted/40 p-2">
                    <pre className="whitespace-pre-wrap text-xs">{runDetail.summary}</pre>
                  </ScrollArea>
                </div>
              )}
              {runDetail.error && (
                <div>
                  <div className="text-[10px] uppercase text-red-300">Error</div>
                  <div className="rounded bg-red-500/10 p-2 text-red-300">{runDetail.error}</div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                {(runDetail.status === "running" || runDetail.status === "queued") && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cancelM.isPending}
                    onClick={() => cancelM.mutate(runDetail.id)}
                  >
                    <Ban className="me-1 h-3 w-3" />
                    {locale === "ar" ? "إلغاء التشغيل" : "Cancel run"}
                  </Button>
                )}
                {runDetail.status === "failed" && (
                  <Button
                    size="sm"
                    disabled={retryM.isPending}
                    onClick={() => retryM.mutate(runDetail.id)}
                  >
                    <RotateCw className="me-1 h-3 w-3" />
                    {locale === "ar" ? "إعادة المحاولة" : "Retry"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function SysCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Bot;
  label: string;
  value: string | number;
  accent?: "cyan" | "blue" | "emerald" | "red";
}) {
  const accentMap: Record<string, string> = {
    cyan: "border-cyan-500/30 text-cyan-300",
    blue: "border-blue-500/30 text-blue-300",
    emerald: "border-emerald-500/30 text-emerald-300",
    red: "border-red-500/30 text-red-300",
  };
  const cls = accent ? accentMap[accent] : "border-primary/30 text-primary";
  return (
    <Card className="flex items-center gap-3 border-primary/15 bg-card/60 p-3 backdrop-blur">
      <div className={`rounded-lg border bg-background/40 p-2 ${cls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
      </div>
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
      {hint ? <div className="text-[9px] text-muted-foreground/70">{hint}</div> : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
