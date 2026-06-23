import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SecSite = {
  id: string; code: string; name_ar: string; name_en: string;
  lat: number | null; lng: number | null; sensitivity: string; status: string;
  guards_count: number; notes: string | null; updated_at: string;
};
export type SecIncident = {
  id: string; ref: string; site_id: string | null; category: string;
  title_ar: string; title_en: string; severity: string; status: string;
  owner: string | null; reported_at: string; resolved_at: string | null;
  response_minutes: number | null; root_cause: string | null; ai_summary: string | null;
};
export type SecPatrol = {
  id: string; ref: string; site_id: string | null; team: string; route: string;
  status: string; checkpoints_total: number; checkpoints_done: number;
  started_at: string | null; ended_at: string | null;
};
export type SecVisitor = {
  id: string; ref: string; site_id: string | null; full_name: string;
  organization: string | null; host: string; purpose: string | null; badge_no: string | null;
  check_in_at: string; check_out_at: string | null; status: string;
};
export type SecContractor = {
  id: string; ref: string; name: string; contract_no: string;
  workers_count: number; compliance_score: number; status: string; expires_at: string | null;
};
export type SecPermit = {
  id: string; ref: string; site_id: string | null; work_type: string;
  contractor: string; risk_level: string; status: string;
  starts_at: string; ends_at: string; approver: string | null; notes: string | null;
};
export type SecAsset = {
  id: string; code: string; name_ar: string; name_en: string; kind: string;
  site_id: string | null; health: number; status: string; last_seen_at: string;
};
export type SecCctvAlert = {
  id: string; ref: string; site_id: string | null; camera_code: string;
  alert_type: string; confidence: number; status: string; detected_at: string;
  acknowledged_by: string | null;
};

export type SecOverview = {
  sites: SecSite[];
  incidents: SecIncident[];
  patrols: SecPatrol[];
  visitors: SecVisitor[];
  contractors: SecContractor[];
  permits: SecPermit[];
  assets: SecAsset[];
  cctv: SecCctvAlert[];
  counts: {
    sites: number; incidents_open: number; incidents_critical: number;
    patrols_active: number; visitors_inside: number; permits_active: number;
    cctv_new: number; assets_offline: number; contractors_active: number;
  };
};

export const getSecOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecOverview> => {
    const { supabase } = context;
    const [sites, incidents, patrols, visitors, contractors, permits, assets, cctv] = await Promise.all([
      supabase.from("sec_sites").select("*").order("code"),
      supabase.from("sec_incidents").select("*").order("reported_at", { ascending: false }).limit(200),
      supabase.from("sec_patrols").select("*").order("started_at", { ascending: false, nullsFirst: false }).limit(200),
      supabase.from("sec_visitors").select("*").order("check_in_at", { ascending: false }).limit(200),
      supabase.from("sec_contractors").select("*").order("name"),
      supabase.from("sec_permits").select("*").order("starts_at", { ascending: false }).limit(200),
      supabase.from("sec_assets").select("*").order("code"),
      supabase.from("sec_cctv_alerts").select("*").order("detected_at", { ascending: false }).limit(200),
    ]);

    const I = (incidents.data ?? []) as SecIncident[];
    const P = (patrols.data ?? []) as SecPatrol[];
    const V = (visitors.data ?? []) as SecVisitor[];
    const C = (contractors.data ?? []) as SecContractor[];
    const PM = (permits.data ?? []) as SecPermit[];
    const A = (assets.data ?? []) as SecAsset[];
    const CCTV = (cctv.data ?? []) as SecCctvAlert[];

    return {
      sites: (sites.data ?? []) as SecSite[],
      incidents: I, patrols: P, visitors: V, contractors: C,
      permits: PM, assets: A, cctv: CCTV,
      counts: {
        sites: (sites.data ?? []).length,
        incidents_open: I.filter(i => i.status !== "resolved" && i.status !== "closed").length,
        incidents_critical: I.filter(i => i.severity === "critical" && i.status !== "closed").length,
        patrols_active: P.filter(p => p.status === "active").length,
        visitors_inside: V.filter(v => v.status === "inside" || v.status === "overdue").length,
        permits_active: PM.filter(p => p.status === "active" || p.status === "approved").length,
        cctv_new: CCTV.filter(c => c.status === "new").length,
        assets_offline: A.filter(a => a.status === "offline" || a.status === "degraded").length,
        contractors_active: C.filter(c => c.status === "active").length,
      },
    };
  });
