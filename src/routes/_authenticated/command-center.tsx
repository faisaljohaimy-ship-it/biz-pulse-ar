import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield, Radio, AlertOctagon, Activity, MapPin, Camera, FileCheck2,
  UserCheck, HardHat, Cpu, Radar, Sparkles, Flame, ShieldAlert, Eye,
  FileDown, Mail, Inbox, Loader2, X, MessageSquare, Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { NexusPage, NexusCard, NexusPill, NexusStat } from "@/components/nexus-frame";
import { sendOutlookReport, listOutlookInbox } from "@/lib/outlook.functions";
import { listTeamsChannels, sendTeamsAlert } from "@/lib/teams.functions";
import { listSharePointSites, uploadReportToSharePoint } from "@/lib/sharepoint.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/command-center")({
  component: CommandCenterPage,
});

/* ────────────────── Types ────────────────── */
type Site = {
  id: string; code: string; name_ar: string; name_en: string;
  lat: number | null; lng: number | null;
  sensitivity: "low"|"medium"|"high"|"critical";
  status: "operational"|"degraded"|"offline"|"maintenance";
  guards_count: number;
};
type Incident = {
  id: string; ref: string; site_id: string|null; category: string;
  title_ar: string; title_en: string;
  severity: "low"|"medium"|"high"|"critical";
  status: "open"|"investigating"|"contained"|"resolved"|"closed";
  owner: string|null; reported_at: string; resolved_at: string|null;
  response_minutes: number|null; ai_summary: string|null;
};
type Patrol = {
  id: string; ref: string; site_id: string|null; team: string; route: string;
  status: "scheduled"|"active"|"completed"|"missed";
  checkpoints_total: number; checkpoints_done: number;
};
type Permit = {
  id: string; ref: string; work_type: string; contractor: string;
  risk_level: "low"|"medium"|"high"|"critical";
  status: "pending"|"approved"|"active"|"expired"|"revoked"|"closed";
  starts_at: string; ends_at: string;
};
type Visitor = {
  id: string; ref: string; full_name: string; organization: string|null;
  host: string; check_in_at: string; check_out_at: string|null;
  status: "expected"|"inside"|"left"|"overdue";
};
type Contractor = {
  id: string; name: string; workers_count: number; compliance_score: number;
  status: "active"|"suspended"|"blacklisted"|"expired";
};
type CctvAlert = {
  id: string; ref: string; site_id: string|null; camera_code: string;
  alert_type: string; confidence: number;
  status: "new"|"triaged"|"dispatched"|"resolved"|"false_positive";
  detected_at: string;
  acknowledged_by: string|null;
};
type Asset = {
  id: string; code: string; name_ar: string; name_en: string; kind: string;
  health: number; status: "online"|"degraded"|"offline"|"maintenance";
};

/* ────────────────── Data hooks ────────────────── */
function useSecOps() {
  const sites = useQuery({
    queryKey: ["sec_sites"],
    queryFn: async () => (await supabase.from("sec_sites").select("*").order("code")).data as Site[] ?? [],
  });
  const incidents = useQuery({
    queryKey: ["sec_incidents"],
    queryFn: async () => (await supabase.from("sec_incidents").select("*").order("reported_at", { ascending: false }).limit(20)).data as Incident[] ?? [],
    refetchInterval: 15_000,
  });
  const patrols = useQuery({
    queryKey: ["sec_patrols"],
    queryFn: async () => (await supabase.from("sec_patrols").select("*").order("started_at", { ascending: false, nullsFirst: false }).limit(20)).data as Patrol[] ?? [],
    refetchInterval: 20_000,
  });
  const permits = useQuery({
    queryKey: ["sec_permits"],
    queryFn: async () => (await supabase.from("sec_permits").select("*").order("starts_at", { ascending: false }).limit(20)).data as Permit[] ?? [],
  });
  const visitors = useQuery({
    queryKey: ["sec_visitors"],
    queryFn: async () => (await supabase.from("sec_visitors").select("*").order("check_in_at", { ascending: false }).limit(20)).data as Visitor[] ?? [],
  });
  const contractors = useQuery({
    queryKey: ["sec_contractors"],
    queryFn: async () => (await supabase.from("sec_contractors").select("*").order("compliance_score", { ascending: false })).data as Contractor[] ?? [],
  });
  const cctv = useQuery({
    queryKey: ["sec_cctv_alerts"],
    queryFn: async () => (await supabase.from("sec_cctv_alerts").select("*").order("detected_at", { ascending: false }).limit(20)).data as CctvAlert[] ?? [],
    refetchInterval: 10_000,
  });
  const assets = useQuery({
    queryKey: ["sec_assets"],
    queryFn: async () => (await supabase.from("sec_assets").select("*").order("code")).data as Asset[] ?? [],
  });

  // Realtime: incidents + cctv + patrols
  useEffect(() => {
    const ch = supabase
      .channel("command-center-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sec_incidents" }, () => incidents.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "sec_cctv_alerts" }, () => cctv.refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "sec_patrols" }, () => patrols.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Scope: Western Region only (جدة، مكة، ينبع، رابغ) ──
  const WEST_CODES = new Set(["SITE-JED-02","SITE-MEC-07","SITE-YAN-04","SITE-RAB-08"]);
  const allSites = (sites.data ?? []) as Site[];
  const westSites = allSites.filter(s => WEST_CODES.has(s.code));
  const westIds = new Set(westSites.map(s => s.id));
  const byWest = <T,>(rows: T[] | undefined): T[] =>
    (rows ?? []).filter((r) => {
      const sid = (r as { site_id?: string | null } | null)?.site_id;
      return !!sid && westIds.has(sid);
    });

  return {
    sites: { ...sites, data: westSites },
    incidents: { ...incidents, data: byWest<Incident>(incidents.data as Incident[] | undefined) },
    patrols: { ...patrols, data: byWest<Patrol>(patrols.data as Patrol[] | undefined) },
    permits: { ...permits, data: byWest<Permit>(permits.data as Permit[] | undefined) },
    visitors: { ...visitors, data: byWest<Visitor>(visitors.data as Visitor[] | undefined) },
    contractors: { ...contractors, data: byWest<Contractor>(contractors.data as Contractor[] | undefined) },
    cctv: { ...cctv, data: byWest<CctvAlert>(cctv.data as CctvAlert[] | undefined) },
    assets: { ...assets, data: byWest<Asset>(assets.data as Asset[] | undefined) },
  };
}

