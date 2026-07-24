/**
 * Executive Insight Engine — deterministic rule-based insight derivation.
 *
 * Turns KPI intelligence, declared risks and objective tracking into ranked
 * executive insights. Pure evaluation: same inputs → same insights; nothing
 * is executed and nothing external is consulted.
 */
import type { ImpactLevel } from "./types";
import type { IdFactory } from "../types";
import type { ExecutiveKpiIntelligence } from "./kpi";
import type { RiskRecord } from "./context";

export type InsightKind = "kpi-trend" | "kpi-anomaly" | "risk" | "objective";

export interface ExecutiveInsight {
  readonly id: string;
  readonly kind: InsightKind;
  readonly severity: ImpactLevel;
  readonly statement: string;
}

export interface InsightInputs {
  readonly kpiIds: readonly string[];
  readonly risks: readonly RiskRecord[];
  readonly objectives: readonly {
    readonly kpiId: string;
    readonly target: number;
    readonly direction: "at-least" | "at-most";
  }[];
}

const SEVERITY_RANK: Readonly<Record<ImpactLevel, number>> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export class ExecutiveInsightEngine {
  constructor(
    private readonly kpi: ExecutiveKpiIntelligence,
    private readonly idFactory: IdFactory,
  ) {}

  /** Derive insights, most severe first (stable within severity). */
  derive(inputs: InsightInputs): readonly ExecutiveInsight[] {
    const insights: ExecutiveInsight[] = [];

    for (const kpiId of inputs.kpiIds) {
      const summary = this.kpi.summarize(kpiId);
      if (summary.direction !== "stable") {
        insights.push({
          id: this.idFactory(),
          kind: "kpi-trend",
          severity: summary.direction === "falling" ? "medium" : "low",
          statement: `المؤشر ${kpiId} في اتجاه ${summary.direction === "falling" ? "هابط" : "صاعد"} (آخر قيمة ${summary.latest})`,
        });
      }
      const anomalies = this.kpi.anomalies(kpiId);
      if (anomalies.length > 0) {
        insights.push({
          id: this.idFactory(),
          kind: "kpi-anomaly",
          severity: "high",
          statement: `المؤشر ${kpiId} سجّل ${anomalies.length} قراءة شاذة تستدعي المراجعة`,
        });
      }
    }

    for (const risk of inputs.risks) {
      if (risk.severity === "high" || risk.severity === "critical") {
        insights.push({
          id: this.idFactory(),
          kind: "risk",
          severity: risk.severity,
          statement: `خطر ${risk.severity === "critical" ? "حرج" : "مرتفع"}: ${risk.statement}`,
        });
      }
    }

    for (const objective of inputs.objectives) {
      const tracking = this.kpi.trackObjective(
        objective.kpiId,
        objective.target,
        objective.direction,
      );
      if (!tracking.onTrack) {
        insights.push({
          id: this.idFactory(),
          kind: "objective",
          severity: "medium",
          statement: `الهدف على المؤشر ${objective.kpiId} خارج المسار (الحالي ${tracking.current} مقابل المستهدف ${tracking.target})`,
        });
      }
    }

    return insights.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  }
}
