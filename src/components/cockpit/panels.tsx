/**
 * RuntimeDataFlow + PrimaryKpiStrip — the L2 exception-detection band.
 * Every stage chip and KPI card is a real control opening the detail
 * drawer (duration, trace, source, last update, history).
 */
import * as React from "react";
import { AlertTriangle, Brain, DollarSign, HeartPulse, Target } from "lucide-react";
import {
  NxPanel,
  NxPipelineFlow,
  NxSparkline,
  type NxPipelineStage,
} from "@/components/nx";
import { cn } from "@/lib/utils";
import type { CockpitSnapshot, MetricValue } from "./repository";
import { useCockpit } from "./use-cockpit";
import { emitCockpitAction, type CockpitActionId } from "./actions";

const KPI_ACTION: Record<string, CockpitActionId> = {
  systemHealth: "kpi.systemHealth.open",
  overallProgress: "kpi.overallProgress.open",
  smartDecisions: "kpi.smartDecisions.open",
  criticalAlerts: "kpi.criticalAlerts.open",
  financialImpact: "kpi.financialImpact.open",
};

/** Reference-cockpit look: big colored number + colored icon, no simulation pill. */
const KPI_STYLE: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    numberClass: string;
    iconBg: string;
    iconColor: string;
    subtitleAr?: string;
  }
> = {
  systemHealth: {
    icon: HeartPulse,
    numberClass: "text-nx-success",
    iconBg: "bg-nx-success/10 border-nx-success/30",
    iconColor: "text-nx-success",
    subtitleAr: "ممتاز",
  },
  overallProgress: {
    icon: Target,
    numberClass: "text-nx-cyan",
    iconBg: "bg-nx-cyan/10 border-nx-cyan/30",
    iconColor: "text-nx-cyan",
  },
  smartDecisions: {
    icon: Brain,
    numberClass: "text-fuchsia-400",
    iconBg: "bg-fuchsia-500/10 border-fuchsia-400/30",
    iconColor: "text-fuchsia-400",
  },
  criticalAlerts: {
    icon: AlertTriangle,
    numberClass: "text-nx-critical",
    iconBg: "bg-nx-critical/10 border-nx-critical/30",
    iconColor: "text-nx-critical",
    subtitleAr: "تحتاج تدخل",
  },
  financialImpact: {
    icon: DollarSign,
    numberClass: "text-teal-300",
    iconBg: "bg-teal-500/10 border-teal-400/30",
    iconColor: "text-teal-300",
  },
};

export function RuntimeFlowPanel({ snapshot }: { snapshot: CockpitSnapshot }) {
  const { openDrawer, level } = useCockpit();
  const approvalStage = snapshot.runtimeFlow.find((s) => s.id === "approval");
  const onSelectStage = (stage: NxPipelineStage) => {
    emitCockpitAction(`flow.${stage}.inspect` as CockpitActionId);
    openDrawer({ type: "stage", id: stage });
  };
  return (
    <NxPanel
      data-testid="runtime-data-flow"
      title="تدفق البيانات"
      layer="runtime"
      density="operations"
      headerSlot={
        <span className="flex items-center gap-2 text-xs text-nx-pearl/64">
          <span className="tabular-nums text-nx-success" dir="ltr">
            {snapshot.processingSpeed.toLocaleString("en")} req/s
          </span>
          سرعة المعالجة
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <NxPipelineFlow
          activeStage="approval"
          approvalPending={approvalStage?.status === "warning"}
          onSelectStage={onSelectStage}
        />
        {level !== "executive" ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-nx-pearl/56">
            {snapshot.runtimeFlow.map((stage) => (
              <span key={stage.id} className="tabular-nums">
                {stage.labelAr}: <bdi dir="ltr">{stage.durationMs}ms</bdi>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </NxPanel>
  );
}

function formatKpiValue(metric: MetricValue): string {
  const v = metric.value;
  if (typeof v === "number") {
    if (Math.abs(v) >= 1_000_000) {
      const sign = v > 0 ? "+" : v < 0 ? "-" : "";
      return `${sign}${(Math.abs(v) / 1_000_000).toFixed(1)}M`;
    }
    return v.toLocaleString("en");
  }
  return String(v);
}

export function PrimaryKpiStrip({ metrics }: { metrics: readonly MetricValue[] }) {
  const { openDrawer, level } = useCockpit();
  return (
    <section
      aria-label="المؤشرات الحرجة"
      data-testid="primary-kpi-strip"
      className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-3 md:overflow-visible xl:grid-cols-5"
    >
      {metrics.map((metric) => {
        const actionId = KPI_ACTION[metric.id] ?? "kpi.systemHealth.open";
        const style = KPI_STYLE[metric.id] ?? KPI_STYLE.systemHealth;
        const Icon = style.icon;
        const deltaGood =
          metric.trend !== undefined
            ? metric.goodDirection === "down"
              ? metric.trend <= 0
              : metric.trend >= 0
            : true;
        return (
          <button
            key={metric.id}
            type="button"
            data-action={actionId}
            data-kpi={metric.id}
            aria-label={`${metric.labelAr}: ${metric.value}${metric.unit ?? ""} — فتح التفاصيل`}
            onClick={() => {
              emitCockpitAction(actionId);
              openDrawer({ type: "kpi", id: metric.id });
            }}
            className={cn(
              "nx-glass-e1 rounded-nx-16 group relative flex min-w-52 shrink-0 snap-start flex-col gap-2 border border-white/8 p-4 text-start transition-[border-color,box-shadow] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] hover:border-nx-cyan/40 hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan md:min-w-0",
              metric.status === "critical" && "border-nx-critical/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-nx-pearl/72">{metric.labelAr}</span>
              <span
                aria-hidden
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border",
                  style.iconBg,
                )}
              >
                <Icon className={cn("size-4", style.iconColor)} />
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn("text-4xl font-bold tabular-nums leading-none", style.numberClass)}
                dir="ltr"
              >
                {formatKpiValue(metric)}
              </span>
              {metric.unit ? (
                <span className={cn("text-sm font-semibold", style.numberClass)}>
                  {metric.unit}
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              {style.subtitleAr ? (
                <span className={cn("font-medium", style.numberClass)}>{style.subtitleAr}</span>
              ) : metric.trend !== undefined ? (
                <span
                  className={cn(
                    "tabular-nums",
                    deltaGood ? "text-nx-success" : "text-nx-critical",
                  )}
                  dir="ltr"
                >
                  {metric.trend >= 0 ? "▲" : "▼"} {Math.abs(metric.trend)}%
                </span>
              ) : (
                <span />
              )}
              <span className="text-nx-pearl/48">مباشر</span>
            </div>
            {level === "technical" ? (
              <NxSparkline
                points={metric.history}
                width={140}
                height={22}
                label={`تاريخ ${metric.labelAr}`}
                className={cn("mt-1", style.iconColor, "opacity-70")}
              />
            ) : null}
          </button>
        );
      })}
    </section>
  );
}

