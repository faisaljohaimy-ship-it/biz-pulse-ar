/**
 * OsDecisionQueue — top decisions awaiting executive action.
 * Derived from live counts on the public os-overview endpoint.
 * Every actionable row carries an <EvidenceBadge> (FR-19) so a claim
 * of "3 critical incidents" is verifiable to source + observedAt.
 */
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Camera, ClipboardCheck, Server, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import type { Evidence } from "@/lib/evidence/gate";
import { cn } from "@/lib/utils";

type OverviewPayload = {
  ok: boolean;
  observedAt: string;
  source: string;
  counts?: {
    incidents_critical: number;
    incidents_open: number;
    cctv_new: number;
    permits_active: number;
    assets_offline: number;
  };
};

async function fetchOverview(): Promise<OverviewPayload> {
  const res = await fetch("/api/public/os-overview", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`overview_http_${res.status}`);
  return (await res.json()) as OverviewPayload;
}

export function OsDecisionQueue({ ar }: { readonly ar: boolean }) {
  const q = useQuery({
    queryKey: ["os-overview"],
    queryFn: fetchOverview,
    refetchInterval: 20_000,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const counts = q.data?.counts;
  const observedAt = q.data?.observedAt;
  const liveLabel = ar ? "لحظي" : "LIVE";

  const mk = (value: number | undefined, source: string): Evidence | null =>
    observedAt !== undefined && value !== undefined
      ? { kind: "db.query", source, observedAt, value }
      : null;

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
      evidence: mk(counts?.incidents_critical, "sec_incidents.critical"),
    },
    {
      key: "cctv",
      icon: Camera,
      titleAr: "تنبيهات كاميرات جديدة",
      titleEn: "New CCTV Alerts",
      bodyAr: "في انتظار مراجعة غرفة العمليات.",
      bodyEn: "Awaiting operations-room review.",
      value: counts?.cctv_new ?? 0,
      to: "/sec/cctv",
      tone: "amber" as const,
      evidence: mk(counts?.cctv_new, "sec_cctv_alerts.new"),
    },
    {
      key: "assets",
      icon: Server,
      titleAr: "أصول متعطلة",
      titleEn: "Assets Offline",
      bodyAr: "أثر تشغيلي محتمل — يتطلّب صيانة.",
      bodyEn: "Potential operational impact — needs service.",
      value: counts?.assets_offline ?? 0,
      to: "/sec/assets",
      tone: "amber" as const,
      evidence: mk(counts?.assets_offline, "sec_assets.offline"),
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
      evidence: mk(counts?.permits_active, "sec_permits.active"),
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
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
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
                <EvidenceBadge evidence={d.evidence} label={liveLabel} tone={d.tone} />
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
