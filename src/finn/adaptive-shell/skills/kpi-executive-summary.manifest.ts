import type { SkillManifest } from "../schemas/manifests";

/** Summarize KPI trends and anomalies for the executive brief. */
export const manifest: SkillManifest = {
  kind: "skill",
  id: "skill.kpi-executive-summary",
  name: "ملخص المؤشرات التنفيذي",
  description: "تلخيص اتجاهات المؤشرات وشذوذها وحالة الأهداف بلغة تنفيذية",
  category: "analytics",
  inputs: [{ name: "kpiIds", type: "string[]", required: true }],
  outputs: [{ name: "summary", type: "KpiExecutiveSummary" }],
  requiredTools: ["tool.kpi-series-reader"],
  requiredCapabilities: [],
  requiredPermissions: ["read:kpi"],
  dependencies: [],
  version: "1.0.0",
  status: "active",
  owner: "nexios-exec",
  tags: ["kpi", "trends", "briefing"],
  metadata: { locale: "ar", audience: "executive" },
};
