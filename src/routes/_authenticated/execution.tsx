import { RouteError, RouteNotFound } from "@/components/route-boundaries";
// Execution Center — live timeline of tool + agent executions.
// Subscribes to tool_executions, agent_runs and workflow_runs in realtime.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  HelpCircle,
  Loader2,
  OctagonAlert,
  RotateCcw,
  ListChecks,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LiveStatus } from "@/components/state/LiveStatus";
import { RunStatusBadge } from "@/components/exec/RunStatusBadge";
import { useLiveRows, fmtRel, fmtDuration } from "@/lib/runtime/useLiveRows";
import {
  RUN_BUCKET_LABELS,
  RUN_STATUS_BUCKETS,
  runStatusBucket,
  type RunStatusBucket,
} from "@/lib/exec/run-status-labels";
import { rollbackToolExecution } from "@/lib/exec.functions";
import { toast } from "sonner";
import { userFacingError } from "@/lib/errors/user-facing-error";

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

/**
 * الأحواض من الخريطة الواحدة (UI-3): «بانتظار الاعتماد» حوضٌ مستقلّ،
 * وانقضاء المهلة/الاستبدال/الرفض مع «أُلغي»، و«استُرجع» حوضه، والمجهول
 * «غير معروف» — لا «قيد التشغيل» بأيقونة دوّارة.
 */
const STATUS_BUCKETS = RUN_STATUS_BUCKETS;
const mapBucket = runStatusBucket;

/** شكلٌ لكل حوض لا لونٌ وحده: مثمّن للفشل، مثلث للانتظار، دائرة للاكتمال. */
const BUCKET_ICON: Record<RunStatusBucket, { Icon: typeof Activity; cls: string }> = {
  queued: { Icon: Activity, cls: "text-muted-foreground" },
  running: { Icon: Loader2, cls: "motion-safe:animate-spin text-cyan-400" },
  awaiting_approval: { Icon: AlertTriangle, cls: "text-amber-500 dark:text-amber-400" },
  completed: { Icon: CheckCircle2, cls: "text-emerald-500 dark:text-emerald-400" },
  failed: { Icon: OctagonAlert, cls: "text-red-500 dark:text-red-400" },
  cancelled: { Icon: Ban, cls: "text-zinc-400" },
  rolled_back: { Icon: RotateCcw, cls: "text-orange-500 dark:text-orange-400" },
  unknown: { Icon: HelpCircle, cls: "text-muted-foreground" },
};

function ExecutionRuntime() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const {
    rows: tools,
    loading: l1,
    error: e1,
    refetch: r1,
  } = useLiveRows<ToolExec>("tool_executions", (q) =>
    q
      .select(
        "id,tool_id,status,started_at,finished_at,duration_ms,error,correlation_id,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(80),
  );
  const {
    rows: agents,
    loading: l2,
    error: e2,
    refetch: r2,
  } = useLiveRows<AgentRun>("agent_runs", (q) =>
    q
      .select("id,agent_id,status,started_at,finished_at,error,summary")
      .order("started_at", { ascending: false })
      .limit(60),
  );
  const {
    rows: wfs,
    loading: l3,
    error: e3,
    refetch: r3,
  } = useLiveRows<WfRun>("workflow_runs", (q) =>
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
  const loadingAny = l1 || l2 || l3;
  const errors = [e1, e2, e3].filter((e): e is Error => !!e);
  const failedSources = [e1 && "tool_executions", e2 && "agent_runs", e3 && "workflow_runs"].filter(
    Boolean,
  ) as string[];
  const retryAll = () => {
    r1();
    r2();
    r3();
  };

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

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
        {STATUS_BUCKETS.map((s) => {
          const { Icon, cls } = BUCKET_ICON[s];
          return (
            <Card key={s} className="p-3 glass-card" data-bucket={s}>
              <div className="flex items-center gap-1.5 text-[12px] tracking-wide text-muted-foreground">
                <Icon aria-hidden className={`h-3.5 w-3.5 shrink-0 ${cls}`} />
                <span>{ar ? RUN_BUCKET_LABELS[s].ar : RUN_BUCKET_LABELS[s].en}</span>
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">{buckets[s] ?? 0}</div>
            </Card>
          );
        })}
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
        ) : errors.length > 0 && unified.length === 0 ? (
          /* UI-4: خطأ القراءة (رفض RLS، مهلة) حالةٌ صادقة بإعادة محاولة — لا «بانتظار التنفيذات…». */
          <div
            dir="rtl"
            role="alert"
            className="flex flex-col items-center gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-8 text-center"
          >
            <XCircle aria-hidden className="size-8 text-red-500/70" />
            <p className="text-sm font-medium">تعذّر تحميل الخط الزمني</p>
            <p className="text-xs text-muted-foreground">
              {userFacingError(errors[0])}
              {failedSources.length > 0 && (
                <>
                  {" "}
                  — المصادر: <code dir="ltr">{failedSources.join(", ")}</code>
                </>
              )}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px]"
              onClick={retryAll}
              disabled={loadingAny}
            >
              إعادة المحاولة
            </Button>
          </div>
        ) : unified.length === 0 ? (
          <LiveStatus
            variant="monitoring"
            label={ar ? "لا تنفيذات بعد — المراقبة مستمرة." : "No executions yet — monitoring."}
          />
        ) : (
          <>
            {errors.length > 0 && (
              <div
                dir="rtl"
                role="status"
                className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[12px] text-amber-700 dark:text-amber-300"
              >
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle aria-hidden className="size-3.5" />
                  تعذّرت قراءة بعض المصادر (<code dir="ltr">{failedSources.join(", ")}</code>) —
                  المعروض ناقص.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={retryAll}
                  disabled={loadingAny}
                >
                  إعادة المحاولة
                </Button>
              </div>
            )}
            <ScrollArea className="h-[600px] pr-2">
              <div className="space-y-2">
                {unified.map((u) => (
                  <ExecRow key={`${u.kind}:${u.id}`} u={u} ar={ar} />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </Card>
    </Section>
  );
}

function ExecRow({ u, ar }: { u: Unified; ar: boolean }) {
  const bucket = mapBucket(u.status);
  const { Icon, cls: iconColor } = BUCKET_ICON[bucket];

  const rollback = useServerFn(rollbackToolExecution);
  const onRollback = async () => {
    try {
      await rollback({ data: { executionId: u.id } });
      toast.success(ar ? "تم الاسترجاع" : "Rolled back");
    } catch (e) {
      toast.error(userFacingError(e));
    }
  };

  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3" data-bucket={bucket}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon aria-hidden className={`h-4 w-4 shrink-0 ${iconColor}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[12px] uppercase">
                {u.kind}
              </Badge>
              <span className="truncate text-sm font-medium">{u.ref}</span>
            </div>
            <div className="text-[12px] text-muted-foreground">
              {fmtRel(u.started)} · {fmtDuration(u.started, u.finished)}
              {u.durationMs != null && <> · {Math.round(u.durationMs)}ms</>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <RunStatusBadge status={u.status} locale={ar ? "ar" : "en"} />
          {u.kind === "tool" && bucket === "completed" && (
            <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={onRollback}>
              <RotateCcw className="h-3 w-3" />
              <span className="ms-1">{ar ? "استرجاع" : "Rollback"}</span>
            </Button>
          )}
        </div>
      </div>
      {u.error && <div className="mt-1 truncate text-[12px] text-rose-300">{u.error}</div>}
    </div>
  );
}
