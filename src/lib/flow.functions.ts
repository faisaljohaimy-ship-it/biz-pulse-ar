// Public showcase topology for the Agentic Flow Canvas.
// Reads sanitized agent_connections + agent_definitions for the showcase
// org only, via the server admin client (RLS restricts anon reads).
// No org_id, no user data, no proposals — pure display topology.

import { createServerFn } from "@tanstack/react-start";

const SHOWCASE_ORG_ID = "00000000-0000-0000-0000-000000000001";

export type FlowNodeKind = "source" | "agent" | "aria" | "gate";

export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  name_ar: string;
  name_en: string;
  specialty?: string;
  severity?: string;
  icon?: string;
  current_mission?: string;
}

export type FlowLinkType = "command" | "result" | "data" | "approval_suggestion";

export interface FlowEdge {
  from: string;
  to: string;
  link_type: FlowLinkType;
  weight: number;
  status: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  is_simulation: boolean;
  captured_at: string;
}

const SOURCE_META: Record<string, { ar: string; en: string }> = {
  sap: { ar: "SAP · الأصول", en: "SAP · Assets" },
  powerbi: { ar: "Power BI · المؤشرات", en: "Power BI · KPIs" },
  m365: { ar: "Microsoft 365", en: "Microsoft 365" },
  nafath: { ar: "نفاذ · الهوية", en: "Nafath · Identity" },
  sensors: { ar: "مستشعرات IoT", en: "IoT Sensors" },
  incidents: { ar: "البلاغات", en: "Incidents" },
  permits: { ar: "التصاريح", en: "Permits" },
};

export const listShowcaseFlow = createServerFn({ method: "GET" }).handler(
  async (): Promise<FlowGraph> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [connectionsRes, agentsRes] = await Promise.all([
      supabaseAdmin
        .from("agent_connections")
        .select("from_node, from_kind, to_node, to_kind, link_type, weight, status")
        .eq("org_id", SHOWCASE_ORG_ID)
        .eq("is_simulation", true),
      supabaseAdmin
        .from("agent_definitions")
        .select("id, name, metadata, enabled")
        .eq("org_id", SHOWCASE_ORG_ID)
        .eq("enabled", true),
    ]);

    const rawEdges = connectionsRes.data ?? [];
    const rawAgents = agentsRes.data ?? [];

    const agentMap = new Map<string, FlowNode>();
    for (const a of rawAgents) {
      const meta = (a.metadata ?? {}) as Record<string, unknown>;
      agentMap.set(a.id, {
        id: a.id,
        kind: "agent",
        name_ar: (meta.name_ar as string) ?? a.name ?? a.id,
        name_en: (meta.name_en as string) ?? a.name ?? a.id,
        specialty: (meta.specialty as string) ?? undefined,
        severity: (meta.severity as string) ?? undefined,
        icon: (meta.icon as string) ?? undefined,
        current_mission: (meta.current_mission as string) ?? undefined,
      });
    }

    const nodes = new Map<string, FlowNode>();
    const addNode = (id: string, kind: FlowNodeKind) => {
      if (nodes.has(id)) return;
      if (kind === "agent") {
        const a = agentMap.get(id);
        if (a) {
          nodes.set(id, a);
          return;
        }
        nodes.set(id, { id, kind, name_ar: id, name_en: id });
        return;
      }
      if (kind === "source") {
        const meta = SOURCE_META[id];
        nodes.set(id, {
          id,
          kind,
          name_ar: meta?.ar ?? id,
          name_en: meta?.en ?? id,
        });
        return;
      }
      if (kind === "aria") {
        nodes.set(id, { id, kind, name_ar: "FINN", name_en: "FINN" });
        return;
      }
      nodes.set(id, {
        id,
        kind,
        name_ar: "بوابة الاعتماد البشري",
        name_en: "Human Approval Gate",
      });
    };

    const edges: FlowEdge[] = [];
    for (const e of rawEdges) {
      addNode(e.from_node, e.from_kind as FlowNodeKind);
      addNode(e.to_node, e.to_kind as FlowNodeKind);
      edges.push({
        from: e.from_node,
        to: e.to_node,
        link_type: e.link_type as FlowLinkType,
        weight: e.weight ?? 1,
        status: e.status ?? "active",
      });
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
      is_simulation: true,
      captured_at: new Date().toISOString(),
    };
  },
);
