/**
 * ToolRegistry — interface-only catalogue of external tools ARIA WILL be
 * able to call in later phases. Phase 3 exposes metadata only. No tool
 * performs real work; `invoke()` is intentionally absent.
 */

export type ToolId =
  | "sap"
  | "outlook"
  | "teams"
  | "m365"
  | "power_bi"
  | "database"
  | "reports"
  | "notifications"
  | "maps"
  | "digital_twin";

export type ToolCategory =
  | "erp"
  | "communication"
  | "collaboration"
  | "productivity"
  | "analytics"
  | "data"
  | "reporting"
  | "notification"
  | "geospatial"
  | "simulation";

export interface ToolDescriptor {
  readonly id: ToolId;
  readonly label_ar: string;
  readonly label_en: string;
  readonly category: ToolCategory;
  /** Phase 3 flag — always `false` until the tool is wired in a later phase. */
  readonly available: false;
  /** Every real invocation via this tool requires explicit approval. */
  readonly approvalRequired: true;
}

const TOOLS: Readonly<Record<ToolId, ToolDescriptor>> = {
  sap: { id: "sap", label_ar: "ساب", label_en: "SAP", category: "erp", available: false, approvalRequired: true },
  outlook: { id: "outlook", label_ar: "أوتلوك", label_en: "Outlook", category: "communication", available: false, approvalRequired: true },
  teams: { id: "teams", label_ar: "تيمز", label_en: "Teams", category: "collaboration", available: false, approvalRequired: true },
  m365: { id: "m365", label_ar: "مايكروسوفت 365", label_en: "Microsoft 365", category: "productivity", available: false, approvalRequired: true },
  power_bi: { id: "power_bi", label_ar: "باور بي آي", label_en: "Power BI", category: "analytics", available: false, approvalRequired: true },
  database: { id: "database", label_ar: "قاعدة البيانات", label_en: "Database", category: "data", available: false, approvalRequired: true },
  reports: { id: "reports", label_ar: "التقارير", label_en: "Reports", category: "reporting", available: false, approvalRequired: true },
  notifications: { id: "notifications", label_ar: "الإشعارات", label_en: "Notifications", category: "notification", available: false, approvalRequired: true },
  maps: { id: "maps", label_ar: "الخرائط", label_en: "Maps", category: "geospatial", available: false, approvalRequired: true },
  digital_twin: { id: "digital_twin", label_ar: "التوأم الرقمي", label_en: "Digital Twin", category: "simulation", available: false, approvalRequired: true },
};

export const toolRegistry = {
  list(): readonly ToolDescriptor[] {
    return Object.values(TOOLS);
  },
  get(id: ToolId): ToolDescriptor {
    return TOOLS[id];
  },
  has(id: string): id is ToolId {
    return Object.prototype.hasOwnProperty.call(TOOLS, id);
  },
  /** Phase 3: no tool is available for real execution. */
  isAvailable(_id: ToolId): false {
    return false;
  },
};
