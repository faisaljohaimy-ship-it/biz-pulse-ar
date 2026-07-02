import type { ShowcaseStep } from "./types";
import { assertStep, SHOWCASE_CONTRACTS } from "./contracts";

// Deterministic executive tour — routes exist in the app; narration is bilingual.
export function buildExecutiveTour(): readonly ShowcaseStep[] {
  const steps: ShowcaseStep[] = [
    {
      id: "tour-mission-control",
      phase: "tour",
      title_ar: "مركز القيادة",
      title_en: "Mission Control",
      narration_ar: "من هنا نراقب العمليات الحية على مستوى المنشأة بلحظتها.",
      narration_en: "This is where we monitor live enterprise operations in real time.",
      targetRoute: "/mission-control",
      durationMs: 12_000,
    },
    {
      id: "tour-operations",
      phase: "tour",
      title_ar: "العمليات",
      title_en: "Operations",
      narration_ar: "شاشة العمليات تعرض دوريات الأمن والتصاريح والحوادث المفتوحة.",
      narration_en: "Operations shows security patrols, permits, and open incidents.",
      targetRoute: "/operations",
      durationMs: 14_000,
    },
    {
      id: "tour-executive-reports",
      phase: "tour",
      title_ar: "التقارير التنفيذية",
      title_en: "Executive Reports",
      narration_ar: "التقارير التنفيذية موقوفة على الأدلة، وقابلة للإرسال عبر Outlook.",
      narration_en: "Executive reports are evidence-linked and can be delivered via Outlook.",
      targetRoute: "/executive-reports",
      durationMs: 14_000,
    },
  ];
  steps.forEach(assertStep);
  if (steps.length > SHOWCASE_CONTRACTS.MAX_STEPS) throw new Error("tour too long");
  return steps;
}
