import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  listToolRegistry,
  listToolExecutions,
  listWorkflows,
  listWorkflowRuns,
  listRecentEvents,
  
  approveToolExecution,
  rollbackToolExecution,
  triggerWorkflowWithDefaultsFn,
  triggerAllWorkflowsFn,
  listAgents,
  listAgentRuns,
  runAgentFn,
} from "@/lib/exec.functions";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowRunDetail } from "@/components/exec/workflow-run-detail";
import { EventTimeline } from "@/components/events/EventTimeline";
import { LiveStatus } from "@/components/state/LiveStatus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ToolRunner } from "@/components/runtime/ToolRunner";
import type { JsonSchema } from "@/components/runtime/JsonSchemaForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, ShieldAlert, CheckCircle2, XCircle, Clock, Workflow, Bot, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/exec")({
  component: ExecConsole,
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

type ToolRow = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  permissions: string[];
  requires_approval: boolean;
  enabled: boolean;
  schema_json: Record<string, unknown>;
};

type ExecRow = {
  id: string;
  tool_id: string;
  status: string;
  duration_ms: number | null;
  error: string | null;
  input_json: unknown;
  output_json: unknown;
  created_at: string;
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    succeeded: { label: status, cls: "bg-emerald-500/20 text-emerald-300" },
    failed: { label: status, cls: "bg-red-500/20 text-red-300" },
    running: { label: status, cls: "bg-cyan-500/20 text-cyan-300 animate-pulse" },
    queued: { label: status, cls: "bg-slate-500/20 text-slate-300" },
    pending_approval: { label: status, cls: "bg-amber-500/20 text-amber-300" },
    rejected: { label: status, cls: "bg-zinc-500/20 text-zinc-300" },
    rolled_back: { label: status, cls: "bg-orange-500/20 text-orange-300" },
    waiting_approval: { label: status, cls: "bg-amber-500/20 text-amber-300" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-slate-500/20" };
  return <Badge className={cfg.cls}>{cfg.label}</Badge>;
}

function ExecConsole() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<ToolRow | null>(null);
  
  const [openRunId, setOpenRunId] = useState<string | null>(null);

  // Realtime: invalidate queries on workflow_runs / tool_executions changes.
  // Unique channel topic + try/catch so the page never crashes if realtime
  // is unavailable or the channel is recreated.
  useEffect(() => {
    const topic = `exec-console:${Math.random().toString(36).slice(2, 10)}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ch: any = null;
    try {
      ch = supabase.channel(topic);
      ch.on("postgres_changes", { event: "*", schema: "public", table: "workflow_runs" },
        () => void qc.invalidateQueries({ queryKey: ["exec", "runs"] }));
      ch.on("postgres_changes", { event: "*", schema: "public", table: "tool_executions" },
        () => void qc.invalidateQueries({ queryKey: ["exec", "execs"] }));
      ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "enterprise_events" },
        () => void qc.invalidateQueries({ queryKey: ["exec", "events"] }));
      ch.subscribe();
    } catch (err) {
      console.warn("[exec] realtime unavailable", err);
    }
    return () => {
      if (ch) { try { void supabase.removeChannel(ch); } catch { /* noop */ } }
    };
  }, [qc]);


  const tools = useQuery({
    queryKey: ["exec", "tools"],
    queryFn: () => listToolRegistry(),
  });
  const execs = useQuery({
    queryKey: ["exec", "execs"],
    queryFn: () => listToolExecutions(),
    refetchInterval: 5000,
  });
  const wfs = useQuery({
    queryKey: ["exec", "workflows"],
    queryFn: () => listWorkflows(),
  });
  const runs = useQuery({
    queryKey: ["exec", "runs"],
    queryFn: () => listWorkflowRuns(),
    refetchInterval: 5000,
  });
  const events = useQuery({
    queryKey: ["exec", "events"],
    queryFn: () => listRecentEvents(),
    refetchInterval: 5000,
  });
  const agents = useQuery({
    queryKey: ["exec", "agents"],
    queryFn: () => listAgents(),
  });
  const agentRuns = useQuery({
    queryKey: ["exec", "agentRuns"],
    queryFn: () => listAgentRuns(),
    refetchInterval: 5000,
  });

  
  const approveFn = useServerFn(approveToolExecution);
  const rollbackFn = useServerFn(rollbackToolExecution);
  
  const runAgentSF = useServerFn(runAgentFn);


  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentGoal, setAgentGoal] = useState("");

  const runAgentMut = useMutation({
    mutationFn: async () => {
      if (!selectedAgentId) throw new Error("Select an agent first");
      return runAgentSF({
        data: {
          agentId: selectedAgentId,
          goalOverride: agentGoal.trim() || undefined,
        },
      });
    },
    onSuccess: (res: unknown) => {
      const r = res as { status?: string; steps?: number };
      toast.success(`Agent ${String(r.status ?? "")} (${r.steps ?? 0} steps)`);
      void agentRuns.refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });


  const approveMut = useMutation({
    mutationFn: (vars: { id: string; decision: "approve" | "reject" }) =>
      approveFn({ data: { executionId: vars.id, decision: vars.decision } }),
    onSuccess: () => {
      void execs.refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rollbackMut = useMutation({
    mutationFn: (id: string) => rollbackFn({ data: { executionId: id } }),
    onSuccess: () => {
      toast.success("Execution rolled back");
      void execs.refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });


  const triggerWithDefaultsSF = useServerFn(triggerWorkflowWithDefaultsFn);
  const triggerAllSF = useServerFn(triggerAllWorkflowsFn);

  const triggerMut = useMutation({
    mutationFn: (id: string) => triggerWithDefaultsSF({ data: { workflowId: id } }),
    onSuccess: (res: unknown) => {
      const r = res as { status?: string };
      toast.success(`Workflow ${String(r.status ?? "started")}`);
      void runs.refetch();
      void events.refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const triggerAllMut = useMutation({
    mutationFn: () => triggerAllSF({ data: undefined as never }),
    onSuccess: (res: unknown) => {
      const r = res as { total?: number };
      toast.success(`Dispatched ${r.total ?? 0} workflows`);
      void runs.refetch();
      void events.refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            مركز التنفيذ المؤسسي
          </h1>
          <p className="text-sm text-muted-foreground">
            Enterprise Execution Console — tools, workflows, events
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </Badge>
      </header>

      <Tabs defaultValue="tools" className="w-full">
        <TabsList>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="tools">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-3">
              <ScrollArea className="h-[60vh]">
                <ul className="space-y-2">
                  {(tools.data ?? []).map((t: ToolRow) => (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelected(t)}
                        className={`w-full text-start p-3 rounded-md border transition ${
                          selected?.id === t.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{t.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {t.id}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {t.category}
                            </Badge>
                            {!t.enabled && (
                              <Badge variant="outline" className="text-xs">
                                disabled
                              </Badge>
                            )}
                            {t.requires_approval && (
                              <Badge className="bg-amber-500/20 text-amber-300 text-xs">
                                <ShieldAlert className="size-3 mr-1" />
                                approval
                              </Badge>
                            )}
                          </div>
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.description}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </Card>

            {selected ? (
              <ToolRunner
                toolId={selected.id}
                toolName={selected.name}
                schema={selected.schema_json as JsonSchema | null | undefined}
                requiresApproval={selected.requires_approval}
                enabled={selected.enabled}
                onCompleted={() => {
                  void execs.refetch();
                  void events.refetch();
                }}
              />
            ) : (
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">
                  Pick a tool from the left to configure & run.
                </p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="executions">
          <Card className="p-3">
            <ScrollArea className="h-[60vh]">
              <ul className="space-y-2">
                {(execs.data ?? []).map((e: ExecRow) => (
                  <li
                    key={e.id}
                    className="p-3 rounded-md border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {e.status === "succeeded" && (
                          <CheckCircle2 className="size-4 text-emerald-400" />
                        )}
                        {e.status === "failed" && (
                          <XCircle className="size-4 text-red-400" />
                        )}
                        {(e.status === "running" ||
                          e.status === "queued" ||
                          e.status === "pending_approval") && (
                          <Clock className="size-4 text-cyan-400" />
                        )}
                        <span className="font-mono text-xs">{e.tool_id}</span>
                        {statusBadge(e.status)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {e.duration_ms ? `${e.duration_ms}ms` : ""}
                      </span>
                    </div>
                    {e.error && (
                      <p className="text-xs text-red-300">{e.error}</p>
                    )}
                    {e.status === "pending_approval" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            approveMut.mutate({ id: e.id, decision: "approve" })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            approveMut.mutate({ id: e.id, decision: "reject" })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {e.status === "succeeded" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-orange-300"
                        disabled={rollbackMut.isPending}
                        onClick={() => rollbackMut.mutate(e.id)}
                      >
                        <RotateCcw className="size-3" />
                        Rollback
                      </Button>
                    )}

                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        I/O
                      </summary>
                      <pre className="mt-1 p-2 bg-muted rounded overflow-auto max-h-40">
                        {JSON.stringify(
                          { in: e.input_json, out: e.output_json },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </li>
                ))}
                {!execs.data?.length && (
                  <li className="p-4 text-center">
                    <LiveStatus variant="monitoring" hint="Tool runtime online · awaiting executions" size="sm" />
                  </li>
                )}
              </ul>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="font-semibold text-sm">
                  Definitions
                  {(wfs.data as unknown[] | undefined)?.length ? (
                    <span className="text-xs text-muted-foreground font-normal ms-2">
                      ({(wfs.data as unknown[]).length})
                    </span>
                  ) : null}
                </h3>
                <Button
                  size="sm"
                  variant="default"
                  disabled={!(wfs.data as unknown[] | undefined)?.length || triggerAllMut.isPending}
                  onClick={() => triggerAllMut.mutate()}
                  className="gap-1"
                >
                  <Play className="size-3" />
                  {triggerAllMut.isPending ? "Dispatching…" : "Run all"}
                </Button>
              </div>
              <ul className="space-y-2">
                {(wfs.data ?? []).map((w: { id: string; name: string; enabled: boolean; trigger_topic?: string | null }) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{w.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {w.trigger_topic ?? "manual"} · {w.id.slice(0, 8)}…
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!w.enabled || triggerMut.isPending}
                      onClick={() => triggerMut.mutate(w.id)}
                      className="gap-1 shrink-0"
                    >
                      <Workflow className="size-3" />
                      Trigger
                    </Button>
                  </li>
                ))}
                {wfs.isLoading && !(wfs.data as unknown[] | undefined)?.length && (
                  <li className="text-center p-4">
                    <LiveStatus variant="initializing" hint="Workflow registry loading" size="sm" />
                  </li>
                )}
                {!wfs.isLoading && !(wfs.data as unknown[] | undefined)?.length && (
                  <li className="text-center p-4 text-xs text-muted-foreground">
                    No workflows defined yet.
                  </li>
                )}
              </ul>
            </Card>



            <Card className="p-3">
              <h3 className="font-semibold text-sm mb-2">Recent runs</h3>
              <ScrollArea className="h-[55vh]">
                <ul className="space-y-2">
                  {(runs.data ?? []).map(
                    (r: {
                      id: string;
                      workflow_id: string;
                      status: string;
                      current_step: string | null;
                      started_at: string;
                      error: string | null;
                    }) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setOpenRunId(r.id)}
                          className="w-full text-start p-3 rounded-md border space-y-1 hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs">
                              {r.workflow_id.slice(0, 8)}…
                            </span>
                            {statusBadge(r.status)}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {new Date(r.started_at).toLocaleString()}
                          </div>
                          {r.current_step && (
                            <div className="text-xs text-muted-foreground">
                              step: {r.current_step}
                            </div>
                          )}
                          {r.error && (
                            <div className="text-xs text-red-300 line-clamp-2">
                              {r.error}
                            </div>
                          )}
                        </button>
                      </li>
                    ),
                  )}
                  {!runs.data?.length && (
                    <li className="text-center p-4">
                      <LiveStatus variant="monitoring" hint="Scheduler online · awaiting first run" size="sm" />
                    </li>
                  )}
                </ul>
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="agents">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-3">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Bot className="size-4" /> Agent definitions
              </h3>
              <ul className="space-y-2">
                {(agents.data ?? []).map(
                  (a: {
                    id: string;
                    name: string;
                    goal: string;
                    model: string | null;
                    tool_allowlist: string[] | null;
                    enabled: boolean;
                  }) => (
                    <li key={a.id}>
                      <button
                        onClick={() => setSelectedAgentId(a.id)}
                        className={`w-full text-start p-3 rounded-md border transition ${
                          selectedAgentId === a.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{a.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {a.id}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {a.model ?? "default"}
                            </Badge>
                            {!a.enabled && (
                              <Badge variant="outline" className="text-xs">
                                disabled
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {a.goal}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(a.tool_allowlist ?? []).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/50"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </button>
                    </li>
                  ),
                )}
                {!agents.data?.length && (
                  <li className="text-center p-4">
                    <LiveStatus variant="initializing" hint="Agent registry loading" size="sm" />
                  </li>
                )}
              </ul>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="size-4" /> Run agent
              </h3>
              {selectedAgentId ? (
                <>
                  <div className="text-xs text-muted-foreground">
                    Optional goal override (leave empty to use the agent's default mission):
                  </div>
                  <Textarea
                    value={agentGoal}
                    onChange={(e) => setAgentGoal(e.target.value)}
                    rows={6}
                    placeholder="e.g. Review last 24h incidents in Jeddah and propose response actions."
                    className="text-xs"
                  />
                  <Button
                    disabled={runAgentMut.isPending}
                    onClick={() => runAgentMut.mutate()}
                    className="w-full gap-2"
                  >
                    <Play className="size-4" />
                    {runAgentMut.isPending ? "Running…" : "Run agent"}
                  </Button>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Select an agent to run.
                </div>
              )}
            </Card>

            <Card className="lg:col-span-3 p-3">
              <h3 className="font-semibold text-sm mb-2">Recent agent runs</h3>
              <ScrollArea className="h-[40vh]">
                <ul className="space-y-2">
                  {(agentRuns.data ?? []).map(
                    (r: {
                      id: string;
                      agent_id: string;
                      status: string;
                      summary: string | null;
                      steps: number | null;
                      error: string | null;
                      started_at: string;
                      goal_override: string | null;
                    }) => (
                      <li
                        key={r.id}
                        className="p-3 rounded-md border space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Bot className="size-3 text-cyan-300" />
                            <span className="text-xs font-medium">
                              {r.agent_id}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(r.started_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {r.steps ?? 0} steps
                            </Badge>
                            {statusBadge(r.status)}
                          </div>
                        </div>
                        {r.goal_override && (
                          <div className="text-[11px] text-muted-foreground italic">
                            goal: {r.goal_override}
                          </div>
                        )}
                        {r.summary && (
                          <p className="text-xs whitespace-pre-wrap">
                            {r.summary}
                          </p>
                        )}
                        {r.error && (
                          <div className="text-xs text-red-300">{r.error}</div>
                        )}
                      </li>
                    ),
                  )}
                  {!agentRuns.data?.length && (
                    <li className="text-sm text-muted-foreground text-center p-4">
                      No agent runs yet.
                    </li>
                  )}
                </ul>
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <EventTimeline title="Enterprise Event Stream" height="h-[60vh]" filter={{ limit: 200 }} />
        </TabsContent>
      </Tabs>
      <WorkflowRunDetail
        runId={openRunId}
        open={!!openRunId}
        onOpenChange={(v) => !v && setOpenRunId(null)}
      />
    </div>
  );
}

