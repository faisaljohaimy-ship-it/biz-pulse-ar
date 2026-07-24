import type { AgentManifest } from "../schemas/manifests";

/** Specialist analyst for SEC compliance work, supervised mode. */
export const manifest: AgentManifest = {
  kind: "agent",
  id: "agent.sec-compliance-analyst",
  name: "محلل امتثال SEC",
  role: "compliance-analyst",
  description: "محلل متخصص في توجيهات الأمن الصناعي وفرز الحوادث المرتبطة بها",
  systemPrompt:
    "أنت محلل امتثال متخصص في توجيهات SEC/SAF. حلل وفرز واستشهد بالمرجع — لا تنفيذ ذاتيًا.",
  supportedSkills: ["skill.sec-compliance-briefing", "skill.incident-triage"],
  supportedTools: ["tool.hcis-directives-lookup"],
  supportedCapabilities: ["capability.compliance-intelligence"],
  memoryProfile: "session",
  contextWindow: 64000,
  executionMode: "supervised",
  permissions: ["read:hcis"],
  priority: 5,
  dependencies: ["agent.finn-executive"],
  metadata: { locale: "ar", domain: "compliance" },
};
