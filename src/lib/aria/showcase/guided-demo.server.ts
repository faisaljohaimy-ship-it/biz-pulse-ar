import type { ShowcaseScenario, ShowcaseStep } from "./types";
import { buildExecutiveTour } from "./executive-tour.server";
import { assertStep, SHOWCASE_CONTRACTS } from "./contracts";

export interface GuidedDemoOptions {
  readonly scenarioId?: string;
  readonly includeQa?: boolean;
}

export function planGuidedDemo(opts: GuidedDemoOptions = {}): readonly ShowcaseStep[] {
  const opening: ShowcaseStep = {
    id: "demo-opening",
    phase: "welcome",
    title_ar: "الافتتاحية التنفيذية",
    title_en: "Executive Opening",
    narration_ar: "سنبدأ بجولة موجزة تعرض القدرة التشغيلية.",
    narration_en: "We'll begin with a brief tour of operational capability.",
    durationMs: 6_000,
  };
  const closing: ShowcaseStep = {
    id: "demo-closing",
    phase: "closing",
    title_ar: "الختام",
    title_en: "Closing",
    narration_ar: "شكراً لوقتكم. يمكنكم طرح الأسئلة الآن.",
    narration_en: "Thank you for your time. Questions are welcome now.",
    durationMs: 4_000,
  };
  const qa: ShowcaseStep = {
    id: "demo-qa",
    phase: "qa",
    title_ar: "أسئلة تنفيذية",
    title_en: "Executive Q&A",
    narration_ar: "أنا هنا للإجابة عن أسئلتكم بأدلة موثقة.",
    narration_en: "I'm here to answer your questions with evidence.",
    durationMs: 20_000,
  };
  const steps = [opening, ...buildExecutiveTour(), ...(opts.includeQa === false ? [] : [qa]), closing];
  steps.forEach(assertStep);
  if (steps.length > SHOWCASE_CONTRACTS.MAX_STEPS) throw new Error("guided demo too long");
  return steps;
}
