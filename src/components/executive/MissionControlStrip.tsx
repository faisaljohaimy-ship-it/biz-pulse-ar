import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, AlertTriangle, Siren, Wrench, Bot, CheckCircle2 } from "lucide-react";
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

  // Zero-tolerance policy: the entire section is hidden unless every KPI
  // resolved to a real, finite numeric value from the database. Evaluated
  // below the hooks so React's rules-of-hooks aren't violated.
  const isFiniteNumber = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v);
  const allReady =
    !!k &&
    isFiniteNumber(k.incidents_total) &&
    isFiniteNumber(k.incidents_open) &&
    isFiniteNumber(k.incidents_critical) &&
    isFiniteNumber(k.incidents_resolution_rate) &&
    isFiniteNumber(k.work_orders_active) &&
    isFiniteNumber(k.maintenance_pending) &&
    isFiniteNumber(k.projects_in_progress);

  const pendingLabel = ar ? "قيد الربط" : "Live sync pending";

  const tiles = useMemo(() => {
    const has = (v: number | null | undefined): v is number =>
      typeof v === "number" && Number.isFinite(v);

    return [
      {
        key: "incidents_total",
        Icon: AlertTriangle,
        labelAr: "إجمالي الحوادث",
        labelEn: "Total Incidents",
        value: has(k?.incidents_total) ? k!.incidents_total : null,
        hint: undefined,
        tone: "cyan" as KpiTone,
      },
      {
        key: "resolution",
        Icon: CheckCircle2,
        labelAr: "معدّل الحل",
        labelEn: "Resolution Rate",
        value: has(k?.incidents_resolution_rate) ? `${k!.incidents_resolution_rate}%` : null,
        hint: undefined,
        tone: "emerald" as KpiTone,
      },
      {
        key: "incidents_open",
        Icon: Siren,
        labelAr: "حوادث مفتوحة",
        labelEn: "Open Incidents",
        value: has(k?.incidents_open) ? k!.incidents_open : null,
        hint: has(k?.incidents_critical)
          ? (ar ? `${k!.incidents_critical} حرج` : `${k!.incidents_critical} critical`)
          : undefined,
        tone: (k?.incidents_open ?? 0) > 5 ? ("amber" as KpiTone) : ("cyan" as KpiTone),
      },
      {
        key: "wo",
        Icon: Wrench,
        labelAr: "أوامر عمل مفتوحة",
        labelEn: "Open Work Orders",
        value: has(k?.work_orders_active) ? k!.work_orders_active : null,
        hint: undefined,
        tone: "cyan" as KpiTone,
      },
      {
        key: "maintenance",
        Icon: Activity,
        labelAr: "صيانة وقائية",
        labelEn: "Preventive WO",
        value: has(k?.maintenance_pending) ? k!.maintenance_pending : null,
        hint: undefined,
        tone: "violet" as KpiTone,
      },
      {
        key: "projects",
        Icon: Bot,
        labelAr: "مشاريع نشطة",
        labelEn: "Active Projects",
        value: has(k?.projects_in_progress) ? k!.projects_in_progress : null,
        hint: undefined,
        tone: "emerald" as KpiTone,
      },
    ] as const;
  }, [k, ar]);

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
        {tiles.map((t) => {
          const isPending = failed || t.value === null;
          return (
            <li key={t.key}>
              <KpiTile
                labelAr={t.labelAr}
                labelEn={t.labelEn}
                value={
                  isPending ? (
                    <span className="inline-flex items-center rounded-full border border-[color:var(--nx-warning)]/40 bg-[color:var(--nx-warning)]/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--nx-warning)]">
                      {pendingLabel}
                    </span>
                  ) : (
                    t.value
                  )
                }
                hint={isPending ? undefined : t.hint}
                tone={isPending ? "amber" : t.tone}
                loading={loading}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default MissionControlStrip;
