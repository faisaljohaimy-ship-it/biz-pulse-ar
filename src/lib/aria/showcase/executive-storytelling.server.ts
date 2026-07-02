import type { StoryBeat } from "./types";

export interface StoryInput {
  readonly openIncidents?: number | null;
  readonly highRisks?: number | null;
  readonly completedPatrols?: number | null;
  readonly evidenceRefs?: readonly string[];
}

// Storytelling never invents numbers — unknown values are stated as such.
export function composeStory(input: StoryInput = {}): readonly StoryBeat[] {
  const refs = input.evidenceRefs ?? [];
  const beats: StoryBeat[] = [];
  const oi = fmt(input.openIncidents);
  beats.push({
    id: "story-situation",
    headline_ar: "الموقف الراهن", headline_en: "Current Situation",
    body_ar: `الحوادث المفتوحة: ${oi.ar}. تقدم أريا صورة موحّدة للحالة.`,
    body_en: `Open incidents: ${oi.en}. ARIA maintains a single operational picture.`,
    evidenceRefs: refs,
  });
  const hr = fmt(input.highRisks);
  beats.push({
    id: "story-risks",
    headline_ar: "المخاطر ذات الأولوية", headline_en: "Priority Risks",
    body_ar: `المخاطر العالية: ${hr.ar}. يتم إبرازها مع خطط تخفيف.`,
    body_en: `High risks: ${hr.en}. Each is surfaced with mitigation plans.`,
    evidenceRefs: refs,
  });
  const cp = fmt(input.completedPatrols);
  beats.push({
    id: "story-execution",
    headline_ar: "التنفيذ", headline_en: "Execution",
    body_ar: `الدوريات المكتملة اليوم: ${cp.ar}.`,
    body_en: `Patrols completed today: ${cp.en}.`,
    evidenceRefs: refs,
  });
  return beats;
}

function fmt(v: number | null | undefined): { ar: string; en: string } {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return { ar: "غير متاح", en: "unavailable" };
  }
  return { ar: String(v), en: String(v) };
}
