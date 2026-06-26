// Tools registry — live status with schema-driven execution. No raw JSON.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Wrench, Play, Loader2, ShieldCheck, Activity, CheckCircle2, AlertTriangle, Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Section } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LiveStatus } from "@/components/state/LiveStatus";
import { useLiveRows, fmtRel } from "@/lib/runtime/useLiveRows";
import { listToolRegistry } from "@/lib/exec.functions";
import { ToolRunner } from "@/components/runtime/ToolRunner";
import type { JsonSchema } from "@/components/runtime/JsonSchemaForm";

export const Route = createFileRoute("/_authenticated/tools")({
  component: ToolsRuntime,
});

type Tool = { id: string; category: string; name: string; description: string | null; permissions: string[] | null; requires_approval: boolean; enabled: boolean; schema_json: unknown };
type ToolExec = { id: string; tool_id: string; status: string; started_at: string | null; finished_at: string | null; duration_ms: number | null; error: string | null; created_at: string };

function ToolsRuntime() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const fetchRegistry = useServerFn(listToolRegistry);
  const { data: tools, isLoading } = useQuery({
    queryKey: ["tools-registry"],
    queryFn: () => fetchRegistry(),
    refetchInterval: 30_000,
  });

  const { rows: execs } = useLiveRows<ToolExec>(
    "tool_executions",
    (q) => q.select("id,tool_id,status,started_at,finished_at,duration_ms,error,created_at").order("created_at", { ascending: false }).limit(120),
  );

  const byTool = useMemo(() => {
    const m = new Map<string, ToolExec[]>();
    for (const e of execs) {
      const arr = m.get(e.tool_id) ?? [];
      arr.push(e);
      m.set(e.tool_id, arr);
    }
    return m;
  }, [execs]);

  const grouped = useMemo(() => {
    const m = new Map<string, Tool[]>();
    for (const t of (tools as Tool[] | undefined) ?? []) {
      const arr = m.get(t.category) ?? [];
      arr.push(t);
      m.set(t.category, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [tools]);

  const totals = useMemo(() => {
    const all = (tools as Tool[] | undefined) ?? [];
    return {
      total: all.length,
      enabled: all.filter((t) => t.enabled).length,
      running: execs.filter((e) => e.status === "running" || e.status === "pending").length,
      failed24h: execs.filter((e) => e.status === "failed" && Date.now() - new Date(e.created_at).getTime() < 86_400_000).length,
    };
  }, [tools, execs]);

  return (
    <Section>
      <PageHeader
        icon={Wrench}
        title={ar ? "سجل الأدوات التشغيلية" : "Operational Tool Registry"}
        subtitle={ar ? "كل أداة قابلة للتنفيذ مع صحة وحالة طابور حية." : "Every tool executable with live health and queue status."}
        badge={ar ? "حي" : "Live"}
      />

      <div className="grid gap-2 sm:grid-cols-4">
        <Card className="p-3 glass-card"><div className="text-[10px] uppercase text-muted-foreground">{ar ? "إجمالي" : "Total"}</div><div className="text-2xl font-bold">{totals.total}</div></Card>
        <Card className="p-3 glass-card"><div className="text-[10px] uppercase text-muted-foreground">{ar ? "مفعّل" : "Enabled"}</div><div className="text-2xl font-bold text-emerald-300">{totals.enabled}</div></Card>
        <Card className="p-3 glass-card"><div className="text-[10px] uppercase text-muted-foreground">{ar ? "نشِط الآن" : "Running"}</div><div className="text-2xl font-bold text-cyan-300">{totals.running}</div></Card>
        <Card className="p-3 glass-card"><div className="text-[10px] uppercase text-muted-foreground">{ar ? "فشل (24س)" : "Failed (24h)"}</div><div className="text-2xl font-bold text-rose-300">{totals.failed24h}</div></Card>
      </div>

      {isLoading ? (
        <Card className="p-6 glass-card"><LiveStatus variant="initializing" label={ar ? "تحميل السجل..." : "Loading registry..."} /></Card>
      ) : grouped.length === 0 ? (
        <Card className="p-6 glass-card"><LiveStatus variant="monitoring" label={ar ? "بانتظار تسجيل الأدوات..." : "Awaiting tool registration..."} /></Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([category, items]) => (
            <Card key={category} className="p-4 glass-card">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold capitalize">{category}</div>
                <Badge variant="outline">{items.length}</Badge>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {items.map((t) => (
                  <ToolCard key={t.id} tool={t} history={byTool.get(t.id) ?? []} ar={ar} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}

function ToolCard({ tool, history, ar }: { tool: Tool; history: ToolExec[]; ar: boolean }) {
  const [open, setOpen] = useState(false);
  const last = history[0];
  const running = history.filter((h) => h.status === "running" || h.status === "pending").length;
  const last24 = history.filter((h) => Date.now() - new Date(h.created_at).getTime() < 86_400_000);
  const successRate = last24.length ? Math.round((last24.filter((h) => h.status === "succeeded" || h.status === "completed").length / last24.length) * 100) : null;

  const healthIcon = !last ? Activity : (last.status === "succeeded" || last.status === "completed") ? CheckCircle2 : last.status === "failed" ? AlertTriangle : Loader2;
  const HC = healthIcon;
  const healthClass = !last ? "text-muted-foreground" : (last.status === "succeeded" || last.status === "completed") ? "text-emerald-400" : last.status === "failed" ? "text-rose-400" : "text-cyan-400";

  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <HC className={`h-4 w-4 ${healthClass} ${last?.status === "running" ? "animate-spin" : ""}`} />
            <div className="truncate text-sm font-semibold">{tool.name}</div>
          </div>
          {tool.description && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{tool.description}</div>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={tool.enabled ? "default" : "secondary"} className="text-[10px]">{tool.enabled ? (ar ? "مفعّل" : "On") : (ar ? "متوقف" : "Off")}</Badge>
          {tool.requires_approval && <Badge variant="outline" className="text-[10px]"><ShieldCheck className="h-3 w-3 me-1" />{ar ? "اعتماد" : "Approval"}</Badge>}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
        <div><span className="block uppercase">{ar ? "الطابور" : "Queue"}</span><span className="text-foreground text-xs">{running}</span></div>
        <div><span className="block uppercase">{ar ? "آخر تشغيل" : "Last run"}</span><span className="text-foreground text-xs">{last ? fmtRel(last.created_at) : "—"}</span></div>
        <div><span className="block uppercase">{ar ? "النجاح" : "Success"}</span><span className="text-foreground text-xs">{successRate != null ? `${successRate}%` : "—"}</span></div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <ScrollArea className="max-w-full">
          <div className="flex items-center gap-1">
            {history.slice(0, 12).map((h) => (
              <span
                key={h.id}
                title={`${h.status} · ${fmtRel(h.created_at)}`}
                className={`h-2 w-2 rounded-full ${h.status === "succeeded" || h.status === "completed" ? "bg-emerald-400" : h.status === "failed" ? "bg-rose-400" : h.status === "running" ? "bg-cyan-400 animate-pulse" : "bg-muted-foreground/50"}`}
              />
            ))}
          </div>
        </ScrollArea>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!tool.enabled}>
              <Play className="h-3 w-3" />
              <span className="ms-1">{ar ? "تشغيل" : "Run"}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-cyan-300" />
                {tool.name}
              </DialogTitle>
            </DialogHeader>
            <ToolRunner
              toolId={tool.id}
              toolName={tool.name}
              schema={tool.schema_json as JsonSchema | null | undefined}
              requiresApproval={tool.requires_approval}
              enabled={tool.enabled}
              ar={ar}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
