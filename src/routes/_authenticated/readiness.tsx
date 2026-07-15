import { RouteError, RouteNotFound } from "@/components/route-boundaries";
// Production Readiness Report — derived from real DB facts.

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, CheckCircle2, XCircle, RotateCcw, Printer, AlertOctagon } from "lucide-react";
import { PageHeader, Section } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { EmptyState } from "@/components/state/EmptyState";
import { getProductionReadiness, type ReadinessDimension } from "@/lib/runtime/readiness.functions";

export const Route = createFileRoute("/_authenticated/readiness")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: ReadinessReportPage,
});

function scoreTone(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-cyan-300";
  if (score >= 50) return "text-amber-300";
  return "text-rose-400";
}

function DimensionCard({ d }: { d: ReadinessDimension }) {
  return (
    <Card className="glass-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{d.label}</div>
        <div className={`text-2xl font-bold ${scoreTone(d.score)}`}>{d.score}</div>
      </div>
      <Progress value={d.score} className="h-1.5" />
      <div className="space-y-1 mt-1">
        {d.signals.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              {s.ok ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              ) : (
                <XCircle className="h-3 w-3 text-rose-400" />
              )}
              <span className="text-muted-foreground">{s.key.replace(/_/g, " ")}</span>
            </div>
            <span className="font-mono text-foreground">{String(s.value ?? "—")}</span>
          </div>
        ))}
      </div>
      {d.blockers.length > 0 && (
        <div className="space-y-1 mt-1">
          {d.blockers.map((b, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-rose-300">
              <AlertOctagon className="h-3 w-3 mt-0.5 shrink-0" /> <span>{b}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ReadinessReportPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchReport = useServerFn(getProductionReadiness);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["readiness"],
    queryFn: () => fetchReport(),
    staleTime: 30_000,
  });

  return (
    <Section>
      <PageHeader
        icon={ShieldCheck}
        title={ar ? "تقرير الجاهزية الإنتاجية" : "Production Readiness Report"}
        subtitle={
          ar ? "كل نتيجة محسوبة من سجلات حقيقية." : "Every score derived from real database facts."
        }
        badge={
          data?.release_candidate
            ? ar
              ? "جاهز للإصدار"
              : "Release Candidate"
            : ar
              ? "قيد التقييم"
              : "In Review"
        }
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RotateCcw className={`h-3 w-3 me-1 ${isFetching ? "animate-spin" : ""}`} />{" "}
              {ar ? "إعادة احتساب" : "Recalculate"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => typeof window !== "undefined" && window.print()}
            >
              <Printer className="h-3 w-3 me-1" /> {ar ? "طباعة" : "Print"}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <Card className="glass-card p-6 text-sm text-muted-foreground">
          {ar ? "احتساب…" : "Calculating…"}
        </Card>
      ) : error ? (
        <EmptyState reason="error" title="Report failed" description={(error as Error).message} />
      ) : !data ? (
        <EmptyState
          reason="waiting"
          title="No report yet"
          description="Generate to evaluate readiness."
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="glass-card p-5">
              <div className="text-xs text-muted-foreground">
                {ar ? "نتيجة المؤسسة" : "Enterprise Score"}
              </div>
              <div className={`text-5xl font-bold ${scoreTone(data.enterprise_score)}`}>
                {data.enterprise_score}
              </div>
              <Progress value={data.enterprise_score} className="h-2 mt-2" />
              <div className="text-[10px] text-muted-foreground mt-2">
                Weighted across every measured production dimension.
              </div>
            </Card>
            <Card className="glass-card p-5">
              <div className="text-xs text-muted-foreground">
                {ar ? "نتيجة الإنتاج" : "Production Score"}
              </div>
              <div className={`text-5xl font-bold ${scoreTone(data.production_score)}`}>
                {data.production_score}
              </div>
              <Progress value={data.production_score} className="h-2 mt-2" />
              <div className="text-[10px] text-muted-foreground mt-2">
                Weights runtime, reliability & security highest.
              </div>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.dimensions.map((d) => (
              <DimensionCard key={d.id} d={d} />
            ))}
          </div>

          <Card className="glass-card p-4">
            <div className="text-sm font-semibold mb-2">
              {ar ? "العوائق المتبقية" : "Remaining Blockers"}
            </div>
            <Separator className="mb-2" />
            {data.blockers.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />{" "}
                {ar ? "لا توجد عوائق." : "No blockers detected."}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {data.blockers.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-rose-300">
                    <AlertOctagon className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {b}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="glass-card p-3 text-[10px] text-muted-foreground text-end">
            {ar ? "وقت التقرير" : "Generated"}: {new Date(data.at).toLocaleString()}
          </Card>
        </>
      )}
    </Section>
  );
}
