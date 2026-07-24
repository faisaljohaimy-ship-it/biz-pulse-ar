import type { ToolManifest } from "../schemas/manifests";

/** Read-only lookup over the HCIS directives reference (SEC/SAF). */
export const manifest: ToolManifest = {
  kind: "tool",
  id: "tool.hcis-directives-lookup",
  name: "باحث توجيهات الهيئة",
  provider: "nexios-hcis",
  description: "بحث قراءة فقط في مرجع توجيهات الأمن الصناعي (SEC/SAF) وأسماء نطاقاتها",
  inputs: [
    { name: "directiveCode", type: "string", required: true },
    { name: "section", type: "string", required: false },
  ],
  outputs: [{ name: "directive", type: "DirectiveSummary" }],
  permissions: ["read:hcis"],
  requiredCapabilities: [],
  authentication: "none",
  sandboxPolicy: "readonly",
  status: "active",
  metadata: { locale: "ar", domain: "compliance" },
};
