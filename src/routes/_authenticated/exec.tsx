import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  listToolRegistry,
  listToolExecutions,
  listWorkflows,
  listWorkflowRuns,
  listRecentEvents,
  runTool,
  approveToolExecution,
  triggerWorkflowFn,
} from "@/lib/exec.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, ShieldAlert, CheckCircle2, XCircle, Clock, Workflow } from "lucide-react";
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
  const [selected, setSelected] = useState<ToolRow | null>(null);
  const [inputText, setInputText] = useState("{}");

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

  const runFn = useServerFn(runTool);
  const approveFn = useServerFn(approveToolExecution);
  const triggerFn = useServerFn(triggerWorkflowFn);

  const runMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a tool first");
      let parsed: unknown;
      try {
        parsed = JSON.parse(inputText);
      } catch {
        throw new Error("Input is not valid JSON");
      }
      return runFn({ data: { toolId: selected.id, input: parsed } });
    },
    onSuccess: (res: Record<string, unknown>) => {
      toast.success(`Execution ${String(res.status ?? "")}`);
      void execs.refetch();
      void events.refetch();
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

  const triggerMut = useMutation({
    mutationFn: (id: string) => triggerFn({ data: { workflowId: id } }),
    onSuccess: (res: Record<string, unknown>) => {
      toast.success(`Workflow ${String(res.status ?? "")}`);
      void runs.refetch();
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
                        onClick={() => {
                          setSelected(t);
                          setInputText(
                            JSON.stringify(
                              (t.schema_json as { properties?: object })?.properties
                                ? {}
                                : {},
                              null,
                              2,
                            ),
                          );
                        }}
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

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">
                Run {selected ? selected.name : "—"}
              </h3>
              {selected ? (
                <>
                  <div className="text-xs text-muted-foreground">
                    Input JSON (validated against the tool schema):
                  </div>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={10}
                    className="font-mono text-xs"
                  />
                  <Button
                    disabled={!selected.enabled || runMut.isPending}
                    onClick={() => runMut.mutate()}
                    className="w-full gap-2"
                  >
                    <Play className="size-4" />
                    {runMut.isPending ? "Running…" : "Execute"}
                  </Button>
                  {selected.requires_approval && (
                    <p className="text-xs text-amber-300">
                      This tool requires admin approval before execution.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick a tool from the left to configure & run.
                </p>
              )}
            </Card>
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
                  <li className="text-sm text-muted-foreground p-4 text-center">
                    No executions yet.
                  </li>
                )}
              </ul>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-3">
              <h3 className="font-semibold text-sm mb-2">Definitions</h3>
              <ul className="space-y-2">
                {(wfs.data ?? []).map((w: { id: string; name: string; enabled: boolean }) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                  >
                    <div>
                      <div className="text-sm font-medium">{w.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {w.id.slice(0, 8)}…
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!w.enabled || triggerMut.isPending}
                      onClick={() => triggerMut.mutate(w.id)}
                      className="gap-1"
                    >
                      <Workflow className="size-3" />
                      Trigger
                    </Button>
                  </li>
                ))}
                {!wfs.data?.length && (
                  <li className="text-sm text-muted-foreground text-center p-4">
                    No workflows defined yet. Create one via the API.
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
                      <li
                        key={r.id}
                        className="p-3 rounded-md border space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs">
                            {r.workflow_id.slice(0, 8)}…
                          </span>
                          {statusBadge(r.status)}
                        </div>
                        {r.current_step && (
                          <div className="text-xs text-muted-foreground">
                            step: {r.current_step}
                          </div>
                        )}
                        {r.error && (
                          <div className="text-xs text-red-300">{r.error}</div>
                        )}
                      </li>
                    ),
                  )}
                </ul>
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card className="p-3">
            <ScrollArea className="h-[60vh]">
              <ul className="space-y-1">
                {(events.data ?? []).map(
                  (ev: {
                    id: string;
                    topic: string;
                    source: string;
                    status: string;
                    occurred_at: string;
                    payload_json: unknown;
                  }) => (
                    <li
                      key={ev.id}
                      className="text-xs p-2 rounded border font-mono flex items-center gap-2"
                    >
                      <span className="text-muted-foreground">
                        {new Date(ev.occurred_at).toLocaleTimeString()}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {ev.source}
                      </Badge>
                      <span className="text-cyan-300">{ev.topic}</span>
                    </li>
                  ),
                )}
              </ul>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
