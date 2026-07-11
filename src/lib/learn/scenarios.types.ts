/**
 * Executive scenarios for the Knowledge Bridge simulations.
 *
 * `decision_scenario` — a bilingual, multi-step executive drill. Each step
 * presents a real-world situation with live KPIs, three executive options,
 * and consequences. Correct choices increase readiness; wrong ones surface a
 * post-mortem so the executive learns from the miss.
 *
 * `digital_twin` and `knowledge_graph` have their own dedicated components.
 */

export interface Bi {
  ar: string;
  en: string;
}

export interface KpiChange {
  key: string; // machine key
  label: Bi;
  delta: number; // absolute delta applied to running KPI (0..100 clamp)
}

export interface DecisionOption {
  label: Bi;
  correct: boolean;
  feedback: Bi;
  kpiChanges: KpiChange[];
}

export interface DecisionStep {
  headline: Bi;
  briefing: Bi; // executive brief for the step
  metrics: Array<{ label: Bi; value: string; tone?: "good" | "warn" | "bad" }>;
  options: DecisionOption[];
}

export interface DecisionScenario {
  kind: "decision_scenario";
  initialKpis: Array<{ key: string; label: Bi; value: number }>; // 0..100
  steps: DecisionStep[];
  debrief: Bi; // shown at the end
}
