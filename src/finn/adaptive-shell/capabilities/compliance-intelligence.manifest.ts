import type { CapabilityManifest } from "../schemas/manifests";

/** Compliance-intelligence capability built on the briefing foundation. */
export const manifest: CapabilityManifest = {
  kind: "capability",
  id: "capability.compliance-intelligence",
  name: "ذكاء الامتثال",
  description: "تحليل حالة الامتثال وربط الحوادث بالتوجيهات عبر المحلل المتخصص",
  requiredSkills: ["skill.sec-compliance-briefing"],
  requiredTools: ["tool.hcis-directives-lookup"],
  requiredAgents: ["agent.sec-compliance-analyst"],
  runtimeRequirements: ["intel.runtime"],
  permissions: ["read:hcis"],
  dependencies: ["capability.executive-briefing"],
  metadata: { locale: "ar", surface: "hcis" },
};
