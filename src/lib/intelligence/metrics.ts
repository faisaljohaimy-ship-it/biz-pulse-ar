/**
 * Executive Metrics computed from real data.
 *
 * Six headline scores (0-100) the C-suite tracks daily:
 *  - enterpriseHealth   — composite of all underlying signals
 *  - strategicProgress  — % weighted progress on initiatives + decisions
 *  - executionVelocity  — rate of task completion vs creation (14d)
 *  - decisionLatency    — inverse of avg days a decision sits "open"
 *  - riskExposure       — weighted open risks + critical alerts
 *  - opportunityIndex   — open recommendations × confidence
 */

export type ExecutiveMetric = {
  id:
    | "enterpriseHealth"
    | "strategicProgress"
    | "executionVelocity"
    | "decisionLatency"
    | "riskExposure"
    | "opportunityIndex";
  label_ar: string;
  label_en: string;
  value: number;              // 0-100
  delta: number;              // pp vs prior window
  tone: "emerald" | "cyan" | "amber" | "rose" | "violet";
  why_ar: string;
  why_en: string;
};

export type MetricsInput = {
  events: Array<{
    kind: string;
    status: string;
    impact: string;
    progress: number;
    due_at: string | null;
    last_update: string;
    created_at: string;
  }>;
  alerts: Array<{ severity: string; business_impact_score: number; resolved_at: string | null }>;
  tasks: Array<{ status: string; created_at: string; updated_at: string }>;
};

const IMPACT_WEIGHT: Record<string, number> = { low: 1, medium: 2, high: 4, critical: 8 };
const SEV_WEIGHT: Record<string, number> = { low: 1, medium: 2, high: 4, critical: 8 };

export function computeExecutiveMetrics(input: MetricsInput): ExecutiveMetric[] {
  const { events, alerts, tasks } = input;
  const now = Date.now();
  const day = 86_400_000;

  // Strategic progress — weighted average of in_progress / open initiatives + decisions
  const strategic = events.filter((e) =>
    ["decision", "initiative", "board_action"].includes(e.kind) && e.status !== "done",
  );
  const stratWeight = strategic.reduce((s, e) => s + (IMPACT_WEIGHT[e.impact] ?? 1), 0);
  const stratProgress =
    stratWeight === 0
      ? 100
      : Math.round(
          strategic.reduce(
            (s, e) => s + e.progress * (IMPACT_WEIGHT[e.impact] ?? 1),
            0,
          ) / stratWeight,
        );

  // Execution velocity — completed / created in last 14d (capped at 100)
  const cutoff = now - 14 * day;
  const created14 = tasks.filter((t) => new Date(t.created_at).getTime() >= cutoff).length;
  const done14 = tasks.filter(
    (t) => t.status === "done" && new Date(t.updated_at).getTime() >= cutoff,
  ).length;
  const velocity =
    created14 === 0 ? (done14 > 0 ? 100 : 70) : Math.min(100, Math.round((done14 / created14) * 100));

  // Decision latency — inverse of avg days open for "decision" kind still open/in_progress
  const openDecisions = events.filter(
    (e) => e.kind === "decision" && ["open", "in_progress", "blocked"].includes(e.status),
  );
  const avgDaysOpen =
    openDecisions.length === 0
      ? 0
      : openDecisions.reduce(
          (s, e) => s + (now - new Date(e.created_at).getTime()) / day,
          0,
        ) / openDecisions.length;
  // < 3 days = 100, > 21 days = 20
  const latency = Math.max(20, Math.min(100, Math.round(100 - (avgDaysOpen - 3) * 4.5)));

  // Risk exposure — weighted open risks + critical/high alerts (lower score = more exposure)
  const openRisks = events.filter(
    (e) => e.kind === "risk" && e.status !== "done",
  );
  const riskWeight = openRisks.reduce((s, e) => s + (IMPACT_WEIGHT[e.impact] ?? 1), 0);
  const alertWeight = alerts
    .filter((a) => !a.resolved_at)
    .reduce((s, a) => s + (SEV_WEIGHT[a.severity] ?? 1), 0);
  const exposureRaw = riskWeight + alertWeight;
  // 0 weight = 100 health, 40+ weight = 20
  const riskScore = Math.max(20, Math.min(100, Math.round(100 - exposureRaw * 2)));

  // Opportunity index — open recommendations weighted by impact
  const opps = events.filter((e) => e.kind === "recommendation" && e.status !== "done");
  const oppRaw = opps.reduce((s, e) => s + (IMPACT_WEIGHT[e.impact] ?? 1), 0);
  const opportunity = Math.min(100, 40 + oppRaw * 6);

  // Enterprise health = weighted blend
  const health = Math.round(
    stratProgress * 0.25 +
      velocity * 0.2 +
      latency * 0.15 +
      riskScore * 0.25 +
      opportunity * 0.15,
  );

  return [
    {
      id: "enterpriseHealth",
      label_ar: "صحة المؤسسة",
      label_en: "Enterprise Health",
      value: health,
      delta: 0,
      tone: health >= 80 ? "emerald" : health >= 60 ? "cyan" : health >= 40 ? "amber" : "rose",
      why_ar: `مزيج مرجَّح من 5 مؤشرات أساسية. عدد الأحداث المتتبعة: ${events.length}.`,
      why_en: `Weighted blend of 5 base metrics. Tracking ${events.length} events.`,
    },
    {
      id: "strategicProgress",
      label_ar: "التقدم الاستراتيجي",
      label_en: "Strategic Progress",
      value: stratProgress,
      delta: 0,
      tone: "violet",
      why_ar: `${strategic.length} مبادرة/قرار استراتيجي مفتوح، مرجَّح بالأثر.`,
      why_en: `${strategic.length} open strategic initiatives, impact-weighted.`,
    },
    {
      id: "executionVelocity",
      label_ar: "سرعة التنفيذ",
      label_en: "Execution Velocity",
      value: velocity,
      delta: 0,
      tone: velocity >= 70 ? "emerald" : "amber",
      why_ar: `${done14} مهمة منجزة مقابل ${created14} منشأة خلال 14 يوماً.`,
      why_en: `${done14} tasks completed vs ${created14} created in last 14 days.`,
    },
    {
      id: "decisionLatency",
      label_ar: "زمن اتخاذ القرار",
      label_en: "Decision Latency",
      value: latency,
      delta: 0,
      tone: latency >= 70 ? "emerald" : latency >= 50 ? "amber" : "rose",
      why_ar: `متوسط أيام القرارات المفتوحة: ${avgDaysOpen.toFixed(1)} يوم.`,
      why_en: `Avg days open per decision: ${avgDaysOpen.toFixed(1)}d.`,
    },
    {
      id: "riskExposure",
      label_ar: "التعرض للمخاطر",
      label_en: "Risk Exposure",
      value: riskScore,
      delta: 0,
      tone: riskScore >= 70 ? "emerald" : riskScore >= 50 ? "amber" : "rose",
      why_ar: `${openRisks.length} مخاطر مفتوحة و${alerts.filter((a) => !a.resolved_at).length} تنبيه نشط.`,
      why_en: `${openRisks.length} open risks and ${alerts.filter((a) => !a.resolved_at).length} active alerts.`,
    },
    {
      id: "opportunityIndex",
      label_ar: "مؤشر الفرص",
      label_en: "Opportunity Index",
      value: opportunity,
      delta: 0,
      tone: "emerald",
      why_ar: `${opps.length} توصية AI مفتوحة جاهزة للتنفيذ.`,
      why_en: `${opps.length} open AI recommendations ready to action.`,
    },
  ];
}
