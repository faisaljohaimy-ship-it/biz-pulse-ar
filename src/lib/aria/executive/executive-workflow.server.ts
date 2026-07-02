import type { ExecutiveWorkflow, WorkflowStep } from "./types";

const CATALOG: readonly ExecutiveWorkflow[] = [
  {
    id: "morning-briefing",
    name_ar: "الإحاطة الصباحية",
    name_en: "Morning Briefing",
    steps: [
      { id: "review-alerts", title_ar: "مراجعة التنبيهات", title_en: "Review alerts", kind: "review" },
      { id: "review-priorities", title_ar: "مراجعة الأولويات", title_en: "Review priorities", kind: "review" },
      { id: "acknowledge", title_ar: "الإقرار", title_en: "Acknowledge", kind: "acknowledge", requires: ["review-alerts", "review-priorities"] },
    ],
  },
  {
    id: "incident-review",
    name_ar: "مراجعة حادثة",
    name_en: "Incident Review",
    steps: [
      { id: "load-evidence", title_ar: "تحميل الأدلة", title_en: "Load evidence", kind: "review" },
      { id: "assign-owner", title_ar: "تعيين مسؤول", title_en: "Assign owner", kind: "delegate", requires: ["load-evidence"] },
      { id: "approve-plan", title_ar: "اعتماد الخطة", title_en: "Approve plan", kind: "approve", requires: ["assign-owner"] },
    ],
  },
  {
    id: "decision-support",
    name_ar: "دعم القرار",
    name_en: "Decision Support",
    steps: [
      { id: "summarize-options", title_ar: "تلخيص الخيارات", title_en: "Summarize options", kind: "review" },
      { id: "await-decision", title_ar: "انتظار القرار", title_en: "Await decision", kind: "wait", requires: ["summarize-options"] },
      { id: "record-decision", title_ar: "توثيق القرار", title_en: "Record decision", kind: "approve", requires: ["await-decision"] },
    ],
  },
];

export function listExecutiveWorkflows(): readonly ExecutiveWorkflow[] { return CATALOG; }
export function getExecutiveWorkflow(id: string): ExecutiveWorkflow | null {
  return CATALOG.find((w) => w.id === id) ?? null;
}

export function nextExecutiveSteps(wf: ExecutiveWorkflow, completed: readonly string[]): readonly WorkflowStep[] {
  const done = new Set(completed);
  return wf.steps.filter((s) => !done.has(s.id) && (s.requires ?? []).every((r) => done.has(r)));
}
