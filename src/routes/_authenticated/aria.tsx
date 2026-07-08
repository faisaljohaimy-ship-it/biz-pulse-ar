import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Brain,
  Sparkles,
  Send,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ShieldAlert,
  Activity,
  FileText,
  Download,
  X,
  Pin,
  Loader2,
} from "lucide-react";
import {
  runAriaPipeline,
  listAriaReports,
  generateAriaReport,
  listAriaMemory,
  pinAriaMemory,
  forgetAriaMemory,
  listAriaDecisions,
  updateAriaDecision,
  getAriaReport,
} from "@/lib/aria/aria.functions";
import type { PipelineResult } from "@/lib/aria/pipeline.server";
import { PIPELINE_STAGES, type ReportKind } from "@/lib/aria/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/aria")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  validateSearch: z.object({ prompt: z.string().optional() }),
  component: AriaConsole,
});

type Turn = { id: string; question: string; result: PipelineResult | null; error?: string };

function AriaConsole() {
  const { prompt: prefill } = Route.useSearch();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState(prefill ?? "");
  const [reportError, setReportError] = useState<string | null>(null);
  useEffect(() => {
    if (prefill) setDraft(prefill);
  }, [prefill]);
  const qc = useQueryClient();
  const runFn = useServerFn(runAriaPipeline);
  const listMemoryFn = useServerFn(listAriaMemory);
  const listReportsFn = useServerFn(listAriaReports);
  const listDecisionsFn = useServerFn(listAriaDecisions);
  const generateFn = useServerFn(generateAriaReport);
  const pinFn = useServerFn(pinAriaMemory);
  const forgetFn = useServerFn(forgetAriaMemory);
  const updateDecisionFn = useServerFn(updateAriaDecision);

  const { user, loading: authLoading } = useAuth();
  const authed = !authLoading && !!user;
  const authRequiredMessage = authLoading
    ? "جاري التحقق من الجلسة…"
    : "سجّل الدخول لتشغيل وظائف ARIA التنفيذية.";
  const memoryQ = useQuery({
    queryKey: ["aria-memory", user?.id ?? "anon"],
    queryFn: () => listMemoryFn(),
    enabled: authed,
  });
  const reportsQ = useQuery({
    queryKey: ["aria-reports", user?.id ?? "anon"],
    queryFn: () => listReportsFn(),
    enabled: authed,
  });
  const decisionsQ = useQuery({
    queryKey: ["aria-decisions", user?.id ?? "anon"],
    queryFn: () => listDecisionsFn(),
    enabled: authed,
  });

  const runMut = useMutation({
    mutationFn: (message: string) => {
      if (!authed) throw new Error(authRequiredMessage);
      return runFn({ data: { message } });
    },
    onSuccess: (result, message) => {
      setTurns((prev) =>
        prev.map((t) => (t.question === message && !t.result ? { ...t, result } : t)),
      );
      qc.invalidateQueries({ queryKey: ["aria-memory"] });
      qc.invalidateQueries({ queryKey: ["aria-decisions"] });
      if (result.report) qc.invalidateQueries({ queryKey: ["aria-reports"] });
    },
    onError: (e, message) => {
      const msg = e instanceof Error ? e.message : String(e);
      setTurns((prev) =>
        prev.map((t) => (t.question === message && !t.result ? { ...t, error: msg } : t)),
      );
    },
  });

  const generateMut = useMutation({
    mutationFn: (kind: ReportKind) => {
      if (!authed) throw new Error(authRequiredMessage);
      return generateFn({ data: { kind, language: "ar" } });
    },
    onMutate: () => setReportError(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aria-reports"] }),
    onError: (error) => setReportError(error instanceof Error ? error.message : String(error)),
  });

  const send = () => {
    const q = draft.trim();
    if (!q || runMut.isPending || !authed) return;
    setTurns((p) => [...p, { id: crypto.randomUUID(), question: q, result: null }]);
    setDraft("");
    runMut.mutate(q);
  };

  return (
    <div
      className="grid h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-12 gap-4 p-4 bg-background"
      dir="rtl"
    >
      {/* LEFT — Memory + Reports */}
      <aside className="lg:col-span-3 flex flex-col gap-4 min-h-0">
        <Panel title="ذاكرة ARIA" icon={<Brain className="h-4 w-4" />}>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {memoryQ.data?.length ? (
              memoryQ.data.map((m) => (
                <div
                  key={m.id}
                  className="group flex items-start gap-2 rounded-md border border-border/50 bg-card/40 p-2 text-xs"
                >
                  <Pin className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{m.key}</div>
                    <div className="text-muted-foreground line-clamp-2">{m.content}</div>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      await forgetFn({ data: { id: m.id } });
                      qc.invalidateQueries({ queryKey: ["aria-memory"] });
                    }}
                    aria-label="نسيان"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">
                لا توجد ذاكرة بعد. سيتم بناؤها مع المحادثة.
              </div>
            )}
          </div>
          <PinForm
            disabled={!authed}
            onPin={async (key, content) => {
              if (!authed) return;
              await pinFn({ data: { key, content, scope: "pinned", importance: 0.95 } });
              qc.invalidateQueries({ queryKey: ["aria-memory"] });
            }}
          />
        </Panel>

        <Panel title="التقارير التنفيذية" icon={<FileText className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-1 mb-2">
            {(
              [
                "executive",
                "daily",
                "weekly",
                "monthly",
                "risk",
                "operations",
                "board",
              ] as ReportKind[]
            ).map((k) => (
              <Button
                key={k}
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2"
                onClick={() => (authed ? generateMut.mutate(k) : setReportError(authRequiredMessage))}
                disabled={authLoading || !authed || generateMut.isPending}
              >
                {generateMut.isPending && generateMut.variables === k ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  k
                )}
              </Button>
            ))}
          </div>
          {reportError && (
            <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
              {reportError}
            </div>
          )}
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {reportsQ.data?.length ? (
              reportsQ.data.map((r) => (
                <ReportRow
                  key={r.id}
                  id={r.id}
                  title={r.title}
                  kind={r.kind}
                  createdAt={r.created_at}
                  disabled={!authed}
                />
              ))
            ) : (
              <div className="text-xs text-muted-foreground">لا توجد تقارير بعد.</div>
            )}
          </div>
        </Panel>
      </aside>

      {/* CENTER — Pipeline timeline + chat */}
      <main className="lg:col-span-6 flex flex-col gap-3 min-h-0">
        <header className="flex items-center gap-3 border-b border-border pb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/30 shadow-glow">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold">ARIA — مركز الذكاء التنفيذي</h1>
            <p className="text-[11px] text-muted-foreground font-mono">
              Intent → Memory → RAG → Context → KPI → Risk → Decision → Reason → Tools → Report
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {turns.length === 0 && <EmptyState />}
          {turns.map((t) => (
            <TurnView key={t.id} turn={t} />
          ))}
          {runMut.isPending && turns[turns.length - 1]?.result == null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Loader2 className="h-3 w-3 animate-spin" /> ARIA يعالج عبر سلسلة المراحل…
            </div>
          )}
        </div>

        <div className="border-t border-border pt-2 flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="اسأل ARIA: ما حالة العمليات الآن؟ ما أبرز المخاطر؟ أنشئ تقريراً تنفيذياً…"
            rows={2}
            className="flex-1 resize-none rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={authLoading || !authed || runMut.isPending}
          />
          <Button
            onClick={send}
            disabled={!draft.trim() || authLoading || !authed || runMut.isPending}
            className="self-end"
          >
            {runMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </main>

      {/* RIGHT — KPIs + Risks + Decisions panels */}
      <aside className="lg:col-span-3 flex flex-col gap-4 min-h-0">
        <Panel title="مؤشرات حية" icon={<Activity className="h-4 w-4" />}>
          {turns.at(-1)?.result?.kpis ? (
            <KpiMini kpis={turns.at(-1)!.result!.kpis} />
          ) : (
            <div className="text-xs text-muted-foreground">ستظهر بعد أول سؤال.</div>
          )}
        </Panel>
        <Panel title="أبرز المخاطر" icon={<ShieldAlert className="h-4 w-4" />}>
          {turns.at(-1)?.result?.risks?.length ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {turns
                .at(-1)!
                .result!.risks.slice(0, 6)
                .map((r) => (
                  <div key={r.id} className="flex items-start gap-2 text-xs">
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                        r.severity === "critical"
                          ? "bg-destructive"
                          : r.severity === "high"
                            ? "bg-orange-500"
                            : r.severity === "medium"
                              ? "bg-amber-400"
                              : "bg-muted-foreground",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.rationale} · score {r.score}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">—</div>
          )}
        </Panel>
        <Panel title="قرارات معلقة" icon={<CheckCircle2 className="h-4 w-4" />}>
          {decisionsQ.data?.length ? (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {decisionsQ.data
                .filter((d) => d.status === "pending")
                .slice(0, 6)
                .map((d) => (
                  <div
                    key={d.id}
                    className="rounded-md border border-border/50 bg-card/40 p-2 text-xs"
                  >
                    <div className="font-semibold">{d.recommendation}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-2">
                      {d.rationale}
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={async () => {
                          if (!authed) return;
                          await updateDecisionFn({ data: { id: d.id, status: "approved" } });
                          qc.invalidateQueries({ queryKey: ["aria-decisions"] });
                        }}
                        disabled={!authed}
                      >
                        موافقة
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2"
                        onClick={async () => {
                          if (!authed) return;
                          await updateDecisionFn({ data: { id: d.id, status: "dismissed" } });
                          qc.invalidateQueries({ queryKey: ["aria-decisions"] });
                        }}
                        disabled={!authed}
                      >
                        تجاهل
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">لا توجد قرارات معلقة.</div>
          )}
        </Panel>
      </aside>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card/60 backdrop-blur p-3 shadow-sm">
      <header className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {icon}
        <span>{title}</span>
      </header>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/30 p-8 text-center">
      <Sparkles className="h-8 w-8 mx-auto text-primary/60 mb-3" />
      <h2 className="text-sm font-semibold mb-1">مركز الذكاء التنفيذي جاهز</h2>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">
        كل سؤال يمر عبر 10 مراحل: استيعاب القصد → الذاكرة → المعرفة → سياق المؤسسة → KPIs → المخاطر
        → القرارات → التفكير → الأدوات → التقارير.
      </p>
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="text-[10px] uppercase tracking-wider text-primary/70 font-mono mb-1">
          السؤال
        </div>
        <div className="text-sm">{turn.question}</div>
      </div>
      {turn.error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="inline h-3 w-3 me-1" /> {turn.error}
        </div>
      )}
      {turn.result && (
        <>
          <StageTimeline result={turn.result} />
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2 flex items-center justify-between">
              <span>إجابة ARIA</span>
              <span>
                ثقة {Math.round(turn.result.confidence * 100)}% · {turn.result.total_ms}ms
                {turn.result.tokens ? ` · ${turn.result.tokens} tok` : ""}
              </span>
            </div>
            <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm">
              {turn.result.answer}
            </div>
            {turn.result.report && (
              <div className="mt-3 pt-3 border-t border-border">
                <ReportRow
                  id={turn.result.report.id}
                  title={turn.result.report.title}
                  kind={turn.result.report.kind}
                  createdAt={new Date().toISOString()}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StageTimeline({ result }: { result: PipelineResult }) {
  const [open, setOpen] = useState<string | null>(null);
  const byStage = new Map(result.trace.map((t) => [t.stage, t]));
  return (
    <div className="rounded-lg border border-border bg-card/40 p-2">
      <div className="flex flex-wrap gap-1">
        {PIPELINE_STAGES.map((s) => {
          const t = byStage.get(s);
          const status = t?.status ?? "skipped";
          return (
            <button
              key={s}
              onClick={() => setOpen(open === s ? null : s)}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border transition-colors",
                status === "ok"
                  ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                  : status === "skipped"
                    ? "border-border/40 text-muted-foreground/60"
                    : "border-destructive/40 bg-destructive/10 text-destructive",
                open === s && "ring-1 ring-primary",
              )}
            >
              {status === "ok" ? (
                <CheckCircle2 className="h-2.5 w-2.5" />
              ) : (
                <Circle className="h-2.5 w-2.5" />
              )}
              {s}
              {t ? ` ${t.duration_ms}ms` : ""}
            </button>
          );
        })}
      </div>
      {open &&
        (() => {
          const t = byStage.get(open as (typeof PIPELINE_STAGES)[number]);
          if (!t) return null;
          return (
            <div className="mt-2 rounded border border-border/50 bg-background/60 p-2 text-[11px]">
              <div className="font-semibold mb-1">
                {open} — {t.summary}
              </div>
              {t.data_json && (
                <pre className="overflow-x-auto text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                  {t.data_json}
                </pre>
              )}
            </div>
          );
        })()}
    </div>
  );
}

function KpiMini({ kpis }: { kpis: PipelineResult["kpis"] }) {
  const items = [
    {
      l: "بلاغات مفتوحة",
      v: kpis.incidents_open,
      c: kpis.incidents_open === 0 ? "text-emerald-500" : "text-amber-500",
    },
    {
      l: "حرجة",
      v: kpis.incidents_critical,
      c: kpis.incidents_critical === 0 ? "text-emerald-500" : "text-destructive",
    },
    {
      l: "صحة CCTV",
      v: `${kpis.cctv_health}%`,
      c: kpis.cctv_health >= 80 ? "text-emerald-500" : "text-amber-500",
    },
    {
      l: "إنجاز الدوريات",
      v: `${kpis.patrol_completion}%`,
      c: kpis.patrol_completion >= 95 ? "text-emerald-500" : "text-amber-500",
    },
    {
      l: "مؤشر المخاطر",
      v: kpis.risk_index,
      c: kpis.risk_index <= 60 ? "text-emerald-500" : "text-destructive",
    },
    {
      l: "الجاهزية",
      v: `${kpis.executive_readiness}%`,
      c: kpis.executive_readiness >= 70 ? "text-emerald-500" : "text-amber-500",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((i) => (
        <div key={i.l} className="rounded border border-border/40 bg-background/40 px-2 py-1">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{i.l}</div>
          <div className={cn("text-sm font-bold font-mono", i.c)}>{i.v}</div>
        </div>
      ))}
    </div>
  );
}

function PinForm({ onPin }: { onPin: (key: string, content: string) => Promise<void> }) {
  const [k, setK] = useState("");
  const [c, setC] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-2 space-y-1"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!k.trim() || !c.trim()) return;
        setBusy(true);
        await onPin(k.trim(), c.trim());
        setK("");
        setC("");
        setBusy(false);
      }}
    >
      <input
        value={k}
        onChange={(e) => setK(e.target.value)}
        placeholder="مفتاح (مثل: تفضيلات_التقارير)"
        className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
      />
      <input
        value={c}
        onChange={(e) => setC(e.target.value)}
        placeholder="محتوى الذاكرة"
        className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="h-6 text-[10px] px-2 w-full"
        disabled={busy || !k.trim() || !c.trim()}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "حفظ كذاكرة دائمة"}
      </Button>
    </form>
  );
}

function ReportRow({
  id,
  title,
  kind,
  createdAt,
}: {
  id: string;
  title: string;
  kind: string;
  createdAt: string;
}) {
  const [loading, setLoading] = useState(false);
  const fetchFn = useServerFn(getAriaReport);
  const download = async () => {
    setLoading(true);
    try {
      const r = await fetchFn({ data: { id } });
      const blob = new Blob([r.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.title}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex items-center gap-2 rounded border border-border/40 bg-background/40 p-1.5 text-xs">
      <FileText className="h-3 w-3 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{title}</div>
        <div className="text-[9px] text-muted-foreground font-mono uppercase">
          {kind} · {new Date(createdAt).toLocaleString("ar-SA")}
        </div>
      </div>
      <button
        onClick={download}
        disabled={loading}
        className="text-muted-foreground hover:text-primary"
        aria-label="تنزيل"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
      </button>
    </div>
  );
}
