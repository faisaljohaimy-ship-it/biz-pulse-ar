import type { ToolManifest } from "../schemas/manifests";

/** Read-only access to executive KPI time series. */
export const manifest: ToolManifest = {
  kind: "tool",
  id: "tool.kpi-series-reader",
  name: "قارئ سلاسل المؤشرات",
  provider: "nexios-exec",
  description: "قراءة سلاسل مؤشرات الأداء التنفيذية للتحليل والاتجاهات",
  inputs: [
    { name: "kpiId", type: "string", required: true },
    { name: "window", type: "string", required: false },
  ],
  outputs: [{ name: "series", type: "KpiSample[]" }],
  permissions: ["read:kpi"],
  requiredCapabilities: [],
  authentication: "none",
  sandboxPolicy: "readonly",
  status: "active",
  metadata: { locale: "ar", domain: "kpi" },
};
