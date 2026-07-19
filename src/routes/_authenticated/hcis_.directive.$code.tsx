/**
 * /hcis/directive/$code — the guidance page for a single HCIS directive.
 *
 * Public (anon) and deep-link friendly: header (big icon + code + names),
 * the directive's full scope, its issue note, compliance across the four
 * regional administrations (regions.ts is the only geographic reference),
 * the seven-stage approval strip, prev/next navigation by sort_order and
 * a fixed footer pointing to the authority's official portal. Uses the
 * same shared hook/cache as /hcis — no duplicate fetch layer.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { NexusPage, NexusCard, NexusPill } from "@/components/nexus-frame";
import { useI18n } from "@/lib/i18n";
import { REGIONS } from "@/lib/regions";
import { DIRECTIVE_ICONS, PRIORITY_AR, statusMeta, useHcisFramework } from "@/lib/hcis/framework";

export const Route = createFileRoute("/_authenticated/hcis_/directive/$code")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: DirectivePage,
});

function SkeletonBlock({ h }: { h: string }) {
  return (
    <div
      className={`w-full animate-pulse rounded-2xl border border-white/10 bg-white/[0.04] ${h}`}
    />
  );
}

function DirectivePage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { code } = Route.useParams();
  const { data, isLoading } = useHcisFramework();

  const directive = useMemo(
    () => (data?.directives ?? []).find((d) => d.code.toUpperCase() === code.toUpperCase()),
    [data, code],
  );
  const ordered = data?.directives ?? [];
  const idx = directive ? ordered.findIndex((d) => d.code === directive.code) : -1;
  const prev = idx > 0 ? ordered[idx - 1] : undefined;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : undefined;

  const rows = useMemo(
    () => (data?.compliance ?? []).filter((c) => c.directive_code === directive?.code),
    [data, directive],
  );
  const anySimulation = rows.some((r) => r.is_simulation);
  const Icon = directive ? (DIRECTIVE_ICONS[directive.code] ?? ShieldCheck) : ShieldCheck;

  return (
    <NexusPage
      eyebrow="HCIS DIRECTIVE"
      title={directive ? directive.name_ar : ar ? "توجيه HCIS" : "HCIS Directive"}
      subtitle={directive?.name_en ?? ""}
      actions={
        anySimulation ? (
          <span className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200">
            <FlaskConical className="h-4 w-4" aria-hidden />
            {ar ? "بيانات محاكاة" : "Simulation data"}
          </span>
        ) : undefined
      }
    >
      {/* Back to the directive grid */}
      <div>
        <Link
          to="/hcis"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white/80 transition hover:border-[#3AE8FF]/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.97]"
        >
          <ArrowRight className={`h-4 w-4 ${ar ? "" : "rotate-180"}`} aria-hidden />
          {ar ? "عودة إلى اللائحة" : "Back to the series"}
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="space-y-4" aria-label={ar ? "جارٍ التحميل" : "Loading"}>
          <SkeletonBlock h="h-28" />
          <SkeletonBlock h="h-48" />
          <SkeletonBlock h="h-32" />
        </div>
      ) : !directive ? (
        <NexusCard>
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm text-white/60">
              {ar
                ? `لا يوجد توجيه بالرمز «${code}» في اللائحة المنشورة.`
                : `No directive with code “${code}” in the published series.`}
            </p>
            <Link
              to="/hcis"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-6 text-sm font-semibold text-[#BEEBFF] transition hover:bg-[#3AE8FF]/20 active:scale-[0.97]"
            >
              {ar ? "تصفّح اللائحة الكاملة" : "Browse the full series"}
            </Link>
          </div>
        </NexusCard>
      ) : (
        <>
          {/* ① Header card — big icon + code + names */}
          <NexusCard>
            <div className="flex flex-wrap items-center gap-4">
              <span className="nx-module-icon grid h-16 w-16 shrink-0 place-items-center rounded-2xl">
                <Icon className="nx-icon-soft h-8 w-8" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold tracking-wide text-emerald-300">
                    {directive.code}
                  </span>
                  <NexusPill tone={directive.category === "SEC" ? "cyan" : "amber"}>
                    {directive.category === "SEC"
                      ? ar
                        ? "توجيه أمني"
                        : "Security directive"
                      : ar
                        ? "توجيه سلامة"
                        : "Safety directive"}
                  </NexusPill>
                </div>
                <h2 className="mt-1 text-lg font-bold leading-snug text-white sm:text-xl">
                  {directive.name_ar}
                </h2>
                <div className="text-sm text-white/50">{directive.name_en}</div>
              </div>
            </div>
          </NexusCard>

          {/* ② Scope */}
          <NexusCard>
            <h3 className="mb-2 text-sm font-semibold text-white/80">
              {ar ? "نطاق التوجيه" : "Directive scope"}
            </h3>
            <p className="text-sm leading-relaxed text-white/85 sm:text-[15px] sm:leading-7">
              {directive.scope_ar}
            </p>
          </NexusCard>

          {/* ③ Issue note (when present) */}
          {directive.issue_note_ar && (
            <NexusCard className="border-amber-400/25">
              <h3 className="mb-2 text-sm font-semibold text-amber-200">
                {ar ? "ملاحظة الإصدار" : "Issue note"}
              </h3>
              <p className="text-sm leading-relaxed text-amber-100/90">{directive.issue_note_ar}</p>
            </NexusCard>
          )}

          {/* ④ Compliance across the four regional administrations */}
          <NexusCard>
            <h3 className="mb-3 text-sm font-semibold text-white/80">
              {ar ? "حالة الامتثال عبر الإدارات" : "Compliance across administrations"}
            </h3>
            {rows.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/45">
                {ar
                  ? "لا سجلات امتثال لهذا التوجيه بعد."
                  : "No compliance records for this directive yet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {REGIONS.map((r) => {
                  const cell = rows.find((c) => c.region_code === r.id);
                  const meta = statusMeta(cell?.status);
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white/80">
                          {ar ? r.shortAr : r.shortEn}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.pill}`}
                        >
                          {ar ? meta.ar : meta.en}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/50">
                        {ar ? "الأولوية:" : "Priority:"}{" "}
                        <span
                          className={
                            cell?.priority === "critical" ? "text-rose-300" : "text-white/70"
                          }
                        >
                          {cell
                            ? ar
                              ? (PRIORITY_AR[cell.priority] ?? cell.priority)
                              : cell.priority
                            : ar
                              ? "—"
                              : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </NexusCard>

          {/* ⑤ Position in the approval lifecycle — compact 7-stage strip */}
          {data.stages.length > 0 && (
            <NexusCard>
              <h3 className="mb-3 text-sm font-semibold text-white/80">
                {ar ? "موقع التوجيه في دورة الاعتماد" : "Where this sits in the approval cycle"}
              </h3>
              <ol
                className="flex snap-x gap-0 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "thin" }}
              >
                {data.stages.map((s, i) => (
                  <li key={s.stage_no} className="flex min-w-[120px] snap-start items-start">
                    <div className="flex w-[112px] flex-col items-center gap-1 text-center">
                      <span className="grid h-8 w-8 place-items-center rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 text-xs font-bold text-[#3AE8FF]">
                        {s.stage_no}
                      </span>
                      <span className="text-[11px] font-semibold leading-tight text-white/80">
                        {ar ? s.name_ar : s.name_en}
                      </span>
                    </div>
                    {i < data.stages.length - 1 && (
                      <span aria-hidden className="mt-4 h-px w-2 shrink-0 bg-[#3AE8FF]/30 sm:w-4" />
                    )}
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                {ar
                  ? "كل مشروع أمني خاضع لهذا التوجيه يمر بدورة الاعتماد السبع لدى الهيئة — من تصنيف المنشأة وتقييم SVA حتى اختبارات القبول FAT/SAT."
                  : "Every security project governed by this directive passes the authority's seven approval stages — from classification and SVA to FAT/SAT."}
              </p>
            </NexusCard>
          )}

          {/* ⑥ Prev / next navigation (RTL-correct arrows) + back */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {prev ? (
              <Link
                to="/hcis/directive/$code"
                params={{ code: prev.code }}
                className="inline-flex min-h-11 max-w-[48%] items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm text-white/80 transition hover:border-[#3AE8FF]/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.97]"
              >
                {ar ? (
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                )}
                <span className="truncate">
                  <span className="text-emerald-300/90">{prev.code}</span>{" "}
                  <span className="hidden sm:inline">· {prev.name_ar}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                to="/hcis/directive/$code"
                params={{ code: next.code }}
                className="inline-flex min-h-11 max-w-[48%] items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm text-white/80 transition hover:border-[#3AE8FF]/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 active:scale-[0.97]"
              >
                <span className="truncate">
                  <span className="text-emerald-300/90">{next.code}</span>{" "}
                  <span className="hidden sm:inline">· {next.name_ar}</span>
                </span>
                {ar ? (
                  <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                )}
              </Link>
            ) : (
              <span />
            )}
          </div>

          {/* ⑦ Fixed guidance footer — the official source */}
          <NexusCard className="border-white/10">
            <p className="text-center text-[12px] leading-relaxed text-white/55">
              {ar
                ? "النص الرسمي الكامل لهذا التوجيه يُستمد حصريًا من الهيئة العليا للأمن الصناعي — "
                : "The full official text of this directive comes exclusively from the High Commission for Industrial Security — "}
              <a
                href="https://hcis.gov.sa"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#3AE8FF] underline-offset-4 hover:underline"
              >
                hcis.gov.sa
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </p>
          </NexusCard>
        </>
      )}
    </NexusPage>
  );
}
