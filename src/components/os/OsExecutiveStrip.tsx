/**
 * OsExecutiveStrip — bilingual KPI strip for /os.
 * Fetches /api/public/os-overview (aggregate counts, no PII) and renders
 * six executive KPI cards. All numbers pass through the FR-19 evidence
 * gate via <KpiCard>/<EvidenceBadge>.
 */
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Radar, Activity, UserCheck, Camera, ClipboardCheck } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { SimBadge } from "@/components/os/SimBadge";
import type { Evidence } from "@/lib/evidence/gate";

type OverviewPayload = {
  ok: boolean;
  observedAt: string;
  source: string;
  is_simulation?: boolean;
  counts?: {
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
};

async function fetchOverview(): Promise<OverviewPayload> {
  const res = await fetch("/api/public/os-overview", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`overview_http_${res.status}`);
  return (await res.json()) as OverviewPayload;
}

export function OsExecutiveStrip({ ar }: { readonly ar: boolean }) {
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

  // The public /os overview is a fixed synthetic snapshot (is_simulation).
  // Constitution art. 11: never stamp «لحظي/LIVE» on non-live data.
  const isSim = q.data?.is_simulation ?? true;
  const liveLabel = isSim ? (ar ? "محاكاة" : "SIM") : ar ? "لحظي" : "LIVE";

  const items: {
    key: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    labelPrimary: string;
    labelSecondary: string;
    value: number | undefined;
    tone: "cyan" | "emerald" | "amber" | "rose";
    hint?: string;
  }[] = [
    {
      key: "incidents_critical",
      icon: ShieldAlert,
      labelPrimary: ar ? "الحوادث الحرجة" : "Critical Incidents",
      labelSecondary: ar ? "Critical" : "المفتوحة",
      value: counts?.incidents_critical,
      tone: "rose",
      hint: ar ? "مفتوحة الآن" : "open now",
    },
    {
      key: "incidents_open",
      icon: Activity,
      labelPrimary: ar ? "الحوادث المفتوحة" : "Open Incidents",
      labelSecondary: ar ? "Open" : "مفتوحة",
      value: counts?.incidents_open,
      tone: "amber",
      hint: ar ? "قيد المعالجة" : "in progress",
    },
    {
      key: "patrols_active",
      icon: Radar,
      labelPrimary: ar ? "الدوريات النشطة" : "Active Patrols",
      labelSecondary: ar ? "Patrols" : "نشطة",
      value: counts?.patrols_active,
      tone: "cyan",
    },
    {
      key: "cctv_new",
      icon: Camera,
      labelPrimary: ar ? "تنبيهات الكاميرات" : "CCTV Alerts",
      labelSecondary: ar ? "CCTV" : "جديدة",
      value: counts?.cctv_new,
      tone: "cyan",
    },
    {
      key: "visitors_inside",
      icon: UserCheck,
      labelPrimary: ar ? "الزوار داخل الموقع" : "Visitors On-Site",
      labelSecondary: ar ? "Visitors" : "الزوار",
      value: counts?.visitors_inside,
      tone: "emerald",
    },
    {
      key: "permits_active",
      icon: ClipboardCheck,
      labelPrimary: ar ? "تصاريح العمل النشطة" : "Active Permits",
      labelSecondary: ar ? "Permits" : "تصاريح",
      value: counts?.permits_active,
      tone: "emerald",
    },
  ];

  return (
    <section aria-label={ar ? "لوحة المؤشرات التنفيذية" : "Executive KPIs"} className="space-y-3">
      {isSim ? (
        <div className="flex justify-end">
          <SimBadge ar={ar} />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
        {items.map((it) => (
          <KpiCard
            key={it.key}
            icon={it.icon as unknown as import("lucide-react").LucideIcon}
            labelPrimary={it.labelPrimary}
            labelSecondary={it.labelSecondary}
            value={it.value}
            evidence={mkEvidence(it.value)}
            liveLabel={liveLabel}
            tone={it.tone}
            hint={it.hint}
          />
        ))}
      </div>
    </section>
  );
}
