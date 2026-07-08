import { RouteError, RouteNotFound } from "@/components/route-boundaries";
// ARIA Self-Evolution — Operator UI (analyze-only report renderer).
// Bilingual AR/EN. No autonomous mutations. Full-sweep readout.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  History,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { runSelfEvolutionFn, listEvolutionCyclesFn } from "@/lib/self-evolution.functions";

export const Route = createFileRoute("/_authenticated/self-evolution")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: SelfEvolutionPage,
  head: () => ({
    meta: [
      { title: "ARIA Self-Evolution — Engineering Report" },
      {
        name: "description",
        content: "Continuous engineering loop: analyze, plan, validate, benchmark, report.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type EvolutionReport = {
  startedAt: string;
  finishedAt: string;
  decision: "GO" | "NO_GO" | "GO_WITH_KNOWN_LIMITATIONS" | "UNKNOWN";
  readinessScore: number;
  reasons: string[];
  issues: Array<{
    id: string;
    area: string;
    severity: "low" | "medium" | "high" | "critical";
    summary: string;
  }>;
  stages: Array<{
    stage: string;
    status: "pass" | "warn" | "fail" | "unknown";
    detail: string;
    finishedAt: string;
    startedAt: string;
  }>;
  applied: string[];
  deferred: string[];
  invariants: Record<string, boolean>;
  readiness: null | {
    decision: string;
    overall_score: number;
    blockers: string[];
    warnings: string[];
    next_actions: string[];
  };
  improvement: null | Record<string, unknown>;
};

function decisionTone(d: EvolutionReport["decision"]) {
  switch (d) {
    case "GO":
      return "text-emerald-400 border-emerald-400/40";
    case "GO_WITH_KNOWN_LIMITATIONS":
      return "text-amber-300 border-amber-300/40";
    case "NO_GO":
      return "text-rose-400 border-rose-400/40";
    default:
      return "text-slate-300 border-slate-400/30";
  }
}
function stageIcon(s: string) {
  if (s === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (s === "fail") return <XCircle className="h-4 w-4 text-rose-400" />;
  if (s === "warn") return <AlertTriangle className="h-4 w-4 text-amber-300" />;
  return <Activity className="h-4 w-4 text-slate-400" />;
}
function severityTone(sev: string) {
  if (sev === "critical") return "bg-rose-500/15 text-rose-300 border-rose-500/40";
  if (sev === "high") return "bg-orange-500/15 text-orange-300 border-orange-500/40";
  if (sev === "medium") return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  return "bg-slate-500/15 text-slate-300 border-slate-500/40";
}

type CycleRow = {
  id: string;
  started_at: string;
  finished_at: string;
  trigger: "cron" | "manual" | "bootstrap";
  decision: EvolutionReport["decision"];
  readiness_score: number;
  issues_count: number;
  critical_count: number;
  applied_count: number;
  deferred_count: number;
  reasons: string[];
};

function SelfEvolutionPage() {
  const run = useServerFn(runSelfEvolutionFn);
  const list = useServerFn(listEvolutionCyclesFn);
  const qc = useQueryClient();

  const cycles = useQuery({
    queryKey: ["evolution-cycles"],
    queryFn: async () => (await list({ data: { limit: 25 } })).cycles as CycleRow[],
    staleTime: 15_000,
  });

  const cycle = useMutation({
    mutationFn: async () =>
      (await run({ data: { enableApply: false, persist: true } })) as {
        report: EvolutionReport;
        persistedId: string | null;
        persistError: string | null;
      },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evolution-cycles"] }),
  });

  const report = cycle.data?.report;

  return (
    <div className="space-y-6 p-4 md:p-6" dir="ltr">
      <PageHeader
        title="ARIA Self-Evolution / محرك التطور الذاتي"
        subtitle="Continuous engineering loop — analyze → plan → validate → benchmark → report. Analyze-only mode."
        icon={ShieldCheck}
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => cycle.mutate()}
            disabled={cycle.isPending}
          >
            <RotateCcw className={`h-4 w-4 mr-1.5 ${cycle.isPending ? "animate-spin" : ""}`} />
            Run cycle / تشغيل دورة
          </Button>
        }
      />

      {cycle.isPending && (
        <Card className="glass-card p-4 text-sm text-slate-300">
          Running engineering loop… / جارٍ تنفيذ الدورة…
        </Card>
      )}
      {cycle.error && (
        <Card className="glass-card p-4 text-sm text-rose-300">
          Failed to run engine: {(cycle.error as Error).message}
        </Card>
      )}
      {cycle.data?.persistError && (
        <Card className="glass-card p-4 text-sm text-amber-300">
          Persist warning: {cycle.data.persistError}
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Cycle history / سجل الدورات
        </h2>
        <Card className="glass-card p-4">
          {cycles.isLoading ? (
            <div className="text-xs text-slate-400">Loading history…</div>
          ) : (cycles.data?.length ?? 0) === 0 ? (
            <div className="text-xs text-slate-400">
              No cycles yet. Run one above or wait for the cron tick. / لا توجد دورات بعد.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {cycles.data!.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase ${decisionTone(c.decision)}`}
                  >
                    {c.decision}
                  </Badge>
                  <span className="text-slate-400 tabular-nums">
                    {new Date(c.started_at).toLocaleString()}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300">{Math.round(c.readiness_score * 100)}%</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300">
                    issues {c.issues_count}
                    {c.critical_count > 0 && (
                      <span className="text-rose-300"> ({c.critical_count} crit)</span>
                    )}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{c.trigger}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {report && (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">Decision / القرار</h2>
            <Card className={`glass-card p-4 border ${decisionTone(report.decision)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Overall</div>
                  <div className="text-2xl font-bold">{report.decision}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Readiness score
                  </div>
                  <div className="text-2xl font-bold">
                    {Math.round(report.readinessScore * 100)}%
                  </div>
                </div>
              </div>
              <Progress value={report.readinessScore * 100} className="h-1.5 mt-3" />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {report.reasons.map((r) => (
                  <Badge key={r} variant="outline" className="text-[11px]">
                    {r}
                  </Badge>
                ))}
              </div>
            </Card>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">
              Pipeline stages / مراحل الأنبوب
            </h2>
            <Card className="glass-card p-4">
              <ol className="space-y-2">
                {report.stages.map((s) => (
                  <li key={`${s.stage}-${s.startedAt}`} className="flex items-start gap-2 text-sm">
                    {stageIcon(s.status)}
                    <div className="flex-1">
                      <div className="font-medium capitalize">{s.stage.replace(/_/g, " ")}</div>
                      <div className="text-xs text-slate-400">{s.detail}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {s.status}
                    </Badge>
                  </li>
                ))}
              </ol>
            </Card>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">
              Issues detected / المشكلات المكتشفة
            </h2>
            <Card className="glass-card p-4">
              {report.issues.length === 0 ? (
                <div className="text-sm text-emerald-300">
                  No issues detected in this cycle. / لا توجد مشكلات في هذه الدورة.
                </div>
              ) : (
                <ul className="space-y-2">
                  {report.issues.map((i) => (
                    <li key={i.id} className="flex items-start gap-2 text-sm">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${severityTone(i.severity)}`}
                      >
                        {i.severity}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium">{i.summary}</div>
                        <div className="text-xs text-slate-400">
                          {i.area} · {i.id}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {report.readiness && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-300">Release gate / بوابة الإصدار</h2>
              <Card className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    Release decision: {report.readiness.decision}
                  </div>
                  <Badge variant="outline">
                    {Math.round(report.readiness.overall_score * 100)}%
                  </Badge>
                </div>
                {report.readiness.blockers.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs uppercase text-rose-300 mb-1">Blockers</div>
                      <ul className="text-sm space-y-1">
                        {report.readiness.blockers.map((b, i) => (
                          <li key={i}>• {b}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                {report.readiness.warnings.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs uppercase text-amber-300 mb-1">Warnings</div>
                      <ul className="text-sm space-y-1">
                        {report.readiness.warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                {report.readiness.next_actions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs uppercase text-cyan-300 mb-1">Next actions</div>
                      <ul className="text-sm space-y-1">
                        {report.readiness.next_actions.map((a, i) => (
                          <li key={i}>• {a}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </Card>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">Invariants / الثوابت المحمية</h2>
            <Card className="glass-card p-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(report.invariants).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`h-3.5 w-3.5 ${v ? "text-emerald-400" : "text-rose-400"}`}
                  />
                  <span className="text-slate-300">{k}</span>
                </div>
              ))}
            </Card>
          </section>

          <div className="text-[11px] text-slate-500">
            Cycle {new Date(report.startedAt).toLocaleString()} →{" "}
            {new Date(report.finishedAt).toLocaleString()} · Applied: {report.applied.length} ·
            Deferred: {report.deferred.length}
            {cycle.data?.persistedId && (
              <>
                {" "}
                · Saved id: <span className="font-mono">{cycle.data.persistedId.slice(0, 8)}</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
