import type { CapabilityManifest } from "../schemas/manifests";

/** The composed executive-briefing capability. */
export const manifest: CapabilityManifest = {
  kind: "capability",
  id: "capability.executive-briefing",
  name: "الإحاطة التنفيذية",
  description: "تجميع المؤشرات والامتثال في إحاطة تنفيذية واحدة عبر FINN",
  requiredSkills: ["skill.kpi-executive-summary", "skill.sec-compliance-briefing"],
  requiredTools: ["tool.kpi-series-reader", "tool.hcis-directives-lookup"],
  requiredAgents: ["agent.finn-executive"],
  runtimeRequirements: ["intel.runtime"],
  permissions: ["read:kpi", "read:hcis"],
  dependencies: [],
  metadata: { locale: "ar", surface: "boardroom" },
};
