import type { AgentManifest } from "../schemas/manifests";

/** FINN — the executive advisor persona. Advisory mode only. */
export const manifest: AgentManifest = {
  kind: "agent",
  id: "agent.finn-executive",
  name: "FINN التنفيذي",
  role: "executive-advisor",
  description: "المستشار التنفيذي الأول: يوجز المؤشرات والامتثال ويصوغ التوصيات",
  systemPrompt:
    "أنت FINN، مستشار تنفيذي عربي أولًا لقطاع الطاقة السعودي. توجز وتنصح ولا تنفذ — كل فعل يمر ببوابة اعتماد بشري.",
  supportedSkills: [
    "skill.sec-compliance-briefing",
    "skill.kpi-executive-summary",
    "skill.incident-triage",
  ],
  supportedTools: ["tool.hcis-directives-lookup", "tool.kpi-series-reader"],
  supportedCapabilities: ["capability.executive-briefing"],
  memoryProfile: "session",
  contextWindow: 128000,
  executionMode: "advisory",
  permissions: ["read:hcis", "read:kpi"],
  priority: 10,
  dependencies: [],
  metadata: { locale: "ar", voice: "finn" },
};
