import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, AlertTriangle, ShieldCheck, Siren, Wrench, Bot, Mic } from "lucide-react";
import { getExecKpis } from "@/lib/sec.functions";
import { supabase } from "@/integrations/supabase/client";
import { KpiTile, type KpiTone } from "./KpiTile";
import { useI18n } from "@/lib/i18n";
import { useDemoData } from "@/lib/demo/useDemoData";
import { riskLevelLabel } from "@/lib/demo/demoDataProvider";
import { DemoDataBadge } from "./DemoDataBadge";
import {
  briefing,
  useBriefingHighlight,
  useBriefingState,
  type CardKey,
} from "@/lib/aria/executive-briefing-orchestrator";
import { glossary as G } from "@/lib/i18n/glossary";





export function MissionControlStrip() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchKpis = useServerFn(getExecKpis);

  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const q = useQuery({
    queryKey: ["exec-kpis", "mission-strip"],
    queryFn: async () => {
      try { return await fetchKpis(); } catch { return null; }
    },
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    retry: false,
    staleTime: 5_000,
    enabled: hasSession,
  });

  const k = q.data;
  const realLoading = q.isLoading || q.isError || !k;
  // Public visitors (no session) get the simulated demo stream as a fallback,
  // rendered into the same nodes that would otherwise show "—". Authed users
  // always see real data — demo is never mixed in.
  const publicMode = !hasSession;
  const demo = useDemoData(publicMode);
  const useDemo = publicMode && realLoading;
  const flash = useDemo ? demo.changedKey : null;

  const tiles = useMemo(() => {
    const critical = useDemo ? demo.criticalIncidents24h : (k?.incidents_critical ?? 0);
    const openInc  = useDemo ? demo.openIncidents        : (k?.incidents_open ?? 0);
    const riskTone: KpiTone =
      critical > 3 ? "rose" : critical > 1 || openInc > 5 ? "amber" : "emerald";
    const compliancePct = useDemo ? demo.resolutionRate : (k?.incidents_resolution_rate ?? 0);
    const complianceTone: KpiTone =
      compliancePct >= 90 ? "emerald" : compliancePct >= 70 ? "amber" : "rose";
    const woOpen        = useDemo ? demo.openWorkOrders : (k?.wo_open ?? 0);
    const preventive    = useDemo ? demo.preventiveWo   : (k?.preventive_wo ?? 0);
    const projectsOpen  = useDemo ? demo.activeProjects : (k?.projects_in_progress ?? 0);
    const mttr          = useDemo ? demo.mttrMin        : (k?.mttr_minutes ?? 0);
    const totalInc      = useDemo ? demo.openIncidents + demo.criticalIncidents24h : (k?.incidents_total ?? 0);

    const displayValue = <T,>(realLoading: boolean, useDemo: boolean, real: T, demoV: T): T | string => {
      if (useDemo) return demoV;
      if (realLoading) return "—";
      return real;
    };

    return [
      {
        key: "risk",
        driftKey: "criticalIncidents24h" as const,
        Icon: AlertTriangle,
        labelAr: G.kpi_risk_level.ar,
        labelEn: G.kpi_risk_level.en,

        value: useDemo
          ? riskLevelLabel(demo.riskLevelKey, ar)
          : realLoading
            ? "—"
            : (k!.incidents_critical > 0 ? (ar ? "حرج" : "Critical") : k!.incidents_open > 5 ? (ar ? "متوسط" : "Elevated") : (ar ? "منخفض" : "Low")),
        hint: useDemo
          ? (ar ? `${demo.criticalIncidents24h} حرج · ${demo.openIncidents} مفتوح` : `${demo.criticalIncidents24h} critical · ${demo.openIncidents} open`)
          : realLoading ? undefined : (ar ? `${k!.incidents_critical} حرج · ${k!.incidents_open} مفتوح` : `${k!.incidents_critical} critical · ${k!.incidents_open} open`),
        tone: riskTone,
      },
      {
        key: "compliance",
        driftKey: "resolutionRate" as const,
        Icon: ShieldCheck,
        labelAr: G.kpi_resolution.ar,
        labelEn: G.kpi_resolution.en,

        value: displayValue(realLoading, useDemo, `${compliancePct}%`, `${compliancePct}%`),
        hint: useDemo ? `MTTR ${mttr}m` : realLoading ? undefined : `MTTR ${k!.mttr_minutes}m`,
        tone: complianceTone,
      },
      {
        key: "incidents",
        driftKey: "openIncidents" as const,
        Icon: Siren,
        labelAr: "حوادث مفتوحة",
        labelEn: "Open Incidents",
        value: displayValue(realLoading, useDemo, k?.incidents_open ?? "—", openInc),
        hint: useDemo
          ? (ar ? `إجمالي ${totalInc}` : `Total ${totalInc}`)
          : realLoading ? undefined : (ar ? `إجمالي ${k!.incidents_total}` : `Total ${k!.incidents_total}`),
        tone: (openInc > 5 ? "amber" : "cyan") as KpiTone,
      },
      {
        key: "wo",
        driftKey: "openWorkOrders" as const,
        Icon: Wrench,
        labelAr: "أوامر عمل مفتوحة",
        labelEn: "Open Work Orders",
        value: displayValue(realLoading, useDemo, k?.wo_open ?? "—", woOpen),
        hint: useDemo
          ? (ar ? `مغلق ${180}` : `Closed ${180}`)
          : realLoading ? undefined : (ar ? `مغلق ${k!.wo_closed}` : `Closed ${k!.wo_closed}`),
        tone: "cyan" as KpiTone,
      },
      {
        key: "preventive",
        driftKey: "preventiveWo" as const,
        Icon: Activity,
        labelAr: "صيانة وقائية",
        labelEn: "Preventive WO",
        value: displayValue(realLoading, useDemo, k?.preventive_wo ?? "—", preventive),
        hint: useDemo
          ? (ar ? `إصلاحي ${34}` : `Corrective ${34}`)
          : realLoading ? undefined : (ar ? `إصلاحي ${k!.corrective_wo}` : `Corrective ${k!.corrective_wo}`),
        tone: "violet" as KpiTone,
      },
      {
        key: "projects",
        driftKey: "activeProjects" as const,
        Icon: Bot,
        labelAr: "مشاريع جارية",
        labelEn: "Active Projects",
        value: displayValue(realLoading, useDemo, k?.projects_in_progress ?? "—", projectsOpen),
        hint: useDemo
          ? (ar ? `مكتمل ${28}` : `Completed ${28}`)
          : realLoading ? undefined : (ar ? `مكتمل ${k!.projects_completed}` : `Completed ${k!.projects_completed}`),
        tone: "emerald" as KpiTone,
      },
    ] as const;
  }, [k, realLoading, useDemo, demo, ar]);

  const loading = useDemo ? false : realLoading;

  // Snapshot current KPI values for the briefing orchestrator.
  const kpisRef = useRef({
    risk_label: "",
    critical_24h: 0,
    mttr_min: 0,
    resolution_pct: 0,
    open_wo: 0,
    preventive_wo: 0,
    active_projects: 0,
  });
  useEffect(() => {
    const critical = useDemo ? demo.criticalIncidents24h : (k?.incidents_critical ?? 0);
    const openInc  = useDemo ? demo.openIncidents        : (k?.incidents_open ?? 0);
    const compliancePct = useDemo ? demo.resolutionRate : (k?.incidents_resolution_rate ?? 0);
    const label =
      critical > 0
        ? (ar ? "حرج" : "Critical")
        : openInc > 5
          ? (ar ? "متوسط" : "Elevated")
          : (ar ? "منخفض" : "Low");
    kpisRef.current = {
      risk_label: useDemo ? riskLevelLabel(demo.riskLevelKey, ar) : label,
      critical_24h: critical,
      mttr_min: useDemo ? demo.mttrMin : (k?.mttr_minutes ?? 0),
      resolution_pct: compliancePct,
      open_wo: useDemo ? demo.openWorkOrders : (k?.wo_open ?? 0),
      preventive_wo: useDemo ? demo.preventiveWo : (k?.preventive_wo ?? 0),
      active_projects: useDemo ? demo.activeProjects : (k?.projects_in_progress ?? 0),
    };
    briefing.publishLive(kpisRef.current, tiles.length >= 6 ? "exec" : "hero");
  }, [k, useDemo, demo, ar, tiles.length]);


  const brief = useBriefingState();
  // Number of visible cards → 6 (lg) — spec allows a 4-KPI hero variant
  // and a 7-KPI exec variant; the orchestrator handles both.
  const mode = tiles.length >= 6 ? "exec" : "hero";

  const handleStartBriefing = (): void => {
    if (brief.active) {
      briefing.stop();
      return;
    }
    void briefing.start({ mode, ar, kpis: kpisRef.current });
  };

  return (
    <section
      aria-label="Mission Control live KPIs"
      className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--nx-cyan-2)]/75">
            Mission Control
          </div>
          <h2 className="text-base font-semibold text-white">{ar ? "نبض العمليات الحي" : "Live Operations Pulse"}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStartBriefing}
            aria-pressed={brief.active}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition backdrop-blur-md ${
              brief.active
                ? "border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                : "border-[color:var(--nx-cyan-2)]/50 bg-[color:var(--nx-cyan-2)]/10 text-white shadow-[0_0_18px_rgba(58,232,255,0.35)] hover:bg-[color:var(--nx-cyan-2)]/20"
            }`}
          >
            <Mic className="h-3 w-3" aria-hidden />
            <span>
              {brief.active
                ? ar ? "إيقاف الإحاطة" : "Stop briefing"
                : ar ? "الإحاطة التنفيذية ▸" : "Executive Briefing ▸"}
            </span>
          </button>
          {useDemo && <DemoDataBadge />}
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--nx-cyan)]/30 bg-[color:var(--nx-cyan)]/10 px-2.5 py-1 text-[10px] font-medium text-[color:var(--nx-cyan-2)]"
            aria-live="polite"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${q.isFetching ? "bg-[color:var(--nx-cyan-2)] animate-pulse" : "bg-[color:var(--nx-success)]"}`} aria-hidden />
            {q.isFetching ? (ar ? "تحديث…" : "Updating…") : useDemo ? (ar ? "عرض توضيحي" : "Demo") : q.isError ? (ar ? "غير متصل" : "Offline") : (ar ? "حي" : "Live")}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes mcs-flash {
          0% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
          20% { box-shadow: 0 0 0 4px rgba(52,211,153,0.55); }
          100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
        }
        .mcs-flash { animation: mcs-flash 900ms ease-out; border-radius: 14px; }
        @keyframes mcs-brief-glow {
          0%, 100% { box-shadow: 0 0 0 2px rgba(52,211,153,0.55), 0 0 26px rgba(52,211,153,0.35); }
          50% { box-shadow: 0 0 0 3px rgba(52,211,153,0.9), 0 0 38px rgba(52,211,153,0.55); }
        }
        .mcs-brief-active {
          animation: mcs-brief-glow 1.6s ease-in-out infinite;
          border-radius: 14px;
          transform: scale(1.03);
          transition: transform 260ms ease-out, opacity 260ms ease-out;
        }
        .mcs-brief-dim { opacity: 0.55; transition: opacity 260ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .mcs-brief-active {
            animation: none;
            transform: none;
            box-shadow: 0 0 0 2px rgba(52,211,153,0.9);
          }
          .mcs-brief-dim { opacity: 0.85; }
        }
      `}</style>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <BriefingTile
            key={t.key}
            cardKey={t.key as CardKey}
            flashActive={flash === t.driftKey}
            briefingActive={brief.active}
          >
            <KpiTile
              labelAr={t.labelAr}
              labelEn={t.labelEn}
              value={t.value}
              hint={t.hint}
              tone={t.tone}
              loading={loading}
            />
          </BriefingTile>
        ))}
      </ul>
    </section>
  );
}

function BriefingTile({
  cardKey,
  flashActive,
  briefingActive,
  children,
}: {
  cardKey: CardKey;
  flashActive: boolean;
  briefingActive: boolean;
  children: React.ReactNode;
}) {
  const active = useBriefingHighlight(cardKey);
  const liRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!active || !liRef.current) return;
    // Auto-scroll into view (RTL-aware handled by scrollIntoView automatically).
    liRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [active]);
  const cls = [
    flashActive ? "mcs-flash" : "",
    active ? "mcs-brief-active" : briefingActive ? "mcs-brief-dim" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <li ref={liRef} className={cls || undefined}>
      {children}
    </li>
  );
}



export default MissionControlStrip;
