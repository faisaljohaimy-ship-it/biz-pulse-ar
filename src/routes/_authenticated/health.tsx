// Enterprise Health Dashboard — every subsystem and connector with evidence,
// reason, and a quick link to live diagnostics. Powered by getRuntimeHealth.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Pause,
  HelpCircle,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { PageHeader, Section } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import {
  getRuntimeHealth,
  type HealthStatus,
  type SubsystemHealth,
} from "@/lib/runtime/health.functions";
import { EmptyState } from "@/components/state/EmptyState";

export const Route = createFileRoute("/_authenticated/health")({
  component: HealthDashboard,
});

const META: Record<
  HealthStatus,
  { icon: typeof Activity; tone: string; bg: string; label: string }
> = {
  healthy: {
    icon: CheckCircle2,
    tone: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    label: "Healthy",
  },
  warning: {
    icon: AlertTriangle,
    tone: "text-amber-300",
    bg: "bg-amber-500/10 border-amber-500/30",
    label: "Warning",
  },
  blocked: {
    icon: XCircle,
    tone: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/30",
    label: "Blocked",
  },
  offline: {
    icon: Pause,
    tone: "text-slate-400",
    bg: "bg-slate-500/10 border-slate-500/30",
    label: "Offline",
  },
  unknown: {
    icon: HelpCircle,
    tone: "text-muted-foreground",
    bg: "bg-muted/30 border-border/40",
    label: "Unknown",
  },
};

function SubsystemCard({ s, ar }: { s: SubsystemHealth; ar?: boolean }) {
  const m = META[s.status];
  const I = m.icon;
  return (
    <Card className={`glass-card p-4 space-y-2 border ${m.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <I className={`h-4 w-4 ${m.tone}`} />
            <span className="text-sm font-semibold truncate">{s.label}</span>
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{s.id}</div>
        </div>
        <Badge variant="outline" className={`text-[10px] ${m.tone} border-current`}>
          {m.label}
        </Badge>
      </div>
      {s.reason && <div className="text-[11px] text-muted-foreground italic">{s.reason}</div>}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        {Object.entries(s.evidence).map(([k, v]) => (
          <div key={k} className="rounded bg-background/40 px-1.5 py-1">
            <div className="text-muted-foreground uppercase">{k.replace(/_/g, " ")}</div>
            <div className="text-foreground truncate">{v === null ? "—" : String(v)}</div>
          </div>
        ))}
      </div>
      <Link
        to="/diagnostics"
        search={{ subsystem: s.id }}
        className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:underline"
      >
        <ExternalLink className="h-3 w-3" /> {ar ? "تشخيص" : "Open diagnostics"}
      </Link>
    </Card>
  );
}

function HealthDashboard() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchHealth = useServerFn(getRuntimeHealth);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["runtime-health"],
    queryFn: () => fetchHealth(),
    refetchInterval: 45_000,
  });

  return (
    <Section>
      <PageHeader
        icon={Activity}
        title={ar ? "لوحة صحة المنظومة" : "Enterprise Health"}
        subtitle={
          ar ? "كل نظام فرعي مع دليل عمل حي." : "Every subsystem and connector with live evidence."
        }
        badge={ar ? "حي" : "Live"}
        actions={
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RotateCcw className={`h-3 w-3 me-1 ${isFetching ? "animate-spin" : ""}`} />{" "}
            {ar ? "تحديث" : "Refresh"}
          </Button>
        }
      />

      {isLoading ? (
        <Card className="glass-card p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 animate-pulse" /> {ar ? "تحميل الصحة…" : "Loading health…"}
        </Card>
      ) : error ? (
        <EmptyState
          reason="error"
          title="Health probe failed"
          description={(error as Error).message}
        />
      ) : !data ? (
        <EmptyState
          reason="waiting"
          title="No health data"
          description="Runtime probe hasn't returned yet."
        />
      ) : (
        <>
          <Card className="glass-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  {ar ? "النتيجة التشغيلية" : "Operational Score"}
                </div>
                <div className="text-3xl font-bold text-cyan-300">{data.operational_pct}%</div>
              </div>
              <div className="text-end text-[10px] text-muted-foreground">
                {ar ? "آخر تحديث" : "Last probed"}: {new Date(data.at).toLocaleTimeString()}
              </div>
            </div>
            <Progress value={data.operational_pct} className="h-2" />
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.subsystems.map((s) => (
              <SubsystemCard key={s.id} s={s} ar={ar} />
            ))}
          </div>
        </>
      )}
    </Section>
  );
}
