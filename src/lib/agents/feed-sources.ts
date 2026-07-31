/**
 * التغذية الراجعة لكل وكيل — من أين يستمد الوكيل بياناته.
 *
 * خريطة ثابتة تربط كل وكيل من الثلاثة عشر بالمصادر الفعلية المعلنة في
 * لوحة التدفق (AGENTIC FLOW CANVAS): SAP · Power BI · Microsoft 365 · نفاذ ·
 * مستشعرات IoT · البلاغات · التصاريح · قاعدة المعرفة (RAG) · سجل التدقيق.
 *
 * لا أرقام ولا حالات هنا — أسماء مصادر فقط، فلا تتعارض مع بوابة الأدلة.
 */

export type FeedSourceId =
  | "sap"
  | "powerbi"
  | "m365"
  | "nafath"
  | "sensors"
  | "incidents"
  | "permits"
  | "knowledge"
  | "audit";

export interface FeedSource {
  id: FeedSourceId;
  labelAr: string;
  labelEn: string;
}

export const FEED_SOURCES: Record<FeedSourceId, FeedSource> = {
  sap: { id: "sap", labelAr: "SAP · الأصول", labelEn: "SAP · Assets" },
  powerbi: { id: "powerbi", labelAr: "Power BI · المؤشرات", labelEn: "Power BI · KPIs" },
  m365: { id: "m365", labelAr: "Microsoft 365", labelEn: "Microsoft 365" },
  nafath: { id: "nafath", labelAr: "نفاذ · الهوية", labelEn: "Nafath · Identity" },
  sensors: { id: "sensors", labelAr: "مستشعرات IoT", labelEn: "IoT Sensors" },
  incidents: { id: "incidents", labelAr: "البلاغات", labelEn: "Incidents" },
  permits: { id: "permits", labelAr: "التصاريح", labelEn: "Permits" },
  knowledge: { id: "knowledge", labelAr: "قاعدة المعرفة · RAG", labelEn: "Knowledge Base · RAG" },
  audit: { id: "audit", labelAr: "سجل التدقيق", labelEn: "Audit Log" },
};

const BY_AGENT_ID: Record<string, readonly FeedSourceId[]> = {
  nx_hcis_compliance_lead: ["knowledge", "permits", "audit"],
  nx_rag_knowledge_director: ["knowledge", "m365", "audit"],
  nx_human_approval_coordinator: ["m365", "permits", "audit"],
  nx_iso27001_auditor: ["audit", "nafath", "knowledge"],
  nx_observability_trace_agent: ["powerbi", "sensors", "audit"],
  nx_board_briefing_director: ["powerbi", "m365", "incidents"],
  nx_enterprise_risk_director: ["incidents", "sensors", "powerbi"],
  nx_governance_assurance_director: ["audit", "nafath", "knowledge"],
  nx_accessibility_quality_lead: ["knowledge", "audit"],
  nx_hse_assurance_director: ["permits", "incidents", "sensors"],
  nx_integration_architecture_lead: ["sap", "m365", "powerbi"],
  nx_operations_command_director: ["incidents", "sensors", "sap"],
  nx_records_governance_lead: ["audit", "permits", "m365"],
};

const BY_CATEGORY: Record<string, readonly FeedSourceId[]> = {
  compliance: ["knowledge", "audit", "permits"],
  "data-ai": ["knowledge", "m365"],
  "agent-platform": ["powerbi", "audit"],
  executive: ["powerbi", "m365"],
  engineering: ["sap", "m365"],
  security: ["permits", "incidents", "sensors"],
  operations: ["incidents", "sap", "sensors"],
};

/** مصادر التغذية الراجعة لوكيل — بالمعرّف أولًا ثم بالفئة، وإلا مصادر عامة. */
export function feedSourcesFor(agentId: string, category?: string): FeedSource[] {
  const ids =
    BY_AGENT_ID[agentId] ??
    (category ? BY_CATEGORY[category] : undefined) ??
    (["knowledge", "audit"] as const);
  return ids.map((id) => FEED_SOURCES[id]);
}
