/**
 * OsDecisionQueue — top decisions awaiting executive action.
 * Public homepage edition: values come from the deterministic simulation
 * snapshot (sim_* aggregated across the four regions) computed
 * synchronously — populated in the SSR HTML, never empty — and every row
 * is explicitly badged «محاكاة · لقطة عامة» (constitution art. 11).
 */
import { AlertTriangle, Camera, ClipboardCheck, Server, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { REGIONS } from "@/lib/regions";
import { regionSim } from "@/lib/sec/region-sim-data";
import { ExecutiveSourceBadge } from "@/components/evidence/ExecutiveSourceBadge";
import { useExecutiveKpiSource } from "@/lib/sec/use-executive-kpi-source";

// Deterministic simulation snapshot — the four regions' sim counts summed.
const SIM_TOTALS = REGIONS.map((r) => regionSim(r.id).counts).reduce(
  (acc, c) => ({
    incidents_critical: acc.incidents_critical + c.incidents_critical,
    cctv_new: acc.cctv_new + c.cctv_new,
    permits_active: acc.permits_active + c.permits_active,
    assets_offline: acc.assets_offline + c.assets_offline,
  }),
  { incidents_critical: 0, cctv_new: 0, permits_active: 0, assets_offline: 0 },
);

export function OsDecisionQueue({ ar }: { readonly ar: boolean }) {
  const source = useExecutiveKpiSource();
  const live = source.data;
  const counts = live
    ? {
        incidents_critical: live.incidents_critical,
        cctv_new: Math.max(0, live.cameras_total - live.cameras_online),
        permits_active: live.permits_active,
        assets_offline: live.wo_open,
      }
    : SIM_TOTALS;

  const decisions = [
    {
      key: "critical",
      icon: AlertTriangle,
      titleAr: "حوادث حرجة",
      titleEn: "Critical Incidents",
      bodyAr: "تتطلب قراراً تنفيذياً فورياً.",
      bodyEn: "Require immediate executive decision.",
      value: counts?.incidents_critical ?? 0,
      to: "/sec/incidents",
      tone: "rose" as const,
    },
    {
      key: "cctv",
      icon: Camera,
      titleAr: live ? "كاميرات تحتاج متابعة" : "تنبيهات كاميرات جديدة",
      titleEn: live ? "Cameras Needing Attention" : "New CCTV Alerts",
      bodyAr: live ? "مشتقة من حالة الاتصال الحية." : "في انتظار مراجعة غرفة العمليات.",
      bodyEn: live ? "Derived from live connectivity state." : "Awaiting operations-room review.",
      value: counts?.cctv_new ?? 0,
      to: "/sec/cctv",
      tone: "amber" as const,
    },
    {
      key: "assets",
      icon: Server,
      titleAr: live ? "أوامر صيانة مفتوحة" : "أصول متعطلة",
      titleEn: live ? "Open Work Orders" : "Assets Offline",
      bodyAr: "أثر تشغيلي محتمل — يتطلّب متابعة.",
      bodyEn: "Potential operational impact — needs follow-through.",
      value: counts?.assets_offline ?? 0,
      to: "/sec/maintenance",
      tone: "amber" as const,
    },
    {
      key: "permits",
      icon: ClipboardCheck,
      titleAr: "تصاريح عمل نشطة",
      titleEn: "Active Work Permits",
      bodyAr: "مراقبة الامتثال أثناء التنفيذ.",
      bodyEn: "Monitor compliance during execution.",
      value: counts?.permits_active ?? 0,
      to: "/sec/permits",
      tone: "cyan" as const,
    },
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const Arrow = ar ? ArrowLeft : ArrowRight;

  return (
    <section
      aria-label={ar ? "قائمة القرارات" : "Decision Queue"}
      className="flex flex-col gap-3 sm:gap-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50 sm:text-xs">
          {ar ? "قائمة القرارات" : "Decision Queue"}
        </h2>
        <span
          aria-hidden
          className="hidden h-px flex-1 bg-gradient-to-r from-[#3AE8FF]/40 via-white/10 to-transparent sm:ms-4 sm:block"
        />
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {decisions.map((d) => (
          <li key={d.key}>
            <Link
              to={d.to}
              className={cn(
                "group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border bg-white/[0.03] p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.06] sm:p-5",
                d.tone === "rose" && "border-rose-400/35 hover:border-rose-400/60",
                d.tone === "amber" && "border-amber-400/30 hover:border-amber-400/55",
                d.tone === "cyan" && "border-[#00D4FF]/30 hover:border-[#00D4FF]/55",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      d.tone === "rose" &&
                        "bg-rose-400/15 text-rose-300 shadow-[0_0_20px_rgba(251,113,133,0.45)]",
                      d.tone === "amber" &&
                        "bg-amber-400/15 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]",
                      d.tone === "cyan" &&
                        "bg-[#00D4FF]/15 text-[#3AE8FF] shadow-[0_0_20px_rgba(0,212,255,0.5)]",
                    )}
                  >
                    <d.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {ar ? d.titleAr : d.titleEn}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[12px] text-white/60">
                      {ar ? d.bodyAr : d.bodyEn}
                    </div>
                  </div>
                </div>
                <ExecutiveSourceBadge source={source} ar={ar} className="text-[9px]" />
              </div>
              <div className="mt-auto flex items-end justify-between gap-3">
                <span
                  className="font-semibold tabular-nums tracking-tight text-white"
                  style={{ fontSize: "clamp(1.35rem, 3.5vw, 1.75rem)" }}
                >
                  {d.value}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70 transition-colors group-hover:text-white">
                  {ar ? "افتح" : "Open"}
                  <Arrow
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                    strokeWidth={2}
                  />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
