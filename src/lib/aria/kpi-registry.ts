/**
 * NEXIOS · ARIA KPI Registry
 *
 * Bilingual KPI catalog + thresholds. Fully additive; consumed by:
 *  - `useKpiWatcher` (produces breach set from a live snapshot)
 *  - `AriaProactiveNudge` (dock chip on first breach per session)
 *  - `/api/public/aria-chat` (evidence context injection)
 *  - Evaluation mode (evidence-locked answers)
 *
 * Breach semantics:
 *   - `warn` / `crit`     — breached when value ≥ threshold (higher = worse)
 *   - `warnBelow`/`critBelow` — breached when value ≤ threshold (lower = worse)
 * Exactly one direction per KPI.
 */

export type KpiDirection = "higher-worse" | "lower-worse";

export interface KpiThresholds {
  warn?: number;
  crit?: number;
  warnBelow?: number;
  critBelow?: number;
}

export interface KpiDefinition {
  key: string;
  label_ar: string;
  label_en: string;
  unit_ar?: string;
  unit_en?: string;
  direction: KpiDirection;
  thresholds: KpiThresholds;
  /** Localized "I noticed a rise in X — show details?" nudge. */
  nudge_ar?: string;
  nudge_en?: string;
}

export type KpiBreachLevel = "ok" | "warn" | "crit";

export interface KpiValue {
  key: string;
  value: number;
}

export interface KpiEvaluation {
  def: KpiDefinition;
  value: number;
  level: KpiBreachLevel;
  breached: boolean;
}

export const KPI_REGISTRY: KpiDefinition[] = [
  {
    key: "criticalIncidents",
    label_ar: "الحوادث الحرجة",
    label_en: "Critical incidents",
    direction: "higher-worse",
    thresholds: { warn: 5, crit: 8 },
    nudge_ar: "لاحظت ارتفاعاً في الحوادث الحرجة — أعرض التفاصيل؟",
    nudge_en: "I noticed a rise in critical incidents — show details?",
  },
  {
    key: "mttrMin",
    label_ar: "متوسط زمن الاستجابة (دقيقة)",
    label_en: "MTTR (min)",
    unit_ar: "د",
    unit_en: "min",
    direction: "higher-worse",
    thresholds: { warn: 25, crit: 40 },
    nudge_ar: "لاحظت ارتفاعاً في زمن الاستجابة — أعرض التفاصيل؟",
    nudge_en: "MTTR is trending up — want the drill-down?",
  },
  {
    key: "resolutionRate",
    label_ar: "معدل الإنجاز",
    label_en: "Resolution rate",
    unit_ar: "%",
    unit_en: "%",
    direction: "lower-worse",
    thresholds: { warnBelow: 92, critBelow: 85 },
    nudge_ar: "معدل الإنجاز أقل من حد الأمان — أعرض التحليل؟",
    nudge_en: "Resolution rate dipped below the safety band — review?",
  },
  {
    key: "openWorkOrders",
    label_ar: "أوامر العمل المفتوحة",
    label_en: "Open work orders",
    direction: "higher-worse",
    thresholds: { warn: 60, crit: 80 },
    nudge_ar: "أوامر العمل المفتوحة مرتفعة — أعرض القائمة؟",
    nudge_en: "Open work-order backlog is high — show the list?",
  },
];

export function getKpiDef(key: string): KpiDefinition | undefined {
  return KPI_REGISTRY.find((k) => k.key === key);
}

export function evaluateKpi(def: KpiDefinition, value: number): KpiEvaluation {
  const t = def.thresholds;
  let level: KpiBreachLevel = "ok";
  if (def.direction === "higher-worse") {
    if (t.crit !== undefined && value >= t.crit) level = "crit";
    else if (t.warn !== undefined && value >= t.warn) level = "warn";
  } else {
    if (t.critBelow !== undefined && value <= t.critBelow) level = "crit";
    else if (t.warnBelow !== undefined && value <= t.warnBelow) level = "warn";
  }
  return { def, value, level, breached: level !== "ok" };
}

export function evaluateAll(values: KpiValue[]): KpiEvaluation[] {
  return values
    .map((v) => {
      const def = getKpiDef(v.key);
      if (!def) return null;
      return evaluateKpi(def, v.value);
    })
    .filter((e): e is KpiEvaluation => e !== null);
}

/** Render a compact evidence block (bilingual) for the chat system prompt. */
export function formatKpiEvidence(
  evals: KpiEvaluation[],
  lang: "ar" | "en",
): string {
  if (!evals.length) return "";
  const header = lang === "ar" ? "المؤشرات الحية (الأدلة):" : "Live KPIs (evidence):";
  const rows = evals.map((e) => {
    const label = lang === "ar" ? e.def.label_ar : e.def.label_en;
    const unit = lang === "ar" ? (e.def.unit_ar ?? "") : (e.def.unit_en ?? "");
    const t = e.def.thresholds;
    const band =
      e.def.direction === "higher-worse"
        ? `warn≥${t.warn ?? "-"} · crit≥${t.crit ?? "-"}`
        : `warn≤${t.warnBelow ?? "-"} · crit≤${t.critBelow ?? "-"}`;
    const flag = e.level === "crit" ? "❗CRIT" : e.level === "warn" ? "⚠WARN" : "OK";
    return `- ${label}: ${e.value}${unit} · [${band}] · ${flag}`;
  });
  return [header, ...rows].join("\n");
}
