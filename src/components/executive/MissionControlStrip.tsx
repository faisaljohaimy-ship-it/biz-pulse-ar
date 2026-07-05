import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, AlertTriangle, ShieldCheck, Siren, Wrench, Bot } from "lucide-react";
import { getPublicKpis, type PublicKpis } from "@/lib/sec.functions";
import { KpiTile, type KpiTone } from "./KpiTile";
import { useI18n } from "@/lib/i18n";

export function MissionControlStrip() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const fetchKpis = useServerFn(getPublicKpis);

  const q = useQuery<PublicKpis | null>({
    queryKey: ["public-kpis", "mission-strip"],
    queryFn: async () => {
      try {
        return await fetchKpis();
      } catch {
        return null;
      }
    },
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 10_000,
  });

  const k = q.data;
  const loading = q.isLoading;
  const failed = !loading && !k;

  const tiles = useMemo(() => {
    const riskTone: KpiTone =
      k?.risk_level === "critical" ? "rose" : k?.risk_level === "elevated" ? "amber" : "emerald";
    const riskLabel = k
      ? k.risk_level === "critical"
        ? ar ? "حرج" : "Critical"
        : k.risk_level === "elevated"
          ? ar ? "متوسط" : "Elevated"
          : ar ? "منخفض" : "Low"
      : "—";
    return [
      {
        key: "risk",
        Icon: AlertTriangle,
        labelAr: "مستوى المخاطر",
        labelEn: "Risk Level",
        value: riskLabel,
        hint: k ? (ar ? `${k.incidents_critical} حرج · ${k.incidents_open} مفتوح` : `${k.incidents_critical} critical · ${k.incidents_open} open`) : undefined,
        tone: riskTone,
        bound: true,
      },
      {
        key: "incidents",
        Icon: Siren,
        labelAr: "حوادث مفتوحة",
        labelEn: "Open Incidents",
        value: k?.incidents_open ?? 0,
        hint: k ? (ar ? `${k.incidents_critical} حرج` : `${k.incidents_critical} critical`) : undefined,
        tone: (k?.incidents_open ?? 0) > 5 ? "amber" as KpiTone : "cyan" as KpiTone,
        bound: true,
      },
      {
        key: "wo",
        Icon: Wrench,
        labelAr: "أوامر عمل نشطة",
        labelEn: "Active Work Orders",
        value: k?.work_orders_active ?? 0,
        hint: undefined,
        tone: "cyan" as KpiTone,
        bound: true,
      },
      {
        key: "maintenance",
        Icon: Activity,
        labelAr: "صيانة وقائية معلّقة",
        labelEn: "Preventive Pending",
        value: k?.maintenance_pending ?? 0,
        hint: undefined,
        tone: "violet" as KpiTone,
        bound: true,
      },
      {
        key: "permits",
        Icon: ShieldCheck,
        labelAr: "تصاريح سارية",
        labelEn: "Active Permits",
        value: k?.permits_active ?? 0,
        hint: undefined,
        tone: "emerald" as KpiTone,
        bound: true,
      },
      {
        key: "projects",
        Icon: Bot,
        labelAr: "مشاريع جارية",
        labelEn: "Active Projects",
        value: k?.projects_in_progress ?? 0,
        hint: undefined,
        tone: "emerald" as KpiTone,
        bound: true,
      },
    ] as const;
  }, [k, ar]);

  const pendingLabel = ar ? "قيد الربط" : "Live sync pending";

  return (
    <section aria-label="Mission Control live KPIs" className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
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
          <span
            className={`h-1.5 w-1.5 rounded-full ${failed ? "bg-[color:var(--nx-warning)]" : q.isFetching || loading ? "bg-[color:var(--nx-cyan-2)] animate-pulse" : "bg-[color:var(--nx-success)]"}`}
            aria-hidden
          />
          {failed ? pendingLabel : loading ? (ar ? "تحميل…" : "Loading…") : q.isFetching ? (ar ? "تحديث…" : "Updating…") : (ar ? "حي" : "Live")}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <li key={t.key}>
            <KpiTile
              labelAr={t.labelAr}
              labelEn={t.labelEn}
              value={
                failed ? (
                  <span className="inline-flex items-center rounded-full border border-[color:var(--nx-warning)]/40 bg-[color:var(--nx-warning)]/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--nx-warning)]">
                    {pendingLabel}
                  </span>
                ) : t.value
              }
              hint={failed ? undefined : t.hint}
              tone={failed ? "amber" : t.tone}
              loading={loading}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default MissionControlStrip;
