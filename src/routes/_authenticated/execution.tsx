// Execution Center — live timeline of tool + agent executions.
// Subscribes to tool_executions, agent_runs and workflow_runs in realtime.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RotateCcw,
  ListChecks,
} from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LiveStatus } from "@/components/state/LiveStatus";
import { useLiveRows, fmtRel, fmtDuration } from "@/lib/runtime/useLiveRows";
import { rollbackToolExecution } from "@/lib/exec.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/execution")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: ExecutionRuntime,
});

type ToolExec = {
  id: string;
  tool_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  error: string | null;
  correlation_id: string | null;
  created_at: string;
};
type AgentRun = {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  summary: string | null;
};
type WfRun = {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
};

type Unified = {
  id: string;
  kind: "tool" | "agent" | "workflow";
  ref: string;
  status: string;
  started: string | null;
  finished: string | null;
  error: string | null;
  durationMs: number | null;
};

const STATUS_BUCKETS = ["queued", "running", "completed", "failed", "cancelled"] as const;

function mapBucket(s: string): (typeof STATUS_BUCKETS)[number] {
  if (s === "pending" || s === "queued") return "queued";
  if (s === "running" || s === "approved") return "running";
  if (s === "succeeded" || s === "completed") return "completed";
  if (s === "failed" || s === "error" || s === "timeout") return "failed";
  if (s === "cancelled" || s === "rejected") return "cancelled";
  return "running";
}

function ExecutionRuntime() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const { rows: tools, loading: l1 } = useLiveRows<ToolExec>("tool_executions", (q) =>
    q
      .select(
        "id,tool_id,status,started_at,finished_at,duration_ms,error,correlation_id,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(80),
  );
  const { rows: agents, loading: l2 } = useLiveRows<AgentRun>("agent_runs", (q) =>
    q
      .select("id,agent_id,status,started_at,finished_at,error,summary")
      .order("started_at", { ascending: false })
      .limit(60),
  );
  const { rows: wfs, loading: l3 } = useLiveRows<WfRun>("workflow_runs", (q) =>
    q
      .select("id,workflow_id,status,started_at,finished_at,error")
      .order("started_at", { ascending: false })
      .limit(60),
  );

  const unified: Unified[] = useMemo(() => {
    const a: Unified[] = tools.map((t) => ({
      id: t.id,
      kind: "tool",
      ref: t.tool_id,
      status: t.status,
      started: t.started_at ?? t.created_at,
      finished: t.finished_at,
      error: t.error,
      durationMs: t.duration_ms,
    }));
    const b: Unified[] = agents.map((r) => ({
      id: r.id,
      kind: "agent",
      ref: r.agent_id,
      status: r.status,
      started: r.started_at,
      finished: r.finished_at,
      error: r.error,
      durationMs: null,
    }));
    const c: Unified[] = wfs.map((r) => ({
      id: r.id,
      kind: "workflow",
      ref: r.workflow_id,
      status: r.status,
      started: r.started_at,
      finished: r.finished_at,
      error: r.error,
      durationMs: null,
    }));
    return [...a, ...b, ...c].sort(
      (x, y) => new Date(y.started ?? 0).getTime() - new Date(x.started ?? 0).getTime(),
    );
  }, [tools, agents, wfs]);

  const buckets = useMemo(() => {
    const m = Object.fromEntries(STATUS_BUCKETS.map((s) => [s, 0])) as Record<string, number>;
    for (const u of unified) m[mapBucket(u.status)] = (m[mapBucket(u.status)] ?? 0) + 1;
    return m;
  }, [unified]);

  const initializing = l1 && l2 && l3;

  return (
    <Section>
      <PageHeader
        icon={Activity}
        title={ar ? "مركز التنفيذ الحي" : "Live Execution Center"}
        subtitle={
          ar
            ? "خط زمني موحد للأدوات والوكلاء والسير. تحديث فوري."
            : "Unified timeline across tools, agents, and workflows. Realtime."
        }
        badge={ar ? "مباشر" : "Streaming"}
      />

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {STATUS_BUCKETS.map((s) => (
          <Card key={s} className="p-3 glass-card">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{buckets[s] ?? 0}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 glass-card">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="h-4 w-4 text-cyan-400" />{" "}
            {ar ? "الخط الزمني" : "Execution Timeline"}
          </div>
          <Badge variant="outline">{unified.length}</Badge>
        </div>
        {initializing ? (
          <LiveStatus variant="initializing" />
        ) : unified.length === 0 ? (
          <LiveStatus
            variant="monitoring"
            label={ar ? "بانتظار التنفيذات..." : "Waiting for executions..."}
          />
        ) : (
          <ScrollArea className="h-[600px] pr-2">
            <div className="space-y-2">
              {unified.map((u) => (
                <ExecRow key={`${u.kind}:${u.id}`} u={u} ar={ar} />
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </Section>
  );
}

function ExecRow({ u, ar }: { u: Unified; ar: boolean }) {
  const bucket = mapBucket(u.status);
  const Icon =
    bucket === "failed"
      ? AlertTriangle
      : bucket === "completed"
        ? CheckCircle2
        : bucket === "running"
          ? Loader2
          : Activity;
  const iconColor =
    bucket === "failed"
      ? "text-rose-400"
      : bucket === "completed"
        ? "text-emerald-400"
        : bucket === "running"
          ? "animate-spin text-cyan-400"
          : "text-muted-foreground";

  const rollback = useServerFn(rollbackToolExecution);
  const onRollback = async () => {
    try {
      await rollback({ data: { executionId: u.id } });
      toast.success(ar ? "تم الاسترجاع" : "Rolled back");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase">
                {u.kind}
              </Badge>
              <span className="truncate text-sm font-medium">{u.ref}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {fmtRel(u.started)} · {fmtDuration(u.started, u.finished)}
              {u.durationMs != null && <> · {Math.round(u.durationMs)}ms</>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={
              bucket === "failed" ? "destructive" : bucket === "completed" ? "default" : "secondary"
            }
          >
            {u.status}
          </Badge>
          {u.kind === "tool" && bucket === "completed" && (
            <Button size="sm" variant="ghost" onClick={onRollback}>
              <RotateCcw className="h-3 w-3" />
              <span className="ms-1">{ar ? "استرجاع" : "Rollback"}</span>
            </Button>
          )}
        </div>
      </div>
      {u.error && <div className="mt-1 truncate text-[11px] text-rose-300">{u.error}</div>}
    </div>
  );
}
