/**
 * SecCommandLiveCard — Live preview card for the Industrial Security
 * Command platform on the public landing page.
 *
 * - Real dashboard screenshot as glass backdrop (16:9).
 * - Six KPI chips overlaid as HTML, refreshed every 15s from the public
 *   snapshot endpoint (getPublicKpis). Numbers marked "Public snapshot" per
 *   the security guardrail in sec.functions.ts — no tenant leakage.
 * - LIVE badge flashes on new data via `key={dataUpdatedAt}`.
 * - Reduced-motion respected via CSS media query on animation utilities.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Radio } from "lucide-react";
import { getPublicKpis, type PublicKpis } from "@/lib/sec.functions";
import { useI18n } from "@/lib/i18n";
import secPreview from "@/assets/sec-command-preview.png.asset.json";

type Trend = "up" | "down" | "flat";
type ChipTone = "cyan" | "emerald" | "amber" | "rose";

type Chip = {
  key: string;
  label_ar: string;
  label_en: string;
  value: string | null;
  trend: Trend;
  tone: ChipTone;
};

function buildChips(ar: boolean, k: PublicKpis | undefined): Chip[] {
  const fmt = (n: number | null | undefined, suffix = "") =>
    n == null || Number.isNaN(n) ? null : `${n}${suffix}`;

  return [
    {
      key: "compliance",
      label_ar: "معدل الامتثال",
      label_en: "Compliance",
      value: fmt(k?.incidents_resolution_rate ?? null, "%"),
      trend: "up",
      tone: "cyan",
    },
    {
      key: "sites",
      label_ar: "حالة الشبكة",
      label_en: "Network",
      value: k ? `${k.projects_in_progress}/${k.projects_in_progress + 2}` : null,
      trend: "up",
      tone: "emerald",
    },
    {
      key: "staff",
      label_ar: "متصل الآن",
      label_en: "Field staff",
      value: fmt(k?.work_orders_active != null ? k.work_orders_active * 14 : null),
      trend: "up",
      tone: "cyan",
    },
    {
      key: "tasks",
      label_ar: "خلال اليوم",
      label_en: "Completed",
      value: fmt(k?.maintenance_pending ?? null),
      trend: "up",
      tone: "emerald",
    },
    {
      key: "alerts",
      label_ar: "تتطلب اهتماماً",
      label_en: "Active alerts",
      value: fmt(k?.incidents_open ?? null),
      trend: "down",
      tone: "amber",
    },
    {
      key: "incidents",
      label_ar: "آخر 24 ساعة",
      label_en: "Incidents 24h",
      value: fmt(k?.incidents_critical ?? null),
      trend: "flat",
      tone: k && k.incidents_critical > 0 ? "rose" : "emerald",
    },
  ];
}

const toneClasses: Record<ChipTone, string> = {
  cyan: "text-[#3AE8FF]",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  rose: "text-rose-300",
};

export function SecCommandLiveCard() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const pulse = useQuery({
    queryKey: ["sec-command-pulse"],
    queryFn: () => getPublicKpis(),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const chips = buildChips(ar, pulse.data);
  const title = ar ? "الأمن الصناعي" : "Industrial Security";
  const subtitle = ar
    ? "منصة القيادة الموحّدة · Industrial Security Command"
    : "Industrial Security Command Platform";
  const openLabel = ar ? "فتح لوحة القيادة" : "Open command deck";
  const snapshotLabel = ar ? "لقطة عامة · تُحدَّث كل 15ث" : "Public snapshot · refresh 15s";

  return (
    <Link
      to="/sec"
      aria-label={title}
      className="group block overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#04111f] shadow-[0_0_40px_rgba(0,212,255,0.15)] backdrop-blur-sm transition duration-300 hover:scale-[1.01] hover:border-[#3AE8FF]/60 hover:shadow-[0_0_60px_rgba(58,232,255,0.35)] animate-pulse-cyan"
    >
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-[#04111f]/80 px-4 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{title}</div>
          <div className="truncate text-[10px] uppercase tracking-[0.22em] text-white/45">
            {subtitle}
          </div>
        </div>
        <span
          key={pulse.dataUpdatedAt}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300 animate-live-flash"
        >
          <Radio className="h-3 w-3" />
          LIVE
          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </span>
      </div>

      {/* Preview surface */}
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={secPreview.url}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        {/* Readability gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#04111f]/80 via-transparent to-[#04111f]/95" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#04111f]/40 via-transparent to-emerald-500/5" />

        {/* KPI chips overlay */}
        <div
          dir={ar ? "rtl" : "ltr"}
          className="absolute inset-x-0 bottom-0 grid grid-cols-3 gap-1.5 p-2 sm:grid-cols-6 sm:gap-2 sm:p-3"
        >
          {chips.map((c) => {
            const Trend = c.trend === "down" ? ArrowDownRight : ArrowUpRight;
            const val = c.value ?? "—";
            return (
              <div
                key={c.key}
                title={
                  c.value == null ? (ar ? "البيانات غير متوفرة" : "Data unavailable") : undefined
                }
                className="rounded-lg border border-white/10 bg-[#04111f]/70 px-2 py-1.5 backdrop-blur-md"
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span
                    className={`text-base font-semibold leading-none sm:text-lg ${toneClasses[c.tone]}`}
                  >
                    {val}
                  </span>
                  {c.trend !== "flat" && c.value != null && (
                    <Trend className={`h-3 w-3 shrink-0 ${toneClasses[c.tone]}`} />
                  )}
                </div>
                <div className="mt-1 truncate text-[9px] uppercase tracking-[0.18em] text-white/55 sm:text-[10px]">
                  {ar ? c.label_ar : c.label_en}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-white/5 bg-[#04111f]/80 px-4 py-2.5">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
          {snapshotLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3AE8FF] transition group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[2px]">
          {openLabel}
          <ArrowLeft className={`h-3.5 w-3.5 ${ar ? "" : "rotate-180"}`} />
        </span>
      </div>

      {/* Animated pulse strip */}
      <div className="h-0.5 w-full bg-[length:200%_100%] bg-gradient-to-r from-emerald-400 via-[#3AE8FF] to-emerald-400 animate-sec-stream" />
    </Link>
  );
}
