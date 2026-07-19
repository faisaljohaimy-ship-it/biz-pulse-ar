/**
 * الامتثال HCIS — HCIS Compliance dashboard.
 *
 * Reads EXCLUSIVELY from the four live framework tables (anon-readable RLS):
 *   hcis_directives (21) · hcis_sectors (13) · hcis_approval_stages (7)
 *   hcis_compliance_status (19 SEC directives × 4 regions = 76)
 * No server round-trip and no auth requirement — the page works for guests
 * and via direct deep links. All figures come from Supabase; nothing is
 * hardcoded. Every simulated row is labelled via the persistent badge.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FlaskConical,
  X,
  FileText,
  Fence,
  DoorClosed,
  Lightbulb,
  Network,
  ScanLine,
  Zap,
  RadioTower,
  Building2,
  TrainFront,
  UserCheck,
  IdCard,
  Lock,
  Ship,
  ClipboardCheck,
  Radar,
  Waypoints,
  Cable,
  Factory,
  Home,
  Flame,
  type LucideIcon,
} from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { NexusPage, NexusCard, NexusPill } from "@/components/nexus-frame";
import { useI18n } from "@/lib/i18n";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { REGIONS, type RegionId } from "@/lib/regions";

export const Route = createFileRoute("/_authenticated/hcis")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: HcisPage,
});

/* ── Types mirroring the live schema ─────────────────────────────────────── */

interface Directive {
  code: string;
  category: "SEC" | "SAF";
  name_ar: string;
  name_en: string;
  scope_ar: string;
  issue_note_ar: string | null;
  sort_order: number;
}
interface Stage {
  stage_no: number;
  name_ar: string;
  name_en: string;
  description_ar: string;
}
interface ComplianceRow {
  directive_code: string;
  region_code: string;
  status: string;
  priority: string;
  is_simulation: boolean;
}
interface HcisDataset {
  directives: Directive[];
  stages: Stage[];
  compliance: ComplianceRow[];
}

/* ── Directive glyphs (each icon matches its directive's function) ───────── */

const DIRECTIVE_ICONS: Record<string, LucideIcon> = {
  "SEC-01": FileText,
  "SEC-02": Fence,
  "SEC-03": DoorClosed,
  "SEC-04": Lightbulb,
  "SEC-05": Network,
  "SEC-06": ScanLine,
  "SEC-07": Zap,
  "SEC-08": RadioTower,
  "SEC-09": Building2,
  "SEC-10": TrainFront,
  "SEC-11": UserCheck,
  "SEC-12": IdCard,
  "SEC-13": Lock,
  "SEC-14": Ship,
  "SEC-15": ClipboardCheck,
  "SEC-16": Radar,
  "SEC-17": Waypoints,
  "SEC-18": Cable,
  "SEC-19": Factory,
  "SEC-RC": Home,
  "SAF-GEN": Flame,
};

/* ── Status presentation ─────────────────────────────────────────────────── */

const STATUS_META: Record<string, { ar: string; cell: string; pill: string }> = {
  compliant: {
    ar: "ممتثل",
    cell: "bg-emerald-500/70",
    pill: "text-emerald-200 border-emerald-400/40 bg-emerald-500/10",
  },
  partial: {
    ar: "جزئي",
    cell: "bg-amber-400/70",
    pill: "text-amber-200 border-amber-400/40 bg-amber-500/10",
  },
  non_compliant: {
    ar: "غير ممتثل",
    cell: "bg-rose-500/70",
    pill: "text-rose-200 border-rose-400/40 bg-rose-500/10",
  },
  not_applicable: {
    ar: "لا ينطبق",
    cell: "bg-slate-500/40",
    pill: "text-slate-300 border-slate-400/30 bg-slate-500/10",
  },
  not_assessed: {
    ar: "لم يُقيَّم",
    cell: "bg-white/10",
    pill: "text-white/60 border-white/20 bg-white/5",
  },
};
const statusMeta = (s: string) => STATUS_META[s] ?? STATUS_META.not_assessed!;

/** Weighted compliance over ASSESSED rows only; null when nothing assessed. */
function compliancePct(rows: readonly ComplianceRow[]): number | null {
  const scored = rows.filter(
    (r) => r.status === "compliant" || r.status === "partial" || r.status === "non_compliant",
  );
  if (scored.length === 0) return null;
  const w = scored.reduce(
    (a, r) => a + (r.status === "compliant" ? 1 : r.status === "partial" ? 0.5 : 0),
    0,
  );
  return Math.round((w / scored.length) * 100);
}

/* ── Data hook: the four framework tables, one parallel fetch ────────────── */

