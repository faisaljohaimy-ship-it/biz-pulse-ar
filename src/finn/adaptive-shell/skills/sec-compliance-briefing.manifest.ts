import type { SkillManifest } from "../schemas/manifests";

/** Compose a compliance briefing for one SEC directive. */
export const manifest: SkillManifest = {
  kind: "skill",
  id: "skill.sec-compliance-briefing",
  name: "إحاطة امتثال SEC",
  description: "إحاطة تنفيذية عن حالة توجيه أمن صناعي محدد عبر المحطات",
  category: "compliance",
  inputs: [{ name: "directiveCode", type: "string", required: true }],
  outputs: [{ name: "briefing", type: "ComplianceBriefing" }],
  requiredTools: ["tool.hcis-directives-lookup"],
  requiredCapabilities: [],
  requiredPermissions: ["read:hcis"],
  dependencies: [],
  version: "1.0.0",
  status: "active",
  owner: "nexios-compliance",
  tags: ["sec", "hcis", "briefing"],
  metadata: { locale: "ar", audience: "executive" },
};
