/**
 * RuntimeDataFlow + PrimaryKpiStrip — the L2 exception-detection band.
 * Every stage chip and KPI card is a real control opening the detail
 * drawer (duration, trace, source, last update, history).
 */
import * as React from "react";
import {
  NxPanel,
  NxPipelineFlow,
  NxKpiCard,
  NxSparkline,
  type NxPipelineStage,
} from "@/components/nx";
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
            className="min-w-52 shrink-0 snap-start text-start focus-visible:outline-none md:min-w-0 [&>div]:h-full"
          >
            <NxKpiCard
              label={metric.labelAr}
              value={metric.value}
              unit={metric.unit}
              delta={
                metric.trend !== undefined
                  ? { value: metric.trend, goodDirection: metric.goodDirection }
                  : undefined
              }
              updatedAt={metric.lastUpdatedAt}
              simulation
              className={metric.status === "critical" ? "border-nx-critical/50" : undefined}
            />
            {level === "technical" ? (
              <span className="mt-1 block px-1">
                <NxSparkline
                  points={metric.history}
                  width={120}
                  height={24}
                  label={`تاريخ ${metric.labelAr} — اتجاه ${metric.goodDirection === "up" ? "صاعد" : "هابط"} محمود`}
                />
              </span>
            ) : null}
          </button>
        );
      })}
    </section>
  );
}
