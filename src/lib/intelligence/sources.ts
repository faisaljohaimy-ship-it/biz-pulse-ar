/**
 * Intelligence Fabric — Data Source Adapter Layer
 *
 * Every signal that feeds the Pulse / Memory / Alerts engines flows through
 * this interface. Today the only live implementation is `SupabaseSource`
 * which reads from real project tables (tasks, messages, knowledge_docs,
 * intelligence_events, intelligence_alerts).
 *
 * Power BI / SAP / Oracle / Microsoft Fabric / Teams / SharePoint sources
 * each implement the same shape later — the UI never changes.
 */

export type SignalKind =
  | "kpi" // numeric metric snapshot (e.g. revenue, margin)
  | "incident" // operational disruption
  | "task" // unit of execution
  | "communication" // message / meeting / email
  | "decision" // recorded executive decision
  | "forecast"; // predicted future value

export type Signal = {
  source: string; // 'supabase' | 'powerbi' | 'sap' | ...
  kind: SignalKind;
  key: string; // stable identifier within the source
  value: number; // normalized 0-100 or absolute
  label: string;
  occurredAt: string; // ISO
  metadata?: Record<string, unknown>;
};

export interface IntelligenceSource {
  readonly id: string;
  readonly label: string;
  isAvailable(): Promise<boolean>;
  fetchSignals(window: { fromIso: string; toIso: string }): Promise<Signal[]>;
}

/**
 * PowerBISource — stub. Becomes real when the Microsoft Entra credentials
 * are wired (Tenant ID, Client ID, Client Secret, Workspace ID). Keeps the
 * interface stable so adding it later is a one-line registration.
 */
export class PowerBISource implements IntelligenceSource {
  readonly id = "powerbi";
  readonly label = "Microsoft Power BI";
  async isAvailable() {
    return Boolean(
      process.env.POWERBI_TENANT_ID &&
      process.env.POWERBI_CLIENT_ID &&
      process.env.POWERBI_CLIENT_SECRET &&
      process.env.POWERBI_WORKSPACE_ID,
    );
  }
  async fetchSignals() {
    return [] as Signal[];
  }
}

export const REGISTERED_SOURCES = ["supabase", "powerbi"] as const;
export type RegisteredSource = (typeof REGISTERED_SOURCES)[number];
