// ARIA Self-Evolution — Operator UI (analyze-only report renderer).
// Bilingual AR/EN. No autonomous mutations. Full-sweep readout.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, CheckCircle2, XCircle, AlertTriangle, RotateCcw, ShieldCheck, History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { runSelfEvolutionFn, listEvolutionCyclesFn } from "@/lib/self-evolution.functions";

export const Route = createFileRoute("/_authenticated/self-evolution")({
  component: SelfEvolutionPage,
  head: () => ({
    meta: [
      { title: "ARIA Self-Evolution — Engineering Report" },
      { name: "description", content: "Continuous engineering loop: analyze, plan, validate, benchmark, report." },
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
  issues: Array<{ id: string; area: string; severity: "low" | "medium" | "high" | "critical"; summary: string }>;
  stages: Array<{ stage: string; status: "pass" | "warn" | "fail" | "unknown"; detail: string; finishedAt: string; startedAt: string }>;
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
    case "GO": return "text-emerald-400 border-emerald-400/40";
    case "GO_WITH_KNOWN_LIMITATIONS": return "text-amber-300 border-amber-300/40";
    case "NO_GO": return "text-rose-400 border-rose-400/40";
    default: return "text-slate-300 border-slate-400/30";
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

function SelfEvolutionPage() {
  const run = useServerFn(runSelfEvolutionFn);
  const q = useQuery({
    queryKey: ["self-evolution"],
    queryFn: async () => (await run({ data: { enableApply: false } })) as unknown as EvolutionReport,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6 p-4 md:p-6" dir="ltr">
      <PageHeader
        title="ARIA Self-Evolution / محرك التطور الذاتي"
        subtitle="Continuous engineering loop — analyze → plan → validate → benchmark → report. Analyze-only mode."
        icon={ShieldCheck}
        actions={
          <Button size="sm" variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RotateCcw className={`h-4 w-4 mr-1.5 ${q.isFetching ? "animate-spin" : ""}`} />
            Run cycle / تشغيل دورة
          </Button>
        }
      />

      {q.isLoading && <Card className="glass-card p-4 text-sm text-slate-300">Running engineering loop… / جارٍ تنفيذ الدورة…</Card>}
      {q.error && <Card className="glass-card p-4 text-sm text-rose-300">Failed to run engine: {(q.error as Error).message}</Card>}

      {q.data && (
        <>
          <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-300">Decision / القرار</h2>
            <Card className={`glass-card p-4 border ${decisionTone(q.data.decision)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Overall</div>
                  <div className="text-2xl font-bold">{q.data.decision}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Readiness score</div>
                  <div className="text-2xl font-bold">{Math.round(q.data.readinessScore * 100)}%</div>
                </div>
              </div>
              <Progress value={q.data.readinessScore * 100} className="h-1.5 mt-3" />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {q.data.reasons.map((r) => (
                  <Badge key={r} variant="outline" className="text-[11px]">{r}</Badge>
                ))}
              </div>
            </Card>
          </section>

          <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-300">Pipeline stages / مراحل الأنبوب</h2>
            <Card className="glass-card p-4">
              <ol className="space-y-2">
                {q.data.stages.map((s) => (
                  <li key={`${s.stage}-${s.startedAt}`} className="flex items-start gap-2 text-sm">
                    {stageIcon(s.status)}
                    <div className="flex-1">
                      <div className="font-medium capitalize">{s.stage.replace(/_/g, " ")}</div>
                      <div className="text-xs text-slate-400">{s.detail}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase">{s.status}</Badge>
                  </li>
                ))}
              </ol>
            </Card>
          </section>

          <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-300">Issues detected / المشكلات المكتشفة</h2>
            <Card className="glass-card p-4">
              {q.data.issues.length === 0 ? (
                <div className="text-sm text-emerald-300">No issues detected in this cycle. / لا توجد مشكلات في هذه الدورة.</div>
              ) : (
                <ul className="space-y-2">
                  {q.data.issues.map((i) => (
                    <li key={i.id} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className={`text-[10px] ${severityTone(i.severity)}`}>{i.severity}</Badge>
                      <div className="flex-1">
                        <div className="font-medium">{i.summary}</div>
                        <div className="text-xs text-slate-400">{i.area} · {i.id}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {q.data.readiness && (
            <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-300">Release gate / بوابة الإصدار</h2>
              <Card className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Release decision: {q.data.readiness.decision}</div>
                  <Badge variant="outline">{Math.round(q.data.readiness.overall_score * 100)}%</Badge>
                </div>
                {q.data.readiness.blockers.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs uppercase text-rose-300 mb-1">Blockers</div>
                      <ul className="text-sm space-y-1">
                        {q.data.readiness.blockers.map((b, i) => <li key={i}>• {b}</li>)}
                      </ul>
                    </div>
                  </>
                )}
                {q.data.readiness.warnings.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs uppercase text-amber-300 mb-1">Warnings</div>
                      <ul className="text-sm space-y-1">
                        {q.data.readiness.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                      </ul>
                    </div>
                  </>
                )}
                {q.data.readiness.next_actions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-xs uppercase text-cyan-300 mb-1">Next actions</div>
                      <ul className="text-sm space-y-1">
                        {q.data.readiness.next_actions.map((a, i) => <li key={i}>• {a}</li>)}
                      </ul>
                    </div>
                  </>
                )}
              </Card>
            </section>
          )}

          <section className="space-y-2"><h2 className="text-sm font-semibold text-slate-300">Invariants / الثوابت المحمية</h2>
            <Card className="glass-card p-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(q.data.invariants).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <CheckCircle2 className={`h-3.5 w-3.5 ${v ? "text-emerald-400" : "text-rose-400"}`} />
                  <span className="text-slate-300">{k}</span>
                </div>
              ))}
            </Card>
          </section>

          <div className="text-[11px] text-slate-500">
            Cycle {new Date(q.data.startedAt).toLocaleString()} → {new Date(q.data.finishedAt).toLocaleString()} ·
            Applied: {q.data.applied.length} · Deferred: {q.data.deferred.length}
          </div>
        </>
      )}
    </div>
  );
}
