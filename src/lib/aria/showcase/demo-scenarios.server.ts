import type { ShowcaseScenario } from "./types";
import { buildExecutiveTour } from "./executive-tour.server";

const SCENARIOS: readonly ShowcaseScenario[] = [
  {
    id: "operations-overview",
    name_ar: "نظرة عامة على العمليات",
    name_en: "Operations Overview",
    steps: buildExecutiveTour(),
    kpis: ["open_incidents", "high_risks", "completed_patrols"],
  },
  {
    id: "executive-briefing",
    name_ar: "الإحاطة التنفيذية",
    name_en: "Executive Briefing",
    steps: buildExecutiveTour().slice(0, 2),
    kpis: ["open_incidents", "high_risks"],
  },
];

export function listScenarios(): readonly ShowcaseScenario[] { return SCENARIOS; }
export function getScenario(id: string): ShowcaseScenario | null {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
