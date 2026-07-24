import type { SkillManifest } from "../schemas/manifests";

/** Triage an operational incident against the compliance picture. */
export const manifest: SkillManifest = {
  kind: "skill",
  id: "skill.incident-triage",
  name: "فرز الحوادث",
  description: "فرز حادثة تشغيلية وربطها بالتوجيهات المنطبقة وتقدير خطورتها",
  category: "operations",
  inputs: [{ name: "incidentId", type: "string", required: true }],
  outputs: [{ name: "triage", type: "IncidentTriage" }],
  requiredTools: ["tool.hcis-directives-lookup"],
  requiredCapabilities: [],
  requiredPermissions: ["read:hcis"],
  dependencies: ["skill.sec-compliance-briefing"],
  version: "1.0.0",
  status: "active",
  owner: "nexios-ops",
  tags: ["incident", "triage", "sec"],
  metadata: { locale: "ar", audience: "operations" },
};
