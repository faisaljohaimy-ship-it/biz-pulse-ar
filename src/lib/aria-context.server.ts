import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Build a compact, executive-grounded context block from live Supabase data
 * for the ARIA assistant. Read-only; uses the request-scoped supabase client
 * so RLS is enforced as the calling user.
 */
export async function buildAriaContext(supabase: SupabaseClient): Promise<string> {
  try {
    const [kpisQ, crisesQ, alertsQ, eventsQ, outcomesQ, decisionsQ, knowledgeQ] = await Promise.all([
      supabase.from("pulse_kpis").select("name,value,target,unit,trend,status,domain").limit(20),
      supabase.from("pulse_crises").select("title,severity,status,owner,impact").eq("status", "open").limit(10),
      supabase.from("intelligence_alerts").select("title,severity,owner,business_impact_score").is("resolved_at", null).order("business_impact_score", { ascending: false }).limit(10),
      supabase.from("intelligence_events").select("title,kind,status,impact,owner,due_at").order("last_update", { ascending: false }).limit(10),
      supabase.from("business_outcomes").select("title,status,owner,progress,target_date").limit(10),
      supabase.from("pulse_memory").select("title,kind,owner,status").order("created_at", { ascending: false }).limit(8),
      supabase.from("knowledge_docs").select("title,summary").order("created_at", { ascending: false }).limit(6),
    ]);

    const sections: string[] = [];

    if (kpisQ.data?.length) {
      sections.push("## Live KPIs\n" + kpisQ.data.map((k) => `- ${k.name}: ${k.value}${k.unit ?? ""} (target ${k.target ?? "?"}, ${k.status ?? "?"}, ${k.trend ?? "?"})`).join("\n"));
    }
    if (crisesQ.data?.length) {
      sections.push("## Open Crises\n" + crisesQ.data.map((c) => `- [${c.severity}] ${c.title} — owner ${c.owner ?? "?"}`).join("\n"));
    }
    if (alertsQ.data?.length) {
      sections.push("## Top Open Alerts\n" + alertsQ.data.map((a) => `- [${a.severity}] ${a.title} (impact ${a.business_impact_score})`).join("\n"));
    }
    if (eventsQ.data?.length) {
      sections.push("## Recent Intelligence Events\n" + eventsQ.data.map((e) => `- ${e.title} [${e.kind}/${e.status}]`).join("\n"));
    }
    if (outcomesQ.data?.length) {
      sections.push("## Business Outcomes\n" + outcomesQ.data.map((o) => `- ${o.title} — ${o.status} ${o.progress ?? 0}% (${o.owner ?? "?"})`).join("\n"));
    }
    if (decisionsQ.data?.length) {
      sections.push("## Executive Memory\n" + decisionsQ.data.map((m) => `- [${m.kind}] ${m.title} (${m.status})`).join("\n"));
    }
    if (knowledgeQ.data?.length) {
      sections.push("## Knowledge Base Excerpts\n" + knowledgeQ.data.map((k) => `- ${k.title}: ${(k.summary ?? "").slice(0, 220)}`).join("\n"));
    }

    if (!sections.length) {
      return "NO_ENTERPRISE_DATA_AVAILABLE";
    }
    return sections.join("\n\n");
  } catch {
    return "ENTERPRISE_DATA_FETCH_FAILED";
  }
}