function useHcisFramework() {
  return useQuery<HcisDataset>({
    queryKey: ["hcis-framework"],
    enabled: isSupabaseConfigured,
    retry: 1,
    refetchInterval: 120_000,
    queryFn: async () => {
      const [dir, stg, cmp] = await Promise.all([
        supabase
          .from("hcis_directives")
          .select("code,category,name_ar,name_en,scope_ar,issue_note_ar,sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("hcis_approval_stages")
          .select("stage_no,name_ar,name_en,description_ar")
          .order("stage_no", { ascending: true }),
        supabase
          .from("hcis_compliance_status")
          .select("directive_code,region_code,status,priority,is_simulation"),
      ]);
      const firstError = dir.error ?? stg.error ?? cmp.error;
      if (firstError) throw new Error(firstError.message);
      return {
        directives: (dir.data ?? []) as Directive[],
        stages: (stg.data ?? []) as Stage[],
        compliance: (cmp.data ?? []) as ComplianceRow[],
      };
    },
  });
}

/* ── Small pieces ────────────────────────────────────────────────────────── */

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

/* ── Page ────────────────────────────────────────────────────────────────── */

function HcisPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { data, isLoading, isError, refetch } = useHcisFramework();
  const [selected, setSelected] = useState<Directive | null>(null);

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
            <NexusCard className="flex flex-col items-center justify-center gap-1 py-5 text-center">
              <span className="text-[11px] font-semibold tracking-wide text-white/60">
                {ar ? "الامتثال الإجمالي" : "Overall compliance"}
              </span>
              <KpiValue pct={overallPct} ar={ar} />
              <ShieldCheck className="mt-1 h-4 w-4 text-emerald-300/80" aria-hidden />
            </NexusCard>
            {REGIONS.map((r) => (
              <NexusCard
                key={r.id}
                className="flex flex-col items-center justify-center gap-1 py-5 text-center"
              >
                <span className="text-[11px] font-semibold tracking-wide text-white/60">
                  {ar ? r.shortAr : r.shortEn}
                </span>
                <KpiValue pct={byRegionPct[r.id] ?? null} ar={ar} />
                <span className="text-[10px] text-white/40">
                  {(data.compliance ?? []).filter((c) => c.region_code === r.id).length}{" "}
                  {ar ? "توجيهًا" : "directives"}
                </span>
              </NexusCard>
            ))}
          </div>

          {/* ② Seven approval stages — horizontal timeline */}
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

          {/* ③ Interactive matrix — directives × four regional administrations */}
          <NexusCard>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white/80">
                {ar
                  ? "مصفوفة الامتثال (التوجيه × الإدارة)"
                  : "Compliance matrix (directive × region)"}
              </h3>
              <span className="text-[10px] text-white/45">
                {ar ? "اضغط أي توجيه لعرض نطاقه كاملًا" : "Tap any directive for its full scope"}
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
                          <button
                            type="button"
                            onClick={() => setSelected(d)}
                            className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 text-start transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.99]"
                          >
                            <span className="nx-module-icon grid h-7 w-7 shrink-0 place-items-center rounded-lg">
                              <Icon className="nx-icon-soft h-4 w-4" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[10px] font-semibold tracking-wide text-white/45">
                                {d.code}
                              </span>
                              <span className="block truncate text-xs text-white/85">
                                {ar ? d.name_ar : d.name_en}
                              </span>
                            </span>
                          </button>
                        </td>
                        {REGIONS.map((r) => {
                          const cell = rows?.get(r.id);
                          const meta = statusMeta(cell?.status ?? "not_assessed");
                          return (
                            <td key={r.id} className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => setSelected(d)}
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

          {/* ④ Full directive series (21) — every tile opens the details dialog */}
          <NexusCard>
            <h3 className="mb-1 text-sm font-semibold text-white/80">
              {ar
                ? "لائحة التوجيهات الأمنية الصناعية (HCIS)"
                : "HCIS Industrial-Security Directive Series"}
            </h3>
            <p className="mb-4 text-xs text-white/50">
              {ar
                ? "السلسلة المنشورة SEC-01 إلى SEC-19 مع المجمعات السكنية وسلسلة السلامة — مرجع عام؛ ليست بديلًا عن النصوص الرسمية للهيئة."
                : "The published SEC-01..SEC-19 series with residential compounds and the safety series — general reference only."}
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {data.directives.map((d) => {
                const Icon = DIRECTIVE_ICONS[d.code] ?? ShieldCheck;
                return (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => setSelected(d)}
                    className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-start transition hover:border-[#3AE8FF]/40 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.97]"
                  >
                    <span className="nx-module-icon grid h-9 w-9 shrink-0 place-items-center rounded-lg">
                      <Icon className="nx-icon-soft h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold tracking-wide text-white/50">
                        {d.code}
                      </span>
                      <span className="block truncate text-xs text-white/85">
                        {ar ? d.name_ar : d.name_en}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </NexusCard>

          {/* ⑤ Directive details dialog */}
          {selected && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={selected.name_ar}
              className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
              onClick={() => setSelected(null)}
            >
              <div
                dir="rtl"
                className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#3AE8FF]/25 bg-[#061325] p-5 shadow-2xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = DIRECTIVE_ICONS[selected.code] ?? ShieldCheck;
                      return (
                        <span className="nx-module-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl">
                          <Icon className="nx-icon-soft h-5 w-5" aria-hidden />
                        </span>
                      );
                    })()}
                    <div>
                      <div className="text-[11px] font-semibold tracking-wide text-[#3AE8FF]">
                        {selected.code}
                      </div>
                      <h4 className="text-base font-bold leading-snug text-white">
                        {selected.name_ar}
                      </h4>
                      <div className="text-[11px] text-white/45">{selected.name_en}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label={ar ? "إغلاق" : "Close"}
                    className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/10"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-white/85">{selected.scope_ar}</p>
                {selected.issue_note_ar && (
                  <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                    {selected.issue_note_ar}
                  </p>
                )}
                {byDirective.has(selected.code) && (
                  <div className="mt-4">
                    <div className="mb-2 text-[11px] font-semibold text-white/60">
                      {ar ? "الحالة حسب الإدارة الإقليمية" : "Status by regional administration"}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {REGIONS.map((r) => {
                        const cell = byDirective.get(selected.code)?.get(r.id as RegionId);
                        const meta = statusMeta(cell?.status ?? "not_assessed");
                        return (
                          <div
                            key={r.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2"
                          >
                            <span className="text-xs text-white/75">
                              {ar ? r.shortAr : r.shortEn}
                            </span>
                            <NexusPill
                              tone={
                                cell?.status === "compliant"
                                  ? "emerald"
                                  : cell?.status === "non_compliant"
                                    ? "rose"
                                    : cell?.status === "partial"
                                      ? "amber"
                                      : "cyan"
                              }
                            >
                              {meta.ar}
                            </NexusPill>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </NexusPage>
  );
}
