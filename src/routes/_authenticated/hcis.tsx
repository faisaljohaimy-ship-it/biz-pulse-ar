/**
 * الامتثال HCIS — HCIS Compliance dashboard.
 * All figures come from the simulation-seeded hcis_* tables (is_simulation=true).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { ShieldCheck, AlertTriangle, CalendarClock, FileDown } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { NexusPage, NexusCard, NexusStat, NexusPill } from "@/components/nexus-frame";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { useRegion } from "@/lib/region-context";
import { REGIONS, type RegionId } from "@/lib/regions";
import { getHcisOverview, type HcisOverview } from "@/lib/compliance/hcis-ptw.functions";
import { buildReadinessReportHtml } from "@/lib/compliance/readiness-report";

export const Route = createFileRoute("/_authenticated/hcis")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: HcisPage,
});

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  physical: { ar: "الحماية المادية", en: "Physical" },
  surveillance: { ar: "المراقبة الإلكترونية", en: "Surveillance" },
  forces: { ar: "القوى الأمنية", en: "Forces" },
  emergency: { ar: "إدارة الطوارئ", en: "Emergency" },
  infosec: { ar: "أمن المعلومات", en: "InfoSec" },
  access: { ar: "التحكم بالدخول", en: "Access" },
};

const SEVERITY_TONE: Record<string, string> = {
  critical: "text-rose-300 border-rose-400/40 bg-rose-500/10",
  high: "text-orange-300 border-orange-400/40 bg-orange-500/10",
  medium: "text-amber-300 border-amber-400/40 bg-amber-500/10",
  low: "text-cyan-300 border-cyan-400/40 bg-cyan-500/10",
};

function ComplianceRing({ pct }: { pct: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  const tone = pct >= 85 ? "#22C55E" : pct >= 70 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative grid h-40 w-40 place-items-center">
      <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-white/10"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute grid place-items-center">
        <span className="text-4xl font-bold text-white">{pct}%</span>
      </div>
    </div>
  );
}

function daysTo(target: string | null): number | null {
  if (!target) return null;
  return Math.round((new Date(target).getTime() - Date.now()) / 86_400_000);
}

function HcisPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { user, loading } = useAuth();
  const { region } = useRegion();
  const fetchOverview = useServerFn(getHcisOverview);
  const { data, isLoading } = useQuery<HcisOverview>({
    queryKey: ["hcis-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    enabled: !!user && !loading,
    refetchInterval: 60_000,
  });

  const matrixStatus = useMemo(() => {
    const m = new Map<string, string>();
    for (const cell of data?.matrix ?? []) {
      const key = `${cell.category}|${cell.region}`;
      // keep the "worst" status seen for the cell
      const rank = (s: string) =>
        s === "non_compliant" ? 3 : s === "partial" ? 2 : s === "compliant" ? 1 : 0;
      const prev = m.get(key);
      if (!prev || rank(cell.status) > rank(prev)) m.set(key, cell.status);
    }
    return m;
  }, [data]);

  const statusColor = (s: string | undefined) =>
    s === "non_compliant"
      ? "bg-rose-500/70"
      : s === "partial"
        ? "bg-amber-400/70"
        : s === "compliant"
          ? "bg-emerald-500/70"
          : "bg-white/10";

  const categories = Object.keys(CATEGORY_LABELS);

  const onReport = () => {
    if (!data) return;
    const html = buildReadinessReportHtml(data, ar ? region.labelAr : region.labelEn, ar);
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <NexusPage
      eyebrow="HCIS COMPLIANCE"
      title={ar ? "الامتثال للهيئة العليا للأمن الصناعي" : "HCIS Industrial Security Compliance"}
      subtitle={
        ar
          ? "نسب الامتثال والفجوات وخطط المعالجة والتفتيشات عبر المناطق الأربع — بيانات محاكاة واقعية."
          : "Compliance rates, gaps, CAPs and inspections across the four regions — realistic simulation data."
      }
      actions={
        <button
          onClick={onReport}
          disabled={!data}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" />
          {ar ? "تقرير جاهزية التفتيش" : "Inspection Readiness Report"}
        </button>
      }
    >
      {isLoading || !data ? (
        <NexusCard>
          <p className="py-10 text-center text-white/50">{ar ? "جارٍ التحميل…" : "Loading…"}</p>
        </NexusCard>
      ) : (
        <>
          {/* Overall + per-region + findings summary */}
          <div className="grid gap-4 lg:grid-cols-3">
            <NexusCard className="flex flex-col items-center justify-center gap-3">
              <span className="text-xs font-semibold tracking-wide text-white/60">
                {ar ? "الامتثال الكلي" : "Overall compliance"}
              </span>
              <ComplianceRing pct={data.overallPct} />
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
            </NexusCard>

            <NexusCard className="lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-white/80">
                {ar ? "الامتثال حسب المنطقة" : "Compliance by region"}
              </h3>
              <div className="space-y-3">
                {REGIONS.map((r) => {
                  const pct = data.byRegion[r.id] ?? 0;
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs text-white/70">
                        {ar ? r.shortAr : r.shortEn}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 85 ? "#22C55E" : pct >= 70 ? "#F59E0B" : "#EF4444",
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-end text-xs font-semibold text-white">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </NexusCard>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NexusStat
              label={ar ? "إجمالي الملاحظات" : "Total findings"}
              value={String(data.findings.total)}
              tone="cyan"
            />
            <NexusStat
              label={ar ? "متأخرة عن الموعد" : "Overdue"}
              value={String(data.findings.overdue)}
              tone="rose"
            />
            <NexusStat
              label={ar ? "حرجة" : "Critical"}
              value={String(data.findings.bySeverity.critical ?? 0)}
              tone="amber"
            />
            <NexusStat
              label={ar ? "تفتيشات قادمة" : "Upcoming inspections"}
              value={String(data.inspections.filter((i) => i.status === "scheduled").length)}
              tone="emerald"
            />
          </div>

          {/* Compliance matrix */}
          <NexusCard>
            <h3 className="mb-3 text-sm font-semibold text-white/80">
              {ar ? "مصفوفة الامتثال (الفئة × المنطقة)" : "Compliance matrix (category × region)"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="text-white/60">
                    <th className="p-2 text-start font-medium">{ar ? "الفئة" : "Category"}</th>
                    {REGIONS.map((r) => (
                      <th key={r.id} className="p-2 text-center font-medium">
                        {ar ? r.shortAr : r.shortEn}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat} className="border-t border-white/5">
                      <td className="p-2 text-start text-white/80">
                        {ar ? CATEGORY_LABELS[cat]!.ar : CATEGORY_LABELS[cat]!.en}
                      </td>
                      {REGIONS.map((r) => (
                        <td key={r.id} className="p-2 text-center">
                          <span
                            className={`inline-block h-5 w-5 rounded ${statusColor(matrixStatus.get(`${cat}|${r.id}`))}`}
                            title={matrixStatus.get(`${cat}|${r.id}`) ?? "-"}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <i className="h-3 w-3 rounded bg-emerald-500/70" /> {ar ? "ممتثل" : "Compliant"}
              </span>
              <span className="flex items-center gap-1">
                <i className="h-3 w-3 rounded bg-amber-400/70" /> {ar ? "جزئي" : "Partial"}
              </span>
              <span className="flex items-center gap-1">
                <i className="h-3 w-3 rounded bg-rose-500/70" />{" "}
                {ar ? "غير ممتثل" : "Non-compliant"}
              </span>
            </div>
          </NexusCard>

          {/* Findings + inspections */}
          <div className="grid gap-4 lg:grid-cols-2">
            <NexusCard>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
                <AlertTriangle className="h-4 w-4 text-amber-300" />{" "}
                {ar ? "سجل الفجوات وخطط المعالجة" : "Findings & CAPs"}
              </h3>
              <div className="space-y-2.5">
                {data.findings.top.map((f) => {
                  const d = daysTo(f.target_date);
                  const late = d !== null && d < 0;
                  return (
                    <div
                      key={f.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-white/85">{f.title_ar}</p>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_TONE[f.severity]}`}
                        >
                          {f.severity}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/50">
                        <span>
                          {REGIONS.find((r) => r.id === (f.region as RegionId))?.shortAr ??
                            f.region}
                        </span>
                        {d !== null && (
                          <span className={late ? "font-semibold text-rose-300" : ""}>
                            {late
                              ? `${ar ? "متأخر" : "overdue"} ${Math.abs(d)}${ar ? " يوم" : "d"}`
                              : `${d}${ar ? " يوم للموعد" : "d to target"}`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {data.findings.top.length === 0 && (
                  <p className="py-6 text-center text-white/40">
                    {ar ? "لا فجوات مفتوحة" : "No open findings"}
                  </p>
                )}
              </div>
            </NexusCard>

            <NexusCard>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
                <CalendarClock className="h-4 w-4 text-cyan-300" />{" "}
                {ar ? "جدول التفتيشات" : "Inspection schedule"}
              </h3>
              <div className="space-y-2.5">
                {data.inspections.slice(0, 8).map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div>
                      <p className="text-sm text-white/85">{i.title_ar}</p>
                      <p className="text-[11px] text-white/50">
                        {new Date(i.scheduled_at).toLocaleDateString(ar ? "ar-SA" : "en-GB")}
                      </p>
                    </div>
                    <NexusPill
                      tone={
                        i.status === "executed"
                          ? i.result === "failed"
                            ? "rose"
                            : "emerald"
                          : "cyan"
                      }
                    >
                      {i.status === "executed"
                        ? ar
                          ? "منفّذ"
                          : "Done"
                        : ar
                          ? "مجدول"
                          : "Scheduled"}
                    </NexusPill>
                  </div>
                ))}
              </div>
            </NexusCard>
          </div>
        </>
      )}
    </NexusPage>
  );
}
