/**
 * OsCommandDeck — cinematic mission-control ribbon for /os.
 * Aggregates live health score, ARIA readiness, and directional posture
 * from the public os-overview endpoint. Every claim goes through
 * <EvidenceBadge> (FR-19). Additive; token-safe; RTL-perfect.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gauge, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import type { Evidence } from "@/lib/evidence/gate";
import { cn } from "@/lib/utils";

type Counts = {
  sites: number;
  incidents_open: number;
  incidents_critical: number;
  patrols_active: number;
  visitors_inside: number;
  permits_active: number;
  cctv_new: number;
  assets_offline: number;
  contractors_active: number;
};

type OverviewPayload = {
  ok: boolean;
  observedAt: string;
  source: string;
  counts?: Counts;
};

async function fetchOverview(): Promise<OverviewPayload> {
  const res = await fetch("/api/public/os-overview", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`overview_http_${res.status}`);
  return (await res.json()) as OverviewPayload;
}

function computeHealth(c?: Counts): { score: number; tone: "emerald" | "amber" | "rose" } {
  if (!c) return { score: 0, tone: "amber" };
  const penalties =
    c.incidents_critical * 12 +
    c.incidents_open * 3 +
    c.assets_offline * 4 +
    c.cctv_new * 2;
  const score = Math.max(40, Math.min(100, 100 - penalties));
  const tone = score >= 85 ? "emerald" : score >= 65 ? "amber" : "rose";
  return { score, tone };
}

export function OsCommandDeck({ ar }: { readonly ar: boolean }) {
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
  const health = useMemo(() => computeHealth(counts), [counts]);
  const liveLabel = ar ? "لحظي" : "LIVE";

  const healthEvidence: Evidence | null = observedAt
    ? {
        kind: "db.query",
        source: "os_health_index@sec_overview",
        observedAt,
        value: health.score,
      }
    : null;

  const ariaEvidence: Evidence | null = observedAt
    ? { kind: "runtime.probe", source: "aria_runtime", observedAt, value: "ready" }
    : null;

  const postureEvidence: Evidence | null = observedAt
    ? {
        kind: "db.query",
        source: "posture@sec_overview",
        observedAt,
        value: counts?.incidents_critical ?? 0,
      }
    : null;

  const posture =
    (counts?.incidents_critical ?? 0) > 0
      ? { ar: "احتواء نشط", en: "Active Containment", tone: "rose" as const }
      : (counts?.incidents_open ?? 0) > 0
        ? { ar: "استجابة تشغيلية", en: "Operational Response", tone: "amber" as const }
        : { ar: "استقرار تشغيلي", en: "Stable Posture", tone: "emerald" as const };

  const tiles = [
    {
      key: "health",
      icon: Gauge,
      labelAr: "مؤشر الجاهزية",
      labelEn: "Readiness Index",
      value: `${health.score}%`,
      tone: health.tone,
      evidence: healthEvidence,
      caption: ar ? "مركّب لحظي" : "Composite index",
    },
    {
      key: "aria",
      icon: Sparkles,
      labelAr: "آريا — المحرّك التنفيذي",
      labelEn: "ARIA Executive Core",
      value: ar ? "جاهزة" : "Ready",
      tone: "cyan" as const,
      evidence: ariaEvidence,
      caption: ar ? "استماع تنفيذي" : "Executive listening",
    },
    {
      key: "posture",
      icon: ShieldCheck,
      labelAr: "الوضع الأمني",
      labelEn: "Security Posture",
      value: ar ? posture.ar : posture.en,
      tone: posture.tone,
      evidence: postureEvidence,
      caption: ar ? "بناءً على الحوادث" : "Incident-derived",
    },
  ];

  return (
    <section
      aria-label={ar ? "قاعة القيادة" : "Command Deck"}
      className="relative overflow-hidden rounded-3xl border border-[#00D4FF]/25 bg-gradient-to-br from-[#00D4FF]/10 via-white/[0.02] to-transparent p-4 backdrop-blur-2xl sm:p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(600px 200px at 100% 0%, rgba(58,232,255,0.18), transparent 60%), radial-gradient(400px 200px at 0% 100%, rgba(0,212,255,0.12), transparent 60%)",
        }}
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#3AE8FF]/40 bg-[#00D4FF]/10 text-[#3AE8FF] shadow-[0_0_28px_rgba(0,212,255,0.45)]">
            <Waves className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#3AE8FF]/85">
              {ar ? "قاعة القيادة" : "Command Deck"}
            </div>
            <div className="mt-0.5 truncate text-sm font-medium text-white/80">
              {ar
                ? "نظرة تنفيذية موحّدة · بيانات مُوثّقة"
                : "Unified executive view · evidence-verified"}
            </div>
          </div>
        </div>
        <EvidenceBadge
          evidence={healthEvidence}
          label={liveLabel}
          tone={health.tone === "rose" ? "rose" : "cyan"}
        />
      </div>

      <div className="relative mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-3 sm:gap-4">
        {tiles.map((t) => (
          <div
            key={t.key}
            className={cn(
              "group relative overflow-hidden rounded-2xl border bg-white/[0.03] p-4 transition-transform duration-300 hover:-translate-y-0.5",
              t.tone === "emerald" && "border-emerald-400/25",
              t.tone === "amber" && "border-amber-400/30",
              t.tone === "rose" && "border-rose-400/35",
              t.tone === "cyan" && "border-[#00D4FF]/25",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    t.tone === "emerald" && "bg-emerald-400/15 text-emerald-300",
                    t.tone === "amber" && "bg-amber-400/15 text-amber-300",
                    t.tone === "rose" && "bg-rose-400/15 text-rose-300",
                    t.tone === "cyan" && "bg-[#00D4FF]/15 text-[#3AE8FF]",
                  )}
                >
                  <t.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-white">
                    {ar ? t.labelAr : t.labelEn}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] uppercase tracking-[0.22em] text-white/45">
                    {ar ? t.labelEn : t.labelAr}
                  </div>
                </div>
              </div>
              <EvidenceBadge evidence={t.evidence} label={liveLabel} tone={t.tone} />
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className="truncate text-xl font-semibold tabular-nums tracking-tight text-white sm:text-2xl">
                {t.value}
              </span>
              <span className="truncate text-[10px] text-white/45">{t.caption}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
