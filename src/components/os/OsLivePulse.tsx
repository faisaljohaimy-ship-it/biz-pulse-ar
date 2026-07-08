/**
 * OsLivePulse — compact live-signal row for /os.
 * Reads from the same public overview endpoint; renders four small
 * pulse chips (sites, assets offline, contractors active, monitoring
 * state). Every chip that shows a claim goes through EvidenceBadge.
 */
import { useQuery } from "@tanstack/react-query";
import { MapPin, Server, HardHat, Cpu } from "lucide-react";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import type { Evidence } from "@/lib/evidence/gate";

type OverviewPayload = {
  ok: boolean;
  observedAt: string;
  source: string;
  counts?: {
    sites: number;
    assets_offline: number;
    contractors_active: number;
  };
};

async function fetchOverview(): Promise<OverviewPayload> {
  const res = await fetch("/api/public/os-overview", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`overview_http_${res.status}`);
  return (await res.json()) as OverviewPayload;
}

export function OsLivePulse({ ar }: { readonly ar: boolean }) {
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
  const mkEvidence = (value: number | undefined): Evidence | null => {
    if (!observedAt || value === undefined) return null;
    return {
      kind: "db.query",
      source: q.data?.source ?? "sec_overview.public_counts",
      observedAt,
      value,
    };
  };

  const liveLabel = ar ? "لحظي" : "LIVE";
  const runtimeEvidence: Evidence | null = observedAt
    ? { kind: "runtime.probe", source: "os_runtime", observedAt, value: "online" }
    : null;

  const chips = [
    {
      key: "sites",
      icon: MapPin,
      label: ar ? "المواقع" : "Sites",
      value: counts?.sites,
      evidence: mkEvidence(counts?.sites),
      tone: "cyan" as const,
    },
    {
      key: "assets_offline",
      icon: Server,
      label: ar ? "أصول متعطلة" : "Assets Offline",
      value: counts?.assets_offline,
      evidence: mkEvidence(counts?.assets_offline),
      tone: (counts?.assets_offline ?? 0) > 0 ? ("amber" as const) : ("emerald" as const),
    },
    {
      key: "contractors",
      icon: HardHat,
      label: ar ? "المقاولون النشطون" : "Contractors",
      value: counts?.contractors_active,
      evidence: mkEvidence(counts?.contractors_active),
      tone: "cyan" as const,
    },
  ];

  return (
    <section
      aria-label={ar ? "النبض التشغيلي" : "Runtime pulse"}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3AE8FF]">
          <Cpu className="h-3.5 w-3.5" strokeWidth={2} />
          {ar ? "منظومة التشغيل" : "Runtime"}
        </span>
        <EvidenceBadge evidence={runtimeEvidence} label={liveLabel} tone="emerald" />
        <div className="ms-auto flex flex-wrap items-center gap-2 sm:gap-3">
          {chips.map((c) => (
            <div
              key={c.key}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1"
              title={`${c.label}: ${c.value ?? "—"}`}
            >
              <c.icon className="h-3.5 w-3.5 text-[#3AE8FF]" strokeWidth={2} />
              <span className="text-[11px] font-medium text-white/70">{c.label}</span>
              <span className="text-[11px] font-semibold tabular-nums text-white">
                {c.value ?? "—"}
              </span>
              <EvidenceBadge evidence={c.evidence} label={liveLabel} tone={c.tone} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
