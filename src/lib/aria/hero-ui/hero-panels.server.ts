import type { HeroPanelDirective, HeroState } from "./types";

export function computePanels(state: HeroState): readonly HeroPanelDirective[] {
  const base: HeroPanelDirective[] = [
    {
      id: "kpi-open-incidents",
      title_ar: "الحوادث المفتوحة",
      title_en: "Open Incidents",
      variant: "kpi",
      priority: 90,
    },
    {
      id: "kpi-high-risk",
      title_ar: "المخاطر العالية",
      title_en: "High Risks",
      variant: "kpi",
      priority: 85,
    },
    {
      id: "trust-evidence",
      title_ar: "الأدلة",
      title_en: "Evidence",
      variant: "trust",
      priority: 70,
    },
    {
      id: "action-briefing",
      title_ar: "الإحاطة التنفيذية",
      title_en: "Executive Briefing",
      variant: "action",
      priority: 60,
    },
  ];
  if (state === "explaining") {
    base.push({
      id: "insight-drilldown",
      title_ar: "التفاصيل",
      title_en: "Drill-down",
      variant: "insight",
      priority: 95,
    });
  }
  if (state === "warning") {
    base.push({
      id: "action-mitigate",
      title_ar: "خطة التخفيف",
      title_en: "Mitigation Plan",
      variant: "action",
      priority: 98,
    });
  }
  return base.sort((a, b) => b.priority - a.priority);
}
