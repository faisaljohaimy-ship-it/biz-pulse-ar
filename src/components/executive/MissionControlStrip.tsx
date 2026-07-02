import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, AlertTriangle, ShieldCheck, Siren, Wrench, Bot } from "lucide-react";
import { getExecKpis } from "@/lib/sec.functions";
import { supabase } from "@/integrations/supabase/client";
import { KpiTile, type KpiTone } from "./KpiTile";
import { useI18n } from "@/lib/i18n";
import { useDemoData } from "@/lib/demo/useDemoData";
import { riskLevelLabel } from "@/lib/demo/demoDataProvider";
import { DemoDataBadge } from "./DemoDataBadge";



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
  const loading = q.isLoading || q.isError || !k;

  const tiles = useMemo(() => {
    const riskTone: KpiTone =
      (k?.incidents_critical ?? 0) > 0 ? "rose"
      : (k?.incidents_open ?? 0) > 5    ? "amber"
      : "emerald";
    const compliancePct = k?.incidents_resolution_rate ?? 0;
    const complianceTone: KpiTone =
      compliancePct >= 90 ? "emerald" : compliancePct >= 70 ? "amber" : "rose";

    return [
      {
        key: "risk",
        Icon: AlertTriangle,
        labelAr: "مستوى المخاطر",
        labelEn: "Risk Level",
        value: loading ? "—" : (k!.incidents_critical > 0 ? (ar ? "حرج" : "Critical") : k!.incidents_open > 5 ? (ar ? "متوسط" : "Elevated") : (ar ? "منخفض" : "Low")),
        hint: loading ? undefined : (ar ? `${k!.incidents_critical} حرج · ${k!.incidents_open} مفتوح` : `${k!.incidents_critical} critical · ${k!.incidents_open} open`),
        tone: riskTone,
      },
      {
        key: "compliance",
        Icon: ShieldCheck,
        labelAr: "نسبة الإغلاق",
        labelEn: "Resolution Rate",
        value: loading ? "—" : `${compliancePct}%`,
        hint: loading ? undefined : `MTTR ${k!.mttr_minutes}m`,
        tone: complianceTone,
      },
      {
        key: "incidents",
        Icon: Siren,
        labelAr: "حوادث مفتوحة",
        labelEn: "Open Incidents",
        value: loading ? "—" : k!.incidents_open,
        hint: loading ? undefined : (ar ? `إجمالي ${k!.incidents_total}` : `Total ${k!.incidents_total}`),
        tone: (k?.incidents_open ?? 0) > 5 ? "amber" as KpiTone : "cyan" as KpiTone,
      },
      {
        key: "wo",
        Icon: Wrench,
        labelAr: "أوامر عمل مفتوحة",
        labelEn: "Open Work Orders",
        value: loading ? "—" : k!.wo_open,
        hint: loading ? undefined : (ar ? `مغلق ${k!.wo_closed}` : `Closed ${k!.wo_closed}`),
        tone: "cyan" as KpiTone,
      },
      {
        key: "preventive",
        Icon: Activity,
        labelAr: "صيانة وقائية",
        labelEn: "Preventive WO",
        value: loading ? "—" : k!.preventive_wo,
        hint: loading ? undefined : (ar ? `إصلاحي ${k!.corrective_wo}` : `Corrective ${k!.corrective_wo}`),
        tone: "violet" as KpiTone,
      },
      {
        key: "projects",
        Icon: Bot,
        labelAr: "مشاريع جارية",
        labelEn: "Active Projects",
        value: loading ? "—" : k!.projects_in_progress,
        hint: loading ? undefined : (ar ? `مكتمل ${k!.projects_completed}` : `Completed ${k!.projects_completed}`),
        tone: "emerald" as KpiTone,
      },
    ] as const;
  }, [k, loading, ar]);


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
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--nx-cyan)]/30 bg-[color:var(--nx-cyan)]/10 px-2.5 py-1 text-[10px] font-medium text-[color:var(--nx-cyan-2)]"
          aria-live="polite"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${q.isFetching ? "bg-[color:var(--nx-cyan-2)] animate-pulse" : "bg-[color:var(--nx-success)]"}`} aria-hidden />
          {q.isFetching ? (ar ? "تحديث…" : "Updating…") : q.isError ? (ar ? "غير متصل" : "Offline") : (ar ? "حي" : "Live")}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <li key={t.key}>
            <KpiTile
              labelAr={t.labelAr}
              labelEn={t.labelEn}
              value={t.value}
              hint={t.hint}
              tone={t.tone}
              loading={loading}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default MissionControlStrip;
