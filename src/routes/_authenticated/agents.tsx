import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  listAgents,
  listAgentRuns,
  runAgentFn,
} from "@/lib/exec.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Wrench,
  BarChart3,
  Megaphone,
  Headphones,
  FileText,
  Code2,
  Workflow,
  Network,
  Boxes,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agents")({
  component: AgentsConsole,
  errorComponent: ({ error, reset }) => {
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

type AgentMeta = {
  department?: string;
  category?: string;
  version?: string;
  health?: "green" | "amber" | "red" | string;
  capabilities?: string[];
  triggers?: string[];
  inputs?: string[];
  outputs?: string[];
};

type AgentRow = {
  id: string;
  name: string;
  goal: string;
  model: string;
  tool_allowlist: string[] | null;
  permissions: string[] | null;
  enabled: boolean;
  updated_at: string;
  // metadata isn't in the select; fetched separately below
};

type AgentFull = AgentRow & { metadata: AgentMeta };

type RunRow = {
  id: string;
  agent_id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | string;
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: typeof CheckCircle2 }> = {
    succeeded: { cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", Icon: CheckCircle2 },
    running: { cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse", Icon: Loader2 },
    queued: { cls: "bg-slate-500/20 text-slate-300 border-slate-500/30", Icon: Clock },
    failed: { cls: "bg-red-500/20 text-red-300 border-red-500/30", Icon: XCircle },
    cancelled: { cls: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30", Icon: XCircle },
  };
  const cfg = map[status] ?? { cls: "bg-slate-500/20 border-slate-500/30", Icon: Clock };
  const Icon = cfg.Icon;
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {status}
    </Badge>
  );
}

function HealthDot({ health }: { health?: string }) {
  const cls =
    health === "red"
      ? "bg-red-400"
      : health === "amber"
      ? "bg-amber-400"
      : "bg-emerald-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls} shadow-glow`} />;
}

function AgentsConsole() {
  const { locale, t } = useI18n();
  const qc = useQueryClient();
  const callListAgents = useServerFn(listAgents);
  const callListRuns = useServerFn(listAgentRuns);
  const callRunAgent = useServerFn(runAgentFn);

  const [selected, setSelected] = useState<AgentFull | null>(null);
  const [goalOverride, setGoalOverride] = useState("");
  const [runDetail, setRunDetail] = useState<RunRow | null>(null);

  // Realtime: refresh runs on changes
  useEffect(() => {
    const ch = supabase
      .channel("agents-console")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_runs" },
        () => void qc.invalidateQueries({ queryKey: ["agents", "runs"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  const agentsQ = useQuery({
    queryKey: ["agents", "list"],
    queryFn: async () => {
      const list = (await callListAgents()) as AgentRow[];
      // metadata isn't in the select; fetch it once via direct supabase read (admin-gated by RLS)
      const ids = list.map((a) => a.id);
      let metaById: Record<string, AgentMeta> = {};
      if (ids.length > 0) {
        const { data } = await supabase
          .from("agent_definitions")
          .select("id, metadata")
          .in("id", ids);
        if (data) {
          metaById = Object.fromEntries(
            (data as { id: string; metadata: AgentMeta }[]).map((r) => [r.id, r.metadata ?? {}]),
          );
        }
      }
      return list.map<AgentFull>((a) => ({ ...a, metadata: metaById[a.id] ?? {} }));
    },
    staleTime: 30_000,
  });

  const runsQ = useQuery({
    queryKey: ["agents", "runs"],
    queryFn: async () => (await callListRuns()) as RunRow[],
    refetchInterval: 10_000,
  });

  const runM = useMutation({
    mutationFn: async (payload: { agentId: string; goalOverride?: string }) =>
      callRunAgent({
        data: {
          agentId: payload.agentId,
          goalOverride: payload.goalOverride?.trim() || undefined,
        },
      }),
    onSuccess: (res) => {
      const r = res as { status: string; runId: string; error?: string };
      if (r.status === "succeeded")
        toast.success(locale === "ar" ? "اكتمل تشغيل الوكيل" : "Agent run succeeded");
      else toast.error(r.error ?? (locale === "ar" ? "فشل التشغيل" : "Agent run failed"));
      setSelected(null);
      setGoalOverride("");
      void qc.invalidateQueries({ queryKey: ["agents", "runs"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : String(err));
    },
  });

  const agents = agentsQ.data ?? [];
  const runs = runsQ.data ?? [];
  const agentById = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.id, a])),
    [agents],
  );

  // metrics
  const metrics = useMemo(() => {
    const total = runs.length;
    const succeeded = runs.filter((r) => r.status === "succeeded").length;
    const running = runs.filter((r) => r.status === "running" || r.status === "queued").length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const successRate = total ? Math.round((succeeded / total) * 100) : 0;
    return { total, succeeded, running, failed, successRate, agentsCount: agents.length };
  }, [runs, agents]);

  return (
    <Section>
      <PageHeader
        icon={Bot}
        title={locale === "ar" ? "منصة تشغيل الوكلاء" : t("nav.agents")}
        subtitle={
          locale === "ar"
            ? "محرك تشغيل المؤسسة للوكلاء الذكيين — استدعاء، مراقبة، تدقيق."
            : "Enterprise AI Agent Runtime — invoke, monitor, audit."
        }
        badge="Runtime"
        actions={
          <Button asChild variant="outline">
            <Link to="/exec">{locale === "ar" ? "وحدة التنفيذ" : "Execution Console"}</Link>
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon={Bot} label={locale === "ar" ? "الوكلاء" : "Agents"} value={metrics.agentsCount} />
        <MetricCard icon={Activity} label={locale === "ar" ? "نشط الآن" : "Active now"} value={metrics.running} />
        <MetricCard icon={CheckCircle2} label={locale === "ar" ? "ناجحة" : "Succeeded"} value={metrics.succeeded} />
        <MetricCard icon={XCircle} label={locale === "ar" ? "فاشلة" : "Failed"} value={metrics.failed} />
        <MetricCard
          icon={BarChart3}
          label={locale === "ar" ? "معدل النجاح" : "Success rate"}
          value={`${metrics.successRate}%`}
        />
      </div>

      {/* Agents grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {locale === "ar" ? "الوكلاء الإنتاجيون" : "Production agents"}
        </h2>
        {agentsQ.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-48 animate-pulse bg-card/40" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            {locale === "ar"
              ? "لا توجد تعريفات وكلاء مرئية. ربما يلزم منح صلاحية admin لحسابك."
              : "No agent definitions visible. Your account may need the admin role."}
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => {
              const Icon = iconFor(a.metadata.category);
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
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          {a.name} <HealthDot health={a.metadata.health} />
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {a.metadata.department ?? "—"} · v{a.metadata.version ?? "1.0.0"}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={a.enabled ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {a.enabled ? (locale === "ar" ? "فعّال" : "Enabled") : (locale === "ar" ? "متوقف" : "Disabled")}
                    </Badge>
                  </div>
                  <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{a.goal}</p>
                  <div className="flex flex-wrap gap-1">
                    {(a.metadata.capabilities ?? []).slice(0, 4).map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <code className="rounded bg-muted/50 px-1.5 py-0.5">{a.model}</code>
                    <span>·</span>
                    <span>{(a.tool_allowlist ?? []).length} tools</span>
                    <span>·</span>
                    <span>{(a.metadata.triggers ?? []).length} triggers</span>
                  </div>
                  <div className="mt-auto flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!a.enabled}
                      onClick={() => {
                        setSelected(a);
                        setGoalOverride("");
                      }}
                    >
                      <Play className="me-1 h-3 w-3" />
                      {locale === "ar" ? "تشغيل" : "Run"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent runs timeline */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {locale === "ar" ? "آخر تشغيلات الوكلاء" : "Recent agent runs"}
          </h2>
          <Badge variant="outline" className="text-[10px]">
            <Activity className="me-1 h-3 w-3" /> live
          </Badge>
        </div>
        <Card className="border-primary/15 bg-card/40 backdrop-blur">
          <ScrollArea className="h-[420px]">
            <div className="divide-y divide-border/40">
              {runsQ.isLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
              ) : runs.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {locale === "ar"
                    ? "لا توجد تشغيلات بعد. اختر وكيلاً وابدأ التشغيل لإنشاء سجل أداء حقيقي."
                    : "No runs yet. Start an agent above to populate the production execution timeline."}
                </div>
              ) : (
                runs.map((r) => {
                  const agent = agentById[r.agent_id];
                  const Icon = iconFor(agent?.metadata.category);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRunDetail(r)}
                      className="flex w-full items-start gap-3 p-3 text-start transition hover:bg-primary/5"
                    >
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{agent?.name ?? r.agent_id}</span>
                          <StatusBadge status={r.status} />
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(r.started_at).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            · {formatDuration(r.started_at, r.finished_at)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">· {r.steps} steps</span>
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {r.error ? <span className="text-red-300">{r.error}</span> : r.summary ?? "—"}
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground/70">
                          {locale === "ar" ? "معرّف" : "id"}: <code>{r.id.slice(0, 8)}</code>
                        </div>
                      </div>
                      <Eye className="mt-2 h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Run dialog */}
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
                    ? "اكتب الهدف الذي تريد من الوكيل تنفيذه الآن…"
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
                runM.mutate({ agentId: selected.id, goalOverride: goalOverride.trim() })
              }
            >
              {runM.isPending ? (
                <Loader2 className="me-1 h-4 w-4 animate-spin" />
              ) : (
                <Play className="me-1 h-4 w-4" />
              )}
              {locale === "ar" ? "تشغيل الوكيل" : "Run agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run detail dialog */}
      <Dialog open={!!runDetail} onOpenChange={(o) => !o && setRunDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {runDetail && <StatusBadge status={runDetail.status} />}
              <span>
                {runDetail ? agentById[runDetail.agent_id]?.name ?? runDetail.agent_id : ""}
              </span>
            </DialogTitle>
            <DialogDescription className="font-mono text-[10px]">
              {runDetail?.id}
            </DialogDescription>
          </DialogHeader>
          {runDetail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Meta label={locale === "ar" ? "بدأ" : "Started"} value={new Date(runDetail.started_at).toLocaleString()} />
                <Meta
                  label={locale === "ar" ? "انتهى" : "Finished"}
                  value={runDetail.finished_at ? new Date(runDetail.finished_at).toLocaleString() : "—"}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="flex items-center gap-3 border-primary/15 bg-card/60 p-3 backdrop-blur">
      <div className="rounded-lg border border-primary/30 bg-primary/10 p-2">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </Card>
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

// Unused icons retained for tree-shaking parity with original page.
void Wrench;
void Code2;
void Boxes;