/* ────────────────── Visual helpers ────────────────── */
const SEVERITY_TONE: Record<string, string> = {
  critical: "rose", high: "amber", medium: "violet", low: "cyan",
};
const STATUS_DOT: Record<string, string> = {
  operational: "bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]",
  online: "bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]",
  active: "bg-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.7)]",
  degraded: "bg-amber-400 shadow-[0_0_12px_2px_rgba(251,191,36,0.7)]",
  maintenance: "bg-violet-400 shadow-[0_0_12px_2px_rgba(167,139,250,0.7)]",
  offline: "bg-rose-500 shadow-[0_0_12px_2px_rgba(244,63,94,0.85)]",
};

/* ────────────── Saudi Arabia Digital Twin Map ────────────── */
// Bounds tuned for KSA Western Region (Yanbu/Rabigh/Jeddah/Makkah)
const BOUNDS = { latMin: 20.5, latMax: 25.0, lngMin: 37.5, lngMax: 40.5 };
function projectKSA(lat: number, lng: number) {
  const x = ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * 100;
  const y = (1 - (lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * 100;
  return { x, y };
}

function DigitalTwinMap({ sites, incidents, cctv, ar }: {
  sites: Site[]; incidents: Incident[]; cctv: CctvAlert[]; ar: boolean;
}) {
  const [selected, setSelected] = useState<Site | null>(null);
  const liveIncidentsBySite = useMemo(() => {
    const m = new Map<string, number>();
    incidents.filter(i => ["open","investigating","contained"].includes(i.status))
      .forEach(i => { if (i.site_id) m.set(i.site_id, (m.get(i.site_id) ?? 0) + 1); });
    return m;
  }, [incidents]);
  const liveCctvBySite = useMemo(() => {
    const m = new Map<string, number>();
    cctv.filter(a => ["new","triaged","dispatched"].includes(a.status))
      .forEach(a => { if (a.site_id) m.set(a.site_id, (m.get(a.site_id) ?? 0) + 1); });
    return m;
  }, [cctv]);

  return (
    <NexusCard className="relative overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-cyan-300" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-100">
            {ar ? "التوأم الرقمي — المنطقة الغربية" : "Digital Twin — Western Region"}
          </h3>
        </div>
        <NexusPill tone="cyan"><span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
        </span> LIVE</NexusPill>
      </div>

      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Grid */}
        <svg className="absolute inset-0 h-full w-full opacity-20" preserveAspectRatio="none">
          <defs>
            <pattern id="grid-cc" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(34,211,238,0.4)" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="glow-cc" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(34,211,238,0.18)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-cc)" />
          <rect width="100%" height="100%" fill="url(#glow-cc)" />
        </svg>

        {/* Sweep radar */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="absolute h-[140%] w-[140%] animate-[radar-sweep_8s_linear_infinite] rounded-full"
               style={{ background: "conic-gradient(from 0deg, rgba(34,211,238,0.0) 0deg, rgba(34,211,238,0.18) 30deg, transparent 60deg)" }} />
        </div>

        {/* Site nodes */}
        {sites.map((s) => {
          if (s.lat == null || s.lng == null) return null;
          const { x, y } = projectKSA(s.lat, s.lng);
          const incCount = liveIncidentsBySite.get(s.id) ?? 0;
          const cctvCount = liveCctvBySite.get(s.id) ?? 0;
          const isHot = incCount > 0 || s.status === "degraded";
          return (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 transform"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span className="relative flex items-center justify-center">
                {isHot && (
                  <span className="absolute h-8 w-8 animate-ping rounded-full bg-rose-500/40" />
                )}
                <span className={`relative inline-flex h-3 w-3 rounded-full ${STATUS_DOT[s.status] ?? "bg-slate-400"}`} />
                {(incCount + cctvCount) > 0 && (
                  <span className="absolute -top-2 -right-3 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-lg">
                    {incCount + cctvCount}
                  </span>
                )}
              </span>
              <span className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-medium text-slate-200 opacity-0 ring-1 ring-cyan-500/30 backdrop-blur transition-opacity group-hover:opacity-100">
                {ar ? s.name_ar : s.name_en}
              </span>
            </button>
          );
        })}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-[10px] text-slate-300">
          <span className="flex items-center gap-1.5 rounded-md bg-slate-900/70 px-2 py-1 backdrop-blur"><span className="h-2 w-2 rounded-full bg-emerald-400" /> {ar ? "تشغيلي" : "Operational"}</span>
          <span className="flex items-center gap-1.5 rounded-md bg-slate-900/70 px-2 py-1 backdrop-blur"><span className="h-2 w-2 rounded-full bg-amber-400" /> {ar ? "متدهور" : "Degraded"}</span>
          <span className="flex items-center gap-1.5 rounded-md bg-slate-900/70 px-2 py-1 backdrop-blur"><span className="h-2 w-2 rounded-full bg-violet-400" /> {ar ? "صيانة" : "Maintenance"}</span>
          <span className="flex items-center gap-1.5 rounded-md bg-slate-900/70 px-2 py-1 backdrop-blur"><span className="h-2 w-2 rounded-full bg-rose-500" /> {ar ? "حادث نشط" : "Active incident"}</span>
        </div>

        {/* Selected site overlay */}
        {selected && (
          <div className="absolute right-3 top-3 w-64 rounded-xl border border-cyan-500/30 bg-slate-950/85 p-3 backdrop-blur-md">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] text-cyan-300/80">{selected.code}</div>
                <div className="text-sm font-semibold text-slate-100">{ar ? selected.name_ar : selected.name_en}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded bg-slate-900/60 px-2 py-1">
                <div className="text-slate-400">{ar ? "الحساسية" : "Sensitivity"}</div>
                <div className="font-semibold text-slate-100 capitalize">{selected.sensitivity}</div>
              </div>
              <div className="rounded bg-slate-900/60 px-2 py-1">
                <div className="text-slate-400">{ar ? "الحراس" : "Guards"}</div>
                <div className="font-semibold text-slate-100">{selected.guards_count}</div>
              </div>
              <div className="rounded bg-slate-900/60 px-2 py-1">
                <div className="text-slate-400">{ar ? "حوادث نشطة" : "Active inc."}</div>
                <div className="font-semibold text-rose-300">{liveIncidentsBySite.get(selected.id) ?? 0}</div>
              </div>
              <div className="rounded bg-slate-900/60 px-2 py-1">
                <div className="text-slate-400">{ar ? "تنبيهات CCTV" : "CCTV"}</div>
                <div className="font-semibold text-amber-300">{liveCctvBySite.get(selected.id) ?? 0}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes radar-sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </NexusCard>
  );
}

/* ────────────────── Incident feed ────────────────── */
function IncidentFeed({ items, sites, ar }: { items: Incident[]; sites: Site[]; ar: boolean }) {
  const siteName = (id: string|null) => {
    const s = sites.find(x => x.id === id);
    return s ? (ar ? s.name_ar : s.name_en) : "—";
  };
  return (
    <NexusCard>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-rose-300" />
          <h3 className="text-sm font-semibold text-slate-100">{ar ? "بث الحوادث المباشر" : "Live Incident Feed"}</h3>
        </div>
        <NexusPill tone="rose">{items.filter(i => ["open","investigating"].includes(i.status)).length} {ar ? "نشط" : "active"}</NexusPill>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {items.map(inc => (
          <div key={inc.id} className="group relative rounded-lg border border-slate-700/40 bg-slate-900/40 p-3 transition-all hover:border-cyan-500/40 hover:bg-slate-900/70">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <NexusPill tone={SEVERITY_TONE[inc.severity] as never}>{inc.severity}</NexusPill>
                  <span className="text-[10px] text-slate-400">{inc.ref}</span>
                  <span className="text-[10px] text-cyan-300/80">{inc.category}</span>
                </div>
                <div className="mt-1.5 text-sm font-semibold text-slate-100">{ar ? inc.title_ar : inc.title_en}</div>
                <div className="mt-1 text-[11px] text-slate-400">📍 {siteName(inc.site_id)} {inc.owner ? `· 👤 ${inc.owner}` : ""}</div>
                {inc.ai_summary && (
                  <div className="mt-2 flex gap-1.5 rounded-md bg-cyan-500/5 px-2 py-1.5 ring-1 ring-cyan-500/15">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-cyan-300" />
                    <p className="text-[11px] leading-snug text-cyan-100/90">{inc.ai_summary}</p>
                  </div>
                )}
              </div>
              <div className="text-right text-[10px]">
                <div className="text-slate-500">{new Date(inc.reported_at).toLocaleTimeString(ar ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                {inc.response_minutes != null && (
                  <div className="mt-0.5 font-semibold text-emerald-300">{inc.response_minutes}m</div>
                )}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-500">{ar ? "لا توجد حوادث." : "No incidents."}</p>}
      </div>
    </NexusCard>
  );
}

/* ────────────────── CCTV stream ────────────────── */
function CctvStream({ items, ar }: { items: CctvAlert[]; ar: boolean }) {
  return (
    <NexusCard>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-violet-300" />
          <h3 className="text-sm font-semibold text-slate-100">{ar ? "تنبيهات الكاميرات الذكية" : "AI CCTV Alerts"}</h3>
        </div>
        <NexusPill tone="violet">{items.filter(a => a.status === "new").length} new</NexusPill>
      </div>
      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
        {items.map(a => (
          <div key={a.id} className="flex items-center justify-between rounded-md border border-slate-700/40 bg-slate-900/40 px-2.5 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-violet-300">{a.camera_code}</span>
                <span className="text-xs font-medium text-slate-200 truncate">{a.alert_type}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                {new Date(a.detected_at).toLocaleTimeString(ar ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                {a.acknowledged_by ? ` · ${a.acknowledged_by}` : ""}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${a.confidence >= 0.9 ? "bg-rose-500/20 text-rose-200" : a.confidence >= 0.8 ? "bg-amber-500/20 text-amber-200" : "bg-slate-700/40 text-slate-300"}`}>
                {Math.round(a.confidence * 100)}%
              </span>
              <span className={`h-2 w-2 rounded-full ${a.status === "new" ? "bg-rose-400 animate-pulse" : a.status === "dispatched" ? "bg-amber-400" : a.status === "resolved" ? "bg-emerald-400" : "bg-slate-500"}`} />
            </div>
          </div>
        ))}
      </div>
    </NexusCard>
  );
}

/* ────────────────── Patrols + Permits + Visitors compact panels ────────────────── */
function PatrolsPanel({ items, ar }: { items: Patrol[]; ar: boolean }) {
  return (
    <NexusCard>
      <div className="mb-3 flex items-center gap-2">
        <Radio className="h-4 w-4 text-cyan-300" />
        <h3 className="text-sm font-semibold text-slate-100">{ar ? "الدوريات الميدانية" : "Field Patrols"}</h3>
      </div>
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {items.map(p => {
          const pct = p.checkpoints_total ? Math.round((p.checkpoints_done / p.checkpoints_total) * 100) : 0;
          return (
            <div key={p.id} className="rounded-md border border-slate-700/40 bg-slate-900/40 p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-100">{p.team}</span>
                <NexusPill tone={p.status === "active" ? "cyan" : p.status === "completed" ? "emerald" : p.status === "missed" ? "rose" : "violet"}>{p.status}</NexusPill>
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">{p.route} · {p.ref}</div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full transition-all ${p.status === "missed" ? "bg-rose-500" : "bg-cyan-400"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-0.5 text-right text-[10px] text-slate-500">{p.checkpoints_done}/{p.checkpoints_total}</div>
            </div>
          );
        })}
      </div>
    </NexusCard>
  );
}

function PermitsPanel({ items, ar }: { items: Permit[]; ar: boolean }) {
  return (
    <NexusCard>
      <div className="mb-3 flex items-center gap-2">
        <FileCheck2 className="h-4 w-4 text-amber-300" />
        <h3 className="text-sm font-semibold text-slate-100">{ar ? "تصاريح العمل" : "Work Permits"}</h3>
      </div>
      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
        {items.map(p => (
          <div key={p.id} className="rounded-md border border-slate-700/40 bg-slate-900/40 p-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">{p.work_type}</span>
              <NexusPill tone={SEVERITY_TONE[p.risk_level] as never}>{p.risk_level}</NexusPill>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">{p.contractor} · {p.ref}</div>
            <div className="mt-0.5 text-[10px] text-cyan-300/80 capitalize">{p.status}</div>
          </div>
        ))}
      </div>
    </NexusCard>
  );
}

function VisitorsPanel({ items, ar }: { items: Visitor[]; ar: boolean }) {
  return (
    <NexusCard>
      <div className="mb-3 flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-emerald-300" />
        <h3 className="text-sm font-semibold text-slate-100">{ar ? "الزوار" : "Visitors"}</h3>
      </div>
      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
        {items.map(v => (
          <div key={v.id} className="rounded-md border border-slate-700/40 bg-slate-900/40 p-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">{v.full_name}</span>
              <NexusPill tone={v.status === "inside" ? "cyan" : v.status === "overdue" ? "rose" : v.status === "left" ? "emerald" : "violet"}>{v.status}</NexusPill>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">{v.organization ?? "—"} · {ar ? "المضيف" : "Host"}: {v.host}</div>
          </div>
        ))}
      </div>
    </NexusCard>
  );
}

function AssetsHealth({ items, ar }: { items: Asset[]; ar: boolean }) {
  return (
    <NexusCard>
      <div className="mb-3 flex items-center gap-2">
        <Cpu className="h-4 w-4 text-cyan-300" />
        <h3 className="text-sm font-semibold text-slate-100">{ar ? "صحة الأنظمة الحرجة" : "Critical Systems Health"}</h3>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map(a => (
          <div key={a.id} className="rounded-md border border-slate-700/40 bg-slate-900/40 p-2.5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-100 truncate">{ar ? a.name_ar : a.name_en}</div>
                <div className="text-[10px] text-slate-500">{a.code} · {a.kind}</div>
              </div>
              <span className={`inline-flex h-2.5 w-2.5 rounded-full ${STATUS_DOT[a.status] ?? "bg-slate-400"}`} />
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div className={`h-full transition-all ${a.health >= 85 ? "bg-emerald-400" : a.health >= 65 ? "bg-amber-400" : "bg-rose-500"}`} style={{ width: `${a.health}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px]">
              <span className="text-slate-500 capitalize">{a.status}</span>
              <span className="font-semibold text-slate-200">{a.health}%</span>
            </div>
          </div>
        ))}
      </div>
    </NexusCard>
  );
}

function ContractorsPanel({ items, ar }: { items: Contractor[]; ar: boolean }) {
  return (
    <NexusCard>
      <div className="mb-3 flex items-center gap-2">
        <HardHat className="h-4 w-4 text-amber-300" />
        <h3 className="text-sm font-semibold text-slate-100">{ar ? "المقاولون والامتثال" : "Contractors & Compliance"}</h3>
      </div>
      <div className="space-y-1.5">
        {items.map(c => (
          <div key={c.id} className="flex items-center justify-between rounded-md border border-slate-700/40 bg-slate-900/40 px-2.5 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-100 truncate">{c.name}</div>
              <div className="text-[10px] text-slate-500">{c.workers_count} {ar ? "عامل" : "workers"}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`text-xs font-bold ${c.compliance_score >= 90 ? "text-emerald-300" : c.compliance_score >= 75 ? "text-amber-300" : "text-rose-300"}`}>
                {c.compliance_score}%
              </span>
              <NexusPill tone={c.status === "active" ? "emerald" : c.status === "suspended" ? "amber" : c.status === "blacklisted" ? "rose" : "violet"}>{c.status}</NexusPill>
            </div>
          </div>
        ))}
      </div>
    </NexusCard>
  );
}

/* ────────────────── Main page ────────────────── */
function CommandCenterPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { sites, incidents, patrols, permits, visitors, contractors, cctv, assets } = useSecOps();

  const sitesData = sites.data ?? [];
  const incData = incidents.data ?? [];
  const cctvData = cctv.data ?? [];

  const activeIncidents = incData.filter(i => ["open","investigating","contained"].includes(i.status));
  const criticalCount = activeIncidents.filter(i => i.severity === "critical").length;
  const newCctv = cctvData.filter(a => a.status === "new").length;
  const activePatrols = (patrols.data ?? []).filter(p => p.status === "active").length;
  const visitorsInside = (visitors.data ?? []).filter(v => v.status === "inside").length;
  const activePermits = (permits.data ?? []).filter(p => p.status === "active").length;
  const operationalSites = sitesData.filter(s => s.status === "operational").length;
  const avgResponse = (() => {
    const resolved = incData.filter(i => i.response_minutes != null);
    if (!resolved.length) return 0;
    return Math.round(resolved.reduce((a, b) => a + (b.response_minutes ?? 0), 0) / resolved.length);
  })();

  const kpis = {
    operationalSites, totalSites: sitesData.length,
    activeIncidents: activeIncidents.length, criticalCount,
    newCctv, activePatrols, visitorsInside, activePermits, avgResponse,
  };

  const reportHtml = useMemo(() => buildReportHTML({
    ar, kpis, sites: sitesData, incidents: incData, cctv: cctvData,
    patrols: patrols.data ?? [], permits: permits.data ?? [],
    visitors: visitors.data ?? [], contractors: contractors.data ?? [],
  }), [ar, kpis, sitesData, incData, cctvData, patrols.data, permits.data, visitors.data, contractors.data]);

  const handleExportPdf = () => {
    const w = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
    if (!w) { toast.error(ar ? "افتح النوافذ المنبثقة" : "Allow pop-ups"); return; }
    w.document.open();
    w.document.write(reportHtml);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 500);
  };

  const [mailOpen, setMailOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);

  return (
    <NexusPage
      eyebrow="UNIFIED COMMAND CENTER"
      title={ar ? "غرفة القيادة الموحدة — الأمن الصناعي" : "Unified Command Center — Industrial Security"}
      subtitle={ar ? "رؤية تشغيلية حية عبر 8 مواقع، 40+ كاميرا ذكية، 6 دوريات، و7 مقاولين." : "Live operational view across 8 sites, 40+ smart cameras, 6 patrols, and 7 contractors."}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportPdf} className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25 transition">
            <FileDown className="h-3.5 w-3.5" /> {ar ? "تصدير PDF" : "Export PDF"}
          </button>
          <button onClick={() => setMailOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-xs font-semibold text-violet-100 hover:bg-violet-500/25 transition">
            <Mail className="h-3.5 w-3.5" /> {ar ? "إرسال للقيادة" : "Email Leadership"}
          </button>
          <button onClick={() => setTeamsOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-indigo-400/40 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-100 hover:bg-indigo-500/25 transition">
            <MessageSquare className="h-3.5 w-3.5" /> {ar ? "بث Teams" : "Teams Broadcast"}
          </button>
          <button onClick={() => setInboxOpen(v => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-500/40 bg-slate-700/30 px-2.5 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-700/50 transition">
            <Inbox className="h-3.5 w-3.5" /> {ar ? "البريد الوارد" : "Inbox"}
          </button>
          <NexusPill tone="cyan"><Activity className="h-3 w-3" /> REALTIME</NexusPill>
          <NexusPill tone={criticalCount > 0 ? "rose" : "emerald"}>
            <Shield className="h-3 w-3" /> {criticalCount > 0 ? `${criticalCount} CRITICAL` : "STABLE"}
          </NexusPill>
        </div>
      }
      why={ar
        ? `النظام يراقب ${sitesData.length} موقعاً صناعياً بشكل لحظي. ${activeIncidents.length} حوادث نشطة، ${newCctv} تنبيه كاميرات جديد، و${activePatrols} دورية ميدانية.`
        : `Live monitoring across ${sitesData.length} industrial sites. ${activeIncidents.length} active incidents, ${newCctv} new CCTV alerts, ${activePatrols} field patrols.`}
      whatNext={ar
        ? "افتح الحادث الحرج، وأرسل الدورية الأقرب، ثم وثّق التحقيق في سجل ARIA."
        : "Open the critical incident, dispatch the nearest patrol, and log the investigation in ARIA's audit trail."}
    >
      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <NexusStat label={ar ? "مواقع تشغيلية" : "Sites operational"} value={`${operationalSites}/${sitesData.length}`} tone="emerald" />
        <NexusStat label={ar ? "حوادث نشطة" : "Active incidents"} value={String(activeIncidents.length)} tone={activeIncidents.length ? "rose" : "emerald"} />
        <NexusStat label={ar ? "حرجة" : "Critical"} value={String(criticalCount)} tone={criticalCount ? "rose" : "emerald"} />
        <NexusStat label={ar ? "تنبيهات CCTV" : "CCTV new"} value={String(newCctv)} tone="violet" />
        <NexusStat label={ar ? "دوريات نشطة" : "Active patrols"} value={String(activePatrols)} tone="cyan" />
        <NexusStat label={ar ? "زوار بالداخل" : "Visitors inside"} value={String(visitorsInside)} tone="amber" />
        <NexusStat label={ar ? "متوسط الاستجابة" : "Avg response"} value={`${avgResponse}m`} tone={avgResponse < 20 ? "emerald" : "amber"} />
      </div>

      {/* Map + Incidents */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><DigitalTwinMap sites={sitesData} incidents={incData} cctv={cctvData} ar={ar} /></div>
        <IncidentFeed items={incData} sites={sitesData} ar={ar} />
      </div>

      {/* CCTV + Patrols + Visitors */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CctvStream items={cctvData} ar={ar} />
        <PatrolsPanel items={patrols.data ?? []} ar={ar} />
        <VisitorsPanel items={visitors.data ?? []} ar={ar} />
      </div>

      {/* Permits + Assets + Contractors */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PermitsPanel items={permits.data ?? []} ar={ar} />
        <div className="lg:col-span-2"><AssetsHealth items={assets.data ?? []} ar={ar} /></div>
      </div>

      <ContractorsPanel items={contractors.data ?? []} ar={ar} />

      {/* Executive footer banner */}
      <NexusCard glow className="overflow-hidden">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/15 p-2.5 ring-1 ring-cyan-400/30">
              <ShieldAlert className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-cyan-300/80">{ar ? "تحليل ARIA التنفيذي" : "ARIA Executive Analysis"}</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-100">
                {ar
                  ? `جاهزية تشغيلية ${Math.round((operationalSites / Math.max(sitesData.length, 1)) * 100)}% — استجابة ضمن SLA. توصية: تكثيف المراقبة في ينبع خلال الـ 6 ساعات القادمة.`
                  : `Operational readiness ${Math.round((operationalSites / Math.max(sitesData.length, 1)) * 100)}% — response within SLA. Recommendation: heighten Yanbu monitoring for next 6 hours.`}
              </div>
            </div>
          </div>
          <NexusPill tone="emerald"><Eye className="h-3 w-3" /> AUDIT-READY</NexusPill>
        </div>
      </NexusCard>

      {inboxOpen && <OutlookInboxPanel ar={ar} onClose={() => setInboxOpen(false)} />}
      {mailOpen && (
        <SendMailModal
          ar={ar}
          defaultSubject={ar ? `تقرير غرفة القيادة — ${new Date().toLocaleDateString("ar-SA")}` : `Command Center Report — ${new Date().toLocaleDateString("en-US")}`}
          html={reportHtml}
          onClose={() => setMailOpen(false)}
        />
      )}
      {teamsOpen && (
        <TeamsBroadcastModal
          ar={ar}
          html={reportHtml}
          onClose={() => setTeamsOpen(false)}
        />
      )}
    </NexusPage>
  );
}

/* ────────────────── Outlook UI ────────────────── */
function SendMailModal({ ar, defaultSubject, html, onClose }: { ar: boolean; defaultSubject: string; html: string; onClose: () => void }) {
  const send = useServerFn(sendOutlookReport);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!to) { toast.error(ar ? "أدخل بريد المستلم" : "Recipient required"); return; }
    setSending(true);
    try {
      await send({ data: { to, cc: cc || undefined, subject, html } });
      toast.success(ar ? "تم الإرسال عبر Outlook" : "Sent via Outlook");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-violet-400/30 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-violet-100">
            <Mail className="h-4 w-4" /> {ar ? "إرسال التقرير عبر Outlook" : "Send Report via Outlook"}
          </h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <input value={to} onChange={e => setTo(e.target.value)} placeholder={ar ? "إلى (ceo@company.sa)" : "To (ceo@company.sa)"} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400" />
          <input value={cc} onChange={e => setCc(e.target.value)} placeholder={ar ? "نسخة (اختياري)" : "Cc (optional)"} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400" />
          <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400" />
          <div className="rounded-md border border-slate-800 bg-slate-900/50 p-2 text-[11px] text-slate-400">
            {ar ? "سيتم إرفاق تقرير KPIs الكامل (HTML) داخل البريد." : "Full KPI report (HTML) will be embedded in the message body."}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">{ar ? "إلغاء" : "Cancel"}</button>
          <button onClick={submit} disabled={sending} className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-60">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            {ar ? "إرسال الآن" : "Send now"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OutlookInboxPanel({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const fetcher = useServerFn(listOutlookInbox);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["outlook-inbox"],
    queryFn: () => fetcher(),
    staleTime: 30_000,
  });

  return (
    <NexusCard>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-cyan-300" />
          <h3 className="text-sm font-semibold text-slate-100">{ar ? "بريد Outlook الوارد" : "Outlook Inbox"}</h3>
          <NexusPill tone="cyan">LIVE</NexusPill>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800 disabled:opacity-60">
            {isFetching ? "..." : (ar ? "تحديث" : "Refresh")}
          </button>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
      </div>
      {isLoading && <div className="py-6 text-center text-xs text-slate-400">{ar ? "جارٍ التحميل..." : "Loading..."}</div>}
      {error && <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">{(error as Error).message}</div>}
      {data && (
        <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
          {data.messages.length === 0 && <div className="text-xs text-slate-500">{ar ? "لا توجد رسائل" : "No messages"}</div>}
          {data.messages.map(m => (
            <div key={m.id} className={`rounded-md border px-2.5 py-2 ${m.isRead ? "border-slate-800 bg-slate-900/40" : "border-cyan-500/40 bg-cyan-500/5"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-100">{m.subject || "(no subject)"}</div>
                  <div className="truncate text-[10px] text-slate-500">
                    {m.from?.emailAddress?.name ?? m.from?.emailAddress?.address ?? "—"} · {new Date(m.receivedDateTime).toLocaleString(ar ? "ar-SA" : "en-US")}
                  </div>
                </div>
                {!m.isRead && <NexusPill tone="cyan">NEW</NexusPill>}
              </div>
              <div className="mt-1 line-clamp-2 text-[11px] text-slate-400">{m.bodyPreview}</div>
            </div>
          ))}
        </div>
      )}
    </NexusCard>
  );
}

/* ────────────────── Report HTML builder ────────────────── */
function buildReportHTML(args: {
  ar: boolean;
  kpis: { operationalSites: number; totalSites: number; activeIncidents: number; criticalCount: number; newCctv: number; activePatrols: number; visitorsInside: number; activePermits: number; avgResponse: number };
  sites: Site[]; incidents: Incident[]; cctv: CctvAlert[]; patrols: Patrol[]; permits: Permit[]; visitors: Visitor[]; contractors: Contractor[];
}): string {
  const { ar, kpis, sites, incidents, cctv, patrols, permits, visitors, contractors } = args;
  const t = (a: string, e: string) => ar ? a : e;
  const dir = ar ? "rtl" : "ltr";
  const now = new Date().toLocaleString(ar ? "ar-SA" : "en-US");
  const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const kpiCard = (label: string, value: string | number, tone: string) =>
    `<div class="kpi" style="border-color:${tone}40;background:${tone}10"><div class="kv">${esc(value)}</div><div class="kl">${esc(label)}</div></div>`;

  const incRows = incidents.slice(0, 25).map(i => `
    <tr>
      <td>${esc(i.ref)}</td>
      <td>${esc(ar ? i.title_ar : i.title_en)}</td>
      <td><span class="badge sev-${esc(i.severity)}">${esc(i.severity)}</span></td>
      <td>${esc(i.status)}</td>
      <td>${esc(i.response_minutes ?? "-")}m</td>
      <td>${esc(new Date(i.reported_at).toLocaleString(ar ? "ar-SA" : "en-US"))}</td>
    </tr>`).join("");

  const siteRows = sites.map(s => `
    <tr><td>${esc(s.code)}</td><td>${esc(ar ? s.name_ar : s.name_en)}</td><td>${esc(s.sensitivity)}</td><td>${esc(s.status)}</td><td>${esc(s.guards_count)}</td></tr>
  `).join("");

  const patrolRows = patrols.map(p => `
    <tr><td>${esc(p.ref)}</td><td>${esc(p.team)}</td><td>${esc(p.route)}</td><td>${esc(p.status)}</td><td>${esc(p.checkpoints_done)}/${esc(p.checkpoints_total)}</td></tr>
  `).join("");

  const cctvRows = cctv.slice(0, 20).map(c => `
    <tr><td>${esc(c.ref)}</td><td>${esc(c.camera_code)}</td><td>${esc(c.alert_type)}</td><td>${Math.round(c.confidence * 100)}%</td><td>${esc(c.status)}</td></tr>
  `).join("");

  const permitRows = permits.map(p => `
    <tr><td>${esc(p.ref)}</td><td>${esc(p.work_type)}</td><td>${esc(p.contractor)}</td><td><span class="badge sev-${esc(p.risk_level)}">${esc(p.risk_level)}</span></td><td>${esc(p.status)}</td></tr>
  `).join("");

  const contRows = contractors.map(c => `
    <tr><td>${esc(c.name)}</td><td>${esc(c.workers_count)}</td><td>${esc(c.compliance_score)}%</td><td>${esc(c.status)}</td></tr>
  `).join("");

  const visRows = visitors.slice(0, 15).map(v => `
    <tr><td>${esc(v.ref)}</td><td>${esc(v.full_name)}</td><td>${esc(v.organization ?? "-")}</td><td>${esc(v.host)}</td><td>${esc(v.status)}</td></tr>
  `).join("");

  return `<!DOCTYPE html><html dir="${dir}" lang="${ar ? "ar" : "en"}"><head>
<meta charset="utf-8"><title>${t("تقرير غرفة القيادة", "Command Center Report")}</title>
<style>
  @page { size: A4; margin: 14mm; }
  *{box-sizing:border-box} body{font-family:${ar ? "'Tajawal','Cairo'" : "'Inter'"}, system-ui, -apple-system, sans-serif;color:#0f172a;margin:0;padding:24px;background:#fff}
  .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #06b6d4;padding-bottom:12px;margin-bottom:18px}
  .brand{font-size:22px;font-weight:800;letter-spacing:.5px;color:#0e7490}
  .sub{color:#475569;font-size:12px;margin-top:2px}
  h2{font-size:14px;margin:22px 0 8px;color:#0e7490;border-${ar ? "right" : "left"}:4px solid #06b6d4;padding-${ar ? "right" : "left"}:10px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:10px 0 4px}
  .kpi{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:#f8fafc}
  .kv{font-size:22px;font-weight:800;color:#0f172a;line-height:1}
  .kl{font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
  th{background:#0f172a;color:#fff;text-align:${ar ? "right" : "left"};padding:7px 8px;font-weight:600}
  td{border-bottom:1px solid #e2e8f0;padding:6px 8px;color:#334155}
  tr:nth-child(even) td{background:#f8fafc}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase}
  .sev-critical{background:#fee2e2;color:#991b1b} .sev-high{background:#ffedd5;color:#9a3412}
  .sev-medium{background:#fef3c7;color:#92400e} .sev-low{background:#dcfce7;color:#166534}
  .footer{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}
  .stamp{display:inline-block;border:2px solid #0e7490;color:#0e7490;padding:4px 10px;border-radius:6px;font-weight:700;font-size:10px}
  @media print { .noprint{display:none} }
</style></head><body>
  <div class="hdr">
    <div>
      <div class="brand">NEXIOS AI OS</div>
      <div class="sub">${t("غرفة القيادة الموحدة — الأمن الصناعي (المنطقة الغربية)", "Unified Command Center — Industrial Security (Western Region)")}</div>
    </div>
    <div style="text-align:${ar ? "left" : "right"}">
      <div class="stamp">${t("سري — للتداول الداخلي", "CONFIDENTIAL — INTERNAL")}</div>
      <div class="sub">${esc(now)}</div>
    </div>
  </div>

  <h2>${t("مؤشرات الأداء التشغيلية (KPIs)", "Operational KPIs")}</h2>
  <div class="grid">
    ${kpiCard(t("مواقع تشغيلية", "Operational sites"), `${kpis.operationalSites}/${kpis.totalSites}`, "#10b981")}
    ${kpiCard(t("حوادث نشطة", "Active incidents"), kpis.activeIncidents, "#f59e0b")}
    ${kpiCard(t("حرجة", "Critical"), kpis.criticalCount, "#ef4444")}
    ${kpiCard(t("تنبيهات CCTV جديدة", "New CCTV alerts"), kpis.newCctv, "#8b5cf6")}
    ${kpiCard(t("دوريات نشطة", "Active patrols"), kpis.activePatrols, "#06b6d4")}
    ${kpiCard(t("زوار بالداخل", "Visitors inside"), kpis.visitorsInside, "#f59e0b")}
    ${kpiCard(t("تصاريح نشطة", "Active permits"), kpis.activePermits, "#0ea5e9")}
    ${kpiCard(t("متوسط الاستجابة", "Avg response"), `${kpis.avgResponse}m`, "#10b981")}
  </div>

  <h2>${t("الحوادث الأخيرة", "Recent Incidents")}</h2>
  <table><thead><tr><th>Ref</th><th>${t("العنوان", "Title")}</th><th>${t("الخطورة", "Severity")}</th><th>${t("الحالة", "Status")}</th><th>${t("الاستجابة", "Response")}</th><th>${t("الوقت", "Reported")}</th></tr></thead><tbody>${incRows || `<tr><td colspan="6" style="text-align:center;color:#94a3b8">—</td></tr>`}</tbody></table>

  <h2>${t("المواقع الصناعية", "Industrial Sites")}</h2>
  <table><thead><tr><th>Code</th><th>${t("الاسم", "Name")}</th><th>${t("الحساسية", "Sensitivity")}</th><th>${t("الحالة", "Status")}</th><th>${t("الحراس", "Guards")}</th></tr></thead><tbody>${siteRows}</tbody></table>

  <h2>${t("الدوريات الميدانية", "Field Patrols")}</h2>
  <table><thead><tr><th>Ref</th><th>${t("الفريق", "Team")}</th><th>${t("المسار", "Route")}</th><th>${t("الحالة", "Status")}</th><th>${t("النقاط", "Checkpoints")}</th></tr></thead><tbody>${patrolRows || `<tr><td colspan="5" style="text-align:center;color:#94a3b8">—</td></tr>`}</tbody></table>

  <h2>${t("تنبيهات الكاميرات الذكية", "Smart CCTV Alerts")}</h2>
  <table><thead><tr><th>Ref</th><th>${t("الكاميرا", "Camera")}</th><th>${t("النوع", "Type")}</th><th>${t("الثقة", "Confidence")}</th><th>${t("الحالة", "Status")}</th></tr></thead><tbody>${cctvRows || `<tr><td colspan="5" style="text-align:center;color:#94a3b8">—</td></tr>`}</tbody></table>

  <h2>${t("تصاريح العمل", "Work Permits")}</h2>
  <table><thead><tr><th>Ref</th><th>${t("النوع", "Type")}</th><th>${t("المقاول", "Contractor")}</th><th>${t("الخطورة", "Risk")}</th><th>${t("الحالة", "Status")}</th></tr></thead><tbody>${permitRows || `<tr><td colspan="5" style="text-align:center;color:#94a3b8">—</td></tr>`}</tbody></table>

  <h2>${t("الزوار", "Visitors")}</h2>
  <table><thead><tr><th>Ref</th><th>${t("الاسم", "Name")}</th><th>${t("الجهة", "Organization")}</th><th>${t("المضيف", "Host")}</th><th>${t("الحالة", "Status")}</th></tr></thead><tbody>${visRows || `<tr><td colspan="5" style="text-align:center;color:#94a3b8">—</td></tr>`}</tbody></table>

  <h2>${t("المقاولون والامتثال", "Contractors & Compliance")}</h2>
  <table><thead><tr><th>${t("الاسم", "Name")}</th><th>${t("العمال", "Workers")}</th><th>${t("الامتثال", "Compliance")}</th><th>${t("الحالة", "Status")}</th></tr></thead><tbody>${contRows || `<tr><td colspan="4" style="text-align:center;color:#94a3b8">—</td></tr>`}</tbody></table>

  <div class="footer">
    <div>NEXIOS AI OS · ${t("تم التوليد بواسطة ARIA Executive Brain", "Generated by ARIA Executive Brain")}</div>
    <div>${esc(now)}</div>
  </div>
</body></html>`;
}

/* ────────────────── Teams Broadcast ────────────────── */
function TeamsBroadcastModal({ ar, html, onClose }: { ar: boolean; html: string; onClose: () => void }) {
  const listFn = useServerFn(listTeamsChannels);
  const sendFn = useServerFn(sendTeamsAlert);
  const [channelKey, setChannelKey] = useState("");
  const [note, setNote] = useState(ar ? "تحديث تشغيلي من غرفة القيادة" : "Operational update from Command Center");
  const [busy, setBusy] = useState(false);

  const channels = useQuery({
    queryKey: ["teams-channels"],
    queryFn: () => listFn({}),
    staleTime: 60_000,
  });

  const submit = async () => {
    if (!channelKey) { toast.error(ar ? "اختر قناة" : "Pick a channel"); return; }
    const [teamId, channelId] = channelKey.split("|");
    setBusy(true);
    try {
      const body = `<h2>${note}</h2>${html}`;
      await sendFn({ data: { teamId, channelId, html: body } });
      toast.success(ar ? "تم البث إلى Teams" : "Broadcast sent to Teams");
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-indigo-400/30 bg-slate-900/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-200">
            <MessageSquare className="h-4 w-4" />
            <h3 className="text-sm font-semibold">{ar ? "بث إلى Microsoft Teams" : "Broadcast to Microsoft Teams"}</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        <label className="mb-1 block text-xs text-slate-400">{ar ? "القناة" : "Channel"}</label>
        {channels.isLoading ? (
          <div className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" /> {ar ? "جلب القنوات..." : "Loading channels..."}
          </div>
        ) : channels.isError ? (
          <div className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {ar ? "تعذّر جلب قنوات Teams" : "Could not load Teams channels"}
          </div>
        ) : (
          <select
            value={channelKey}
            onChange={(e) => setChannelKey(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">— {ar ? "اختر قناة" : "Select a channel"} —</option>
            {channels.data?.channels?.map((c) => {
              const t = channels.data?.teams?.find((tt) => tt.id === c.teamId);
              return (
                <option key={`${c.teamId}|${c.id}`} value={`${c.teamId}|${c.id}`}>
                  {t?.displayName ?? "Team"} › {c.displayName}
                </option>
              );
            })}
          </select>
        )}

        <label className="mb-1 mt-3 block text-xs text-slate-400">{ar ? "ملاحظة العنوان" : "Headline"}</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={submit}
            disabled={busy || !channelKey}
            className="inline-flex items-center gap-1.5 rounded bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {ar ? "بث الآن" : "Broadcast"}
          </button>
        </div>
      </div>
    </div>
  );
}
