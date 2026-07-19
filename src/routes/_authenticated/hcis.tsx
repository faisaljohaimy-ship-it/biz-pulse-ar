/**
 * الامتثال HCIS — HCIS Compliance dashboard.
 *
 * Data comes exclusively from the four framework tables via the shared
 * hook in src/lib/hcis/framework.ts (anon-readable; guests + deep links
 * work). Every directive tile links to its guidance page at
 * /hcis/directive/$code. Nothing is hardcoded; simulated rows are always
 * badged.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ShieldCheck, AlertTriangle, RefreshCw, FlaskConical, Search } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { NexusPage, NexusCard } from "@/components/nexus-frame";
import { useI18n } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { REGIONS } from "@/lib/regions";
import {
  DIRECTIVE_ICONS,
  STATUS_META,
  statusMeta,
  compliancePct,
  useHcisFramework,
  type ComplianceRow,
  type Directive,
} from "@/lib/hcis/framework";

export const Route = createFileRoute("/_authenticated/hcis")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: HcisPage,
});

type CategoryFilter = "all" | "SEC" | "SAF";

function KpiValue({ pct, ar }: { pct: number | null; ar: boolean }) {
  if (pct === null)
    return (
      <span className="text-lg font-semibold text-white/55">
        {ar ? "لم يُقيَّم" : "Not assessed"}
      </span>
    );
  const tone = pct >= 85 ? "text-emerald-300" : pct >= 70 ? "text-amber-300" : "text-rose-300";
  return <span className={`text-3xl font-bold ${tone}`}>{pct}%</span>;
}

function SkeletonBlock({ h }: { h: string }) {
  return (
    <div
      className={`w-full animate-pulse rounded-2xl border border-white/10 bg-white/[0.04] ${h}`}
    />
  );
}

function HcisPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { data, isLoading, isError, refetch } = useHcisFramework();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [q, setQ] = useState("");

  const byDirective = useMemo(() => {
    const m = new Map<string, Map<string, ComplianceRow>>();
    for (const row of data?.compliance ?? []) {
      if (!m.has(row.directive_code)) m.set(row.directive_code, new Map());
      m.get(row.directive_code)!.set(row.region_code, row);
    }
    return m;
  }, [data]);

  const byRegionPct = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const r of REGIONS)
      out[r.id] = compliancePct((data?.compliance ?? []).filter((c) => c.region_code === r.id));
    return out;
  }, [data]);

  const overallPct = useMemo(() => compliancePct(data?.compliance ?? []), [data]);
  const anySimulation = useMemo(
    () => (data?.compliance ?? []).some((c) => c.is_simulation),
    [data],
  );
  const matrixDirectives = useMemo(
    () => (data?.directives ?? []).filter((d) => byDirective.has(d.code)),
    [data, byDirective],
  );

  /* Filter bar + instant search over the full 21-directive series. */
  const visibleDirectives = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.directives ?? []).filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (!needle) return true;
      return (
        d.code.toLowerCase().includes(needle) ||
        d.name_ar.includes(q.trim()) ||
        d.name_en.toLowerCase().includes(needle)
      );
    });
  }, [data, category, q]);

  const configError = !isSupabaseConfigured;

  return (
    <NexusPage
      eyebrow="HCIS COMPLIANCE"
      title={ar ? "الامتثال للهيئة العليا للأمن الصناعي" : "HCIS Industrial Security Compliance"}
      subtitle={
        ar
          ? "التوجيهات المنشورة ومصفوفة الامتثال عبر الإدارات الإقليمية الأربع ومراحل الاعتماد السبع — مباشرة من قاعدة البيانات."
          : "The published directives, the four-region compliance matrix and the seven approval stages — live from the database."
      }
      actions={
        anySimulation ? (
          <span className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200">
            <FlaskConical className="h-4 w-4" aria-hidden />
            {ar ? "بيانات محاكاة" : "Simulation data"}
          </span>
        ) : undefined
      }
    >
      {configError || isError ? (
        <NexusCard className="border-rose-400/25">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-300" aria-hidden />
            <p className="max-w-md text-sm leading-relaxed text-white/80">
              {ar
                ? "تعذّر تحميل بيانات الامتثال من قاعدة البيانات — تحقّق من الاتصال ثم أعد المحاولة."
                : "Compliance data failed to load — check your connection and retry."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-6 text-sm font-semibold text-[#BEEBFF] transition hover:bg-[#3AE8FF]/20 active:scale-[0.97]"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {ar ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        </NexusCard>
      ) : isLoading || !data ? (
        <div className="space-y-4" aria-label={ar ? "جارٍ التحميل" : "Loading"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} h="h-24" />
            ))}
          </div>
          <SkeletonBlock h="h-28" />
          <SkeletonBlock h="h-96" />
        </div>
      ) : data.directives.length === 0 ? (
        <NexusCard>
          <p className="py-10 text-center text-white/50">
            {ar
              ? "لا توجد توجيهات بعد — شغّل بذر الإطار أولًا."
              : "No directives yet — run the framework seed first."}
          </p>
        </NexusCard>
      ) : (
        <>
          {/* ① KPI cards — overall + one per regional administration */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <NexusCard className="py-5">
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <span className="text-[11px] font-semibold tracking-wide text-white/60">
                  {ar ? "الامتثال الإجمالي" : "Overall compliance"}
                </span>
                <KpiValue pct={overallPct} ar={ar} />
                <ShieldCheck className="mt-1 h-4 w-4 text-emerald-300/80" aria-hidden />
              </div>
            </NexusCard>
            {REGIONS.map((r) => (
              <NexusCard key={r.id} className="py-5">
                <div className="flex flex-col items-center justify-center gap-1 text-center">
                  <span className="text-[11px] font-semibold tracking-wide text-white/60">
                    {ar ? r.shortAr : r.shortEn}
                  </span>
                  <KpiValue pct={byRegionPct[r.id] ?? null} ar={ar} />
                  <span className="text-[10px] text-white/40">
                    {(data.compliance ?? []).filter((c) => c.region_code === r.id).length}{" "}
                    {ar ? "توجيهًا" : "directives"}
                  </span>
                </div>
              </NexusCard>
            ))}
          </div>

          {/* ② Seven approval stages — horizontal timeline */}
          {data.stages.length > 0 && (
            <NexusCard>
              <h3 className="mb-4 text-sm font-semibold text-white/80">
                {ar ? "مراحل الاعتماد لدى الهيئة (SVA → FAT/SAT)" : "HCIS approval stages"}
              </h3>
              <ol
                className="flex snap-x gap-0 overflow-x-auto pb-2"
                style={{ scrollbarWidth: "thin" }}
              >
                {data.stages.map((s, i) => (
                  <li key={s.stage_no} className="flex min-w-[150px] snap-start items-start gap-0">
                    <div className="flex w-[140px] flex-col items-center gap-1.5 text-center">
                      <span className="grid h-9 w-9 place-items-center rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 text-sm font-bold text-[#3AE8FF]">
                        {s.stage_no}
                      </span>
                      <span className="text-xs font-semibold leading-tight text-white/85">
                        {ar ? s.name_ar : s.name_en}
                      </span>
                      <span className="line-clamp-3 text-[10px] leading-snug text-white/50">
                        {s.description_ar}
                      </span>
                    </div>
                    {i < data.stages.length - 1 && (
                      <span aria-hidden className="mt-4 h-px w-3 shrink-0 bg-[#3AE8FF]/30 sm:w-5" />
                    )}
                  </li>
                ))}
              </ol>
            </NexusCard>
          )}

          {/* ③ Interactive matrix — directives × four regional administrations */}
          {matrixDirectives.length > 0 && (
            <NexusCard>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white/80">
                  {ar
                    ? "مصفوفة الامتثال (التوجيه × الإدارة)"
                    : "Compliance matrix (directive × region)"}
                </h3>
                <span className="text-[10px] text-white/45">
                  {ar
                    ? "اضغط أي توجيه لفتح صفحته الإرشادية"
                    : "Tap any directive for its guidance page"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-sm">
                  <thead>
                    <tr className="text-white/60">
                      <th className="p-2 text-start font-medium">{ar ? "التوجيه" : "Directive"}</th>
                      {REGIONS.map((r) => (
                        <th key={r.id} className="p-2 text-center font-medium">
                          {ar ? r.shortAr : r.shortEn}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixDirectives.map((d) => {
                      const Icon = DIRECTIVE_ICONS[d.code] ?? ShieldCheck;
                      const rows = byDirective.get(d.code);
                      return (
                        <tr key={d.code} className="border-t border-white/5">
                          <td className="p-1.5 text-start">
                            <Link
                              to="/hcis/directive/$code"
                              params={{ code: d.code }}
                              className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 text-start transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.99]"
                            >
                              <span className="nx-module-icon grid h-7 w-7 shrink-0 place-items-center rounded-lg">
                                <Icon className="nx-icon-soft h-4 w-4" aria-hidden />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[10px] font-semibold tracking-wide text-emerald-300/90">
                                  {d.code}
                                </span>
                                <span className="block truncate text-xs text-white/85">
                                  {ar ? d.name_ar : d.name_en}
                                </span>
                              </span>
                            </Link>
                          </td>
                          {REGIONS.map((r) => {
                            const cell = rows?.get(r.id);
                            const meta = statusMeta(cell?.status);
                            return (
                              <td key={r.id} className="p-2 text-center">
                                <Link
                                  to="/hcis/directive/$code"
                                  params={{ code: d.code }}
                                  aria-label={`${d.code} — ${ar ? r.shortAr : r.shortEn}: ${meta.ar}`}
                                  title={meta.ar}
                                  className={`inline-block h-5 w-5 cursor-pointer rounded ${meta.cell} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 hover:scale-110 ${cell?.priority === "critical" ? "ring-1 ring-rose-400/60" : ""}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/60">
                {(["compliant", "partial", "non_compliant", "not_assessed"] as const).map((s) => (
                  <span key={s} className="flex items-center gap-1">
                    <i className={`h-3 w-3 rounded ${STATUS_META[s]!.cell}`} /> {STATUS_META[s]!.ar}
                  </span>
                ))}
                <span className="flex items-center gap-1">
                  <i className="h-3 w-3 rounded bg-white/10 ring-1 ring-rose-400/60" />{" "}
                  {ar ? "أولوية حرجة" : "Critical"}
                </span>
              </div>
            </NexusCard>
          )}

          {/* ④ Directive icon grid — filterable, every card opens its guidance page */}
          <NexusCard>
            <h3 className="mb-1 text-sm font-semibold text-white/80">
              {ar
                ? "لائحة التوجيهات الأمنية الصناعية (HCIS)"
                : "HCIS Industrial-Security Directive Series"}
            </h3>
            <p className="mb-4 text-xs text-white/50">
              {ar
                ? "السلسلة المنشورة SEC-01 إلى SEC-19 مع المجمعات السكنية وسلسلة السلامة — اضغط أي توجيه لفتح صفحته الإرشادية."
                : "The published SEC-01..SEC-19 series with residential compounds and the safety series — tap any directive for its guidance page."}
            </p>

            {/* Filter bar: الكل / SEC / SAF + instant search */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label={ar ? "تصفية حسب الفئة" : "Filter by category"}
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1"
              >
                {(
                  [
                    ["all", ar ? "الكل" : "All"],
                    ["SEC", "SEC"],
                    ["SAF", "SAF"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    aria-pressed={category === key}
                    className={`min-h-9 cursor-pointer rounded-lg px-3.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.96] ${
                      category === key
                        ? "bg-[#3AE8FF]/15 text-[#BEEBFF] ring-1 ring-[#3AE8FF]/40"
                        : "text-white/60 hover:bg-white/[0.06] hover:text-white/85"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                  aria-hidden
                />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={ar ? "ابحث بالاسم أو الرمز…" : "Search by name or code…"}
                  aria-label={ar ? "بحث في التوجيهات" : "Search directives"}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pe-3 ps-9 text-sm text-white placeholder:text-white/35 focus:border-[#3AE8FF]/40 focus:outline-none focus:ring-2 focus:ring-[#3AE8FF]/30"
                />
              </label>
            </div>

            {visibleDirectives.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/45">
                {ar ? "لا نتائج مطابقة — جرّب بحثًا آخر." : "No matching directives."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-4">
                {visibleDirectives.map((d) => (
                  <DirectiveTile key={d.code} d={d} />
                ))}
              </div>
            )}
          </NexusCard>
        </>
      )}
    </NexusPage>
  );
}

function DirectiveTile({ d }: { d: Directive }) {
  const Icon = DIRECTIVE_ICONS[d.code] ?? ShieldCheck;
  const special = d.code === "SEC-RC" || d.code === "SAF-GEN";
  return (
    <Link
      to="/hcis/directive/$code"
      params={{ code: d.code }}
      className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-start transition hover:border-[#3AE8FF]/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.97] ${
        special
          ? "border-amber-400/25 bg-amber-500/[0.05] hover:border-amber-400/50"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <span className="nx-module-icon grid h-9 w-9 shrink-0 place-items-center rounded-lg">
        <Icon className="nx-icon-soft h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wide text-emerald-300/90">
          {d.code}
        </span>
        <span className="block truncate text-xs font-semibold text-white/90">{d.name_ar}</span>
        <span className="block truncate text-[10px] text-white/45">{d.name_en}</span>
      </span>
    </Link>
  );
}
